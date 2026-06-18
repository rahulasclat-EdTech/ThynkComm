// api/messages.js
// GET /api/messages
//
// Returns all rows from the `messages` table in Supabase,
// ordered by most-recent first.  The MessageLog component in
// App.jsx calls this endpoint; it did not exist, causing the
// "Could not load message log" error.

const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate env vars early so the error message is clear
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "SUPABASE_URL or SUPABASE_ANON_KEY environment variable is missing.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Optional query params for simple filtering
    const { status, direction, limit = 500 } = req.query;

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (status)    query = query.eq("status",    status);
    if (direction) query = query.eq("direction", direction);

    const { data, error } = await query;

    if (error) {
      console.error("[api/messages] Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("[api/messages] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
