// api/chatbot-flows.js
// GET  → fetch all flows
// POST → save all flows

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  if (req.method === "GET") {
    const { data, error } = await supabase.from("chatbot_flows").select("*").order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === "POST") {
    const { flows } = req.body;
    if (!Array.isArray(flows)) return res.status(400).json({ error: "flows array required" });

    await supabase.from("chatbot_flows").delete().neq("id", 0);
    if (flows.length > 0) {
      const { error } = await supabase.from("chatbot_flows").insert(
        flows.map(f => ({
          name:     f.name,
          triggers: f.triggers,
          active:   f.active,
          steps:    f.steps,
        }))
      );
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: "Method not allowed" });
};
