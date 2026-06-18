// api/templates.js
// GET  /api/templates          → fetch approved WA templates from Meta
// POST /api/templates          → submit new WA template to Meta for approval
//
// Previously split into templates.js + submit-template.js.
// Merged into one function to stay within Vercel Hobby plan 12-function limit.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token  = (req.headers["x-wa-token"]   || process.env.WHATSAPP_TOKEN || "").trim();
  const wabaId = (req.headers["x-wa-waba-id"] || process.env.WABA_ID        || "").trim();

  if (!token || !wabaId) {
    return res.status(400).json({ error: "WhatsApp credentials missing. Add Token and WABA ID in the WhatsApp Account page." });
  }

  // ── GET: fetch approved templates ────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const url = `https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=250&fields=name,language,category,status,components`;
      const r   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await r.json();

      if (!r.ok) return res.status(400).json({ error: data.error?.message || "Failed to fetch templates from Meta" });

      const templates = (data.data || []).map(t => {
        const bodyComponent = (t.components || []).find(c => c.type === "BODY");
        const preview       = bodyComponent?.text || "";
        const varMatches    = preview.match(/\{\{\d+\}\}/g) || [];
        const variableCount = new Set(varMatches).size;
        return { name: t.name, language: t.language, category: t.category, status: t.status, preview, variableCount, hasVariables: variableCount > 0, isLocal: false };
      });

      return res.status(200).json(templates.filter(t => t.status === "APPROVED"));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: submit new template to Meta ────────────────────────────────────
  if (req.method === "POST") {
    const payload = req.body;
    if (!payload || !payload.name) return res.status(400).json({ error: "Invalid template payload." });

    try {
      const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;
      const r   = await fetch(url, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await r.json();

      if (!r.ok) return res.status(400).json({ error: data?.error?.message || "Submission failed", code: data?.error?.code, subcode: data?.error?.error_subcode, type: data?.error?.type, metaError: data?.error });

      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
