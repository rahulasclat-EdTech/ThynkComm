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
    return res.status(400).json({ error: "WhatsApp credentials missing. Add them in the WhatsApp Account page." });

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
    if (!response.ok) return res.status(400).json({ error: data });
    res.status(200).json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
