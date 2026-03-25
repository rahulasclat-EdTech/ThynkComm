// api/live-chat.js
// GET  /api/live-chat          → fetch all conversations (grouped by phone)
// POST /api/live-chat          → admin sends a reply to a user
// GET  /api/live-chat?phone=X  → fetch messages for one conversation

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET ─────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { phone } = req.query;

    // Single conversation thread
    if (phone) {
      // BUG FIX 1: The original query used `.or()` with a plain string which
      // requires PostgREST filter syntax.  The correct form is:
      //   from_number.eq.PHONE,to_number.eq.PHONE
      // but Supabase JS v2 wraps each side in its own filter object.
      // Using two chained .or() calls is the safest approach.
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    // All conversations — latest message per unique phone
    // BUG FIX 2: We now also pull from_number for inbound messages so they
    // appear in the conversation list even before any outbound reply.
    const { data, error } = await supabase
      .from("messages")
      .select("id, from_number, to_number, body, direction, status, created_at, contact_name")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return res.status(500).json({ error: error.message });

    const convMap = {};
    for (const msg of data || []) {
      // For inbound messages the user's number is in from_number.
      // For outbound messages the user's number is in to_number.
      const userPhone =
        msg.direction === "inbound" ? msg.from_number : msg.to_number;
      if (!userPhone) continue;

      if (!convMap[userPhone]) {
        convMap[userPhone] = {
          phone:       userPhone,
          contactName: msg.contact_name || null,
          lastMsg:     msg.body,
          lastTime:    msg.created_at,
          direction:   msg.direction,
          unread:      0,
          totalMsgs:   0,
        };
      }
      convMap[userPhone].totalMsgs++;

      // Count unread = inbound messages with status "received"
      if (msg.direction === "inbound" && msg.status === "received") {
        convMap[userPhone].unread++;
      }
    }

    const conversations = Object.values(convMap).sort(
      (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
    );

    return res.status(200).json(conversations);
  }

  // ── POST — admin sends reply ──────────────────────────────────
  if (req.method === "POST") {
    const { to, message, templateName, languageCode, replyType } = req.body;
    if (!to) return res.status(400).json({ error: "to (phone number) is required" });

    let payload;
    if (replyType === "template" && templateName) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: languageCode || "en_US" } },
      };
    } else {
      if (!message) return res.status(400).json({ error: "message is required" });
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      };
    }

    try {
      const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
      const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;

      if (!token || !phoneId)
        return res.status(400).json({
          error: "WhatsApp credentials missing. Add WHATSAPP_TOKEN and PHONE_NUMBER_ID to your environment variables.",
        });

      const r = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json();

      if (!r.ok) {
        // Surface token-expiry and permission errors clearly
        if (data?.error?.code === 190) {
          return res.status(401).json({
            error: "WhatsApp token expired. Generate a new permanent System User token.",
          });
        }
        return res.status(400).json({ error: data.error?.message || "Send failed" });
      }

      // Log the outbound reply so it shows in the chat thread
      await supabase.from("messages").insert([{
        to_number:     to,
        body:          message || `[template: ${templateName}]`,
        status:        "sent",
        direction:     "outbound",
        wa_message_id: data.messages?.[0]?.id,
      }]);

      return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
