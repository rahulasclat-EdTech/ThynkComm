// api/send-message.js
// POST /api/send-message  → send a plain text WhatsApp message
// Used by "Send Single Message" (text mode) in the frontend.
// For template sends the frontend calls /api/live-chat instead.

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, message } = req.body;
  if (!to || !message)
    return res.status(400).json({ error: "to and message are required" });

  // Prefer credentials sent by the frontend, fall back to env vars
  const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
  const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;

  if (!token || !phoneId)
    return res.status(400).json({
      error: "WhatsApp credentials missing. Add them in the WhatsApp Account page.",
    });

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // Return a clean error string so the frontend can display it
      return res.status(400).json({
        error: data.error?.message || data.error?.error_data?.details || JSON.stringify(data),
      });
    }

    const messageId = data.messages?.[0]?.id;

    // Log outbound message to Supabase so it appears in Live Chat history
    await supabase.from("messages").insert([{
      to_number:     to,
      body:          message,
      status:        "sent",
      direction:     "outbound",
      wa_message_id: messageId || null,
    }]);

    res.status(200).json({ success: true, messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
