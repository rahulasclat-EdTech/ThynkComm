// api/rcs-templates.js
// GET    /api/rcs-templates             → list all RCS templates from Supabase
// POST   /api/rcs-templates             → create / save new template locally
// DELETE /api/rcs-templates?id=<uuid>   → delete a template
//
// RCS templates differ from WhatsApp:
//   - They are NOT managed via a Meta-style template API
//   - Google approves templates via the Business Communications Developer Console
//   - Locally we store template definitions; Google approval status is synced manually
//   - Template types: TEXT, RICH_CARD, CAROUSEL

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET: list templates ───────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("rcs_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ templates: data || [] });
  }

  // ── POST: create template ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const {
      name,           // unique template name / slug
      type,           // "TEXT" | "RICH_CARD" | "CAROUSEL"
      language,       // "en" | "hi" etc.
      body_text,      // text body (TEXT type)
      // Rich card fields
      card_title,
      card_description,
      card_image_url,
      card_buttons,   // [{text, url?, phone?, postbackData}]
      // Quick replies
      suggestions,    // [{type:"reply"|"action", text, url?, postbackData}]
      // Status
      status,         // "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
    } = req.body || {};

    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required." });
    }

    const validTypes = ["TEXT", "RICH_CARD", "CAROUSEL"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    }

    // Build template definition object
    const definition = {
      type,
      language:     language || "en",
      ...(type === "TEXT" ? { body_text } : {}),
      ...(type === "RICH_CARD"
        ? {
            card_title,
            card_description,
            card_image_url: card_image_url || null,
            card_buttons:   card_buttons   || [],
          }
        : {}),
      suggestions: suggestions || [],
    };

    const { data, error } = await supabase
      .from("rcs_templates")
      .insert([{
        name,
        type,
        language:   language || "en",
        definition,
        status:     status || "DRAFT",
      }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505")
        return res.status(409).json({ error: `Template name "${name}" already exists.` });
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, template: data });
  }

  // ── DELETE: remove template ───────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Provide template id as query param." });

    const { error } = await supabase
      .from("rcs_templates")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
