// api/auto-responder.js
// GET  → fetch all rules
// POST → save all rules

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // We store rules in Vercel KV or just return env-based config.
  // For simplicity: rules are passed from frontend via POST and stored
  // in a lightweight JSON. Since Vercel is stateless, we use Supabase.
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  if (req.method === "GET") {
    const { data, error } = await supabase.from("auto_responder_rules").select("*").order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === "POST") {
    const { rules } = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: "rules array required" });

    // Delete all and re-insert (simple upsert strategy)
    await supabase.from("auto_responder_rules").delete().neq("id", 0);
    if (rules.length > 0) {
      const { error } = await supabase.from("auto_responder_rules").insert(
        rules.map(r => ({
          keyword: r.keyword,
          match_type: r.matchType,
          response_type: r.responseType || "text",
          response_text: r.response || null,
          template_name: r.templateName || null,
          language_code: r.languageCode || "en_US",
          active: r.active,
        }))
      );
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
};
