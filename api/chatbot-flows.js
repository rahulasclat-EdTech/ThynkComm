// api/chatbot-flows.js
// GET  → fetch all chatbot flows from Supabase
// POST → replace all chatbot flows in Supabase

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // ── GET — return all flows ────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("chatbot_flows")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // ── POST — save / overwrite all flows ─────────────────────────
  if (req.method === "POST") {
    const { flows } = req.body;
    if (!Array.isArray(flows))
      return res.status(400).json({ error: "flows array required" });

    // Delete ALL existing rows first
    const { error: delErr } = await supabase
      .from("chatbot_flows")
      .delete()
      .neq("id", 0); // matches every row

    if (delErr) return res.status(500).json({ error: delErr.message });

    if (flows.length > 0) {
      const rows = flows.map(f => ({
        id:       f.id,
        name:     f.name,
        triggers: f.triggers,
        active:   f.active,
        // Preserve the full step structure including templateName and languageCode
        // so the webhook can send the correct template for "template" step types.
        steps: Array.isArray(f.steps)
          ? f.steps.map(step => ({
              type:         step.type,
              content:      step.content      || "",
              templateName: step.templateName || "",
              languageCode: step.languageCode || "en_US",
            }))
          : [],
      }));

      const { error: insErr } = await supabase
        .from("chatbot_flows")
        .insert(rows);

      if (insErr) return res.status(500).json({ error: insErr.message });
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
};
