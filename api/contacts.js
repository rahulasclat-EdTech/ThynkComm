// api/contacts.js
// GET  /api/contacts        → fetch all contacts
// POST /api/contacts        → add a contact

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — fetch all contacts
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST — add a contact
  if (req.method === "POST") {
    const { name, phone, email, tag } = req.body;
    if (!name || !phone)
      return res.status(400).json({ error: "name and phone are required" });

    const { data, error } = await supabase
      .from("contacts")
      .insert([{ name, phone, email, tag: tag || "Lead", opt_in: true }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, contact: data });
  }

  res.status(405).json({ error: "Method not allowed" });
}
