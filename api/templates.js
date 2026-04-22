// api/templates.js
// GET /api/templates
// Fetches all approved WhatsApp message templates from Meta Graph API
// and returns them shaped for the frontend dropdowns.
//
// Expected response shape per template:
//   { name, language, category, status, preview }

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Credentials: prefer headers sent by frontend, fall back to env vars
  const token  = req.headers["x-wa-token"]   || process.env.WHATSAPP_TOKEN;
  const wabaId = req.headers["x-wa-waba-id"] || process.env.WABA_ID;

  if (!token || !wabaId) {
    return res.status(400).json({
      error: "WhatsApp credentials missing. Add Token and WABA ID in the WhatsApp Account page.",
    });
  }

  try {
    // Fetch up to 250 templates from Meta — paginate if needed
    const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=250&fields=name,language,category,status,components`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(400).json({
        error: data.error?.message || "Failed to fetch templates from Meta",
      });
    }

    // Shape each template for the frontend
    const templates = (data.data || []).map(t => {
      // Build a preview string from the BODY component if present
      const bodyComponent = (t.components || []).find(c => c.type === "BODY");
      const preview = bodyComponent?.text || "";

      return {
        name:     t.name,
        language: t.language,
        category: t.category,   // MARKETING | UTILITY | AUTHENTICATION
        status:   t.status,     // APPROVED | PENDING | REJECTED
        preview,
        isLocal:  false,        // these are Meta templates
      };
    });

    // Only return APPROVED templates so users can't accidentally select rejected ones
    const approved = templates.filter(t => t.status === "APPROVED");

    return res.status(200).json(approved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
