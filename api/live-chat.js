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

  // GET — fetch conversations or single thread
  if (req.method === "GET") {
    const { phone } = req.query;

    if (phone) {
      // FIX #1: Single conversation thread
      // The original .or() query string was missing proper PostgREST syntax for
      // filtering on two different columns. Use the correct filter format.
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) return res.status(500).json({ error: error.message });

      // FIX #1b: Normalise messages so the frontend always gets direction field.
      // Some rows inserted by the webhook may not have direction set explicitly.
      const normalised = (data || []).map(msg => ({
        ...msg,
        direction: msg.direction || (msg.from_number === phone ? "inbound" : "outbound"),
      }));

      return res.status(200).json(normalised);
    }

    // All conversations — get latest message per unique phone
    // FIX #1c: Fetch a larger window so all recent inbound messages are captured.
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) return res.status(500).json({ error: error.message });

    // Group by unique phone number (either from_number for inbound or to_number for outbound)
    const convMap = {};
    for (const msg of data || []) {
      // Determine the user's phone
      const userPhone = msg.direction === "inbound" ? msg.from_number : msg.to_number;
      if (!userPhone) continue;
      if (!convMap[userPhone]) {
        convMap[userPhone] = {
          phone:      userPhone,
          lastMsg:    msg.body,
          lastTime:   msg.created_at,
          direction:  msg.direction,
          unread:     0,
          totalMsgs:  0,
          contact_name: msg.contact_name || null,
        };
      }
      convMap[userPhone].totalMsgs++;
      // Count unread: inbound messages that are not yet "read"
      if (msg.direction === "inbound" && msg.status !== "read") {
        convMap[userPhone].unread++;
      }
    }

    const conversations = Object.values(convMap).sort(
      (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
    );

    return res.status(200).json(conversations);
  }

  // POST — admin sends reply
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
        return res.status(400).json({ error: "WhatsApp credentials missing. Add them in the WhatsApp Account page." });

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
      if (!r.ok) return res.status(400).json({ error: data.error?.message || "Send failed" });

      // Log the outbound reply
      await supabase.from("messages").insert([{
        to_number:     to,
        body:          message || `[template: ${templateName}]`,
        status:        "sent",
        direction:     "outbound",
        wa_message_id: data.messages?.[0]?.id,
      }]);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
