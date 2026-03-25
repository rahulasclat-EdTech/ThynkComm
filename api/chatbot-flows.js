// api/chatbot-flows.js
// GET  → fetch all flows from Supabase
// POST → upsert all flows to Supabase

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
      .neq("id", 0);           // neq("id", 0) matches every row

    if (delErr) return res.status(500).json({ error: delErr.message });

    // BUG FIX: The original code inserted only name/triggers/active/steps.
    // It was missing the `id` field, so every save created NEW rows with
    // fresh auto-generated IDs. When the webhook looked up a flow by
    // session.flow_id it found the OLD id (now deleted), so step content
    // was never returned — only the first auto-generated default message.
    //
    // Solution: preserve the numeric id from the frontend so the webhook's
    // chatbot_sessions.flow_id always matches a real row.
    if (flows.length > 0) {
      const rows = flows.map(f => ({
        // Keep the id the frontend knows about (could be Date.now() integer)
        // Supabase will INSERT with this id instead of generating a new one.
        id:       f.id,
        name:     f.name,
        triggers: f.triggers,
        active:   f.active,
        // steps MUST be stored as JSONB — pass the full array as-is.
        // The original code passed f.steps directly which is correct, but
        // we make it explicit here.
        steps:    Array.isArray(f.steps) ? f.steps : [],
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
