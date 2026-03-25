// api/templates.js
// GET /api/templates — fetch all approved WhatsApp templates from Meta

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Prefer credentials sent by the frontend, fall back to env vars
  const wabaId = req.headers["x-wa-waba-id"] || process.env.WABA_ID;
  const token  = req.headers["x-wa-token"]   || process.env.WHATSAPP_TOKEN;

  if (!wabaId || !token) {
    return res.status(400).json({ error: "WhatsApp credentials missing. Add them in the WhatsApp Account page." });
  }

  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100&access_token=${token}`
    );
    const data = await r.json();

    if (!r.ok || data.error) {
      return res.status(400).json({ error: data.error?.message || "Failed to fetch templates" });
    }

    // Filter to only APPROVED templates and shape the data
    const approved = (data.data || [])
      .filter(t => t.status === "APPROVED")
      .map(t => ({
        name:     t.name,
        language: t.language,
        category: t.category,
        // Pull preview text from first TEXT component body
        preview:  t.components?.find(c => c.type === "BODY")?.text || "",
      }));

    return res.status(200).json(approved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
