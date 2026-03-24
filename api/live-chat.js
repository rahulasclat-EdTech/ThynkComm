// api/live-chat.js
// GET  /api/live-chat          → fetch all conversations (grouped by phone)
// POST /api/live-chat          → admin sends a reply to a user
// GET  /api/live-chat?phone=X  → fetch messages for one conversation

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — fetch conversations or single thread
  if (req.method === "GET") {
    const { phone } = req.query;

    if (phone) {
      // Single conversation thread
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    // All conversations — get latest message per unique phone
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

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
        };
      }
      convMap[userPhone].totalMsgs++;
      if (msg.direction === "inbound" && msg.status === "received") {
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
      const r = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await r.json();
      if (!r.ok) return res.status(400).json({ error: data.error?.message || "Send failed" });

      // Log the reply
      await supabase.from("messages").insert([{
        to_number:    to,
        body:         message || `[template: ${templateName}]`,
        status:       "sent",
        direction:    "outbound",
        wa_message_id: data.messages?.[0]?.id,
      }]);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
};
