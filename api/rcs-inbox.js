// api/rcs-inbox.js
// GET /api/rcs-inbox?direction=inbound|outbound&limit=100
//
// Returns recent RCS messages from the rcs_messages table.
// Used by the RCS Inbox page in the dashboard.

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { direction, limit = 200, campaign_id } = req.query;

  let query = supabase
    .from("rcs_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Number(limit));

  if (direction) query = query.eq("direction", direction);
  if (campaign_id) query = query.eq("campaign_id", campaign_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ messages: data || [] });
};
