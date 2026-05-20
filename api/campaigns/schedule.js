// api/campaigns/schedule.js
// Handles POST /api/campaigns/schedule — saves a campaign to scheduled_campaigns table
// cron-send.js picks it up and fires it at the scheduled time.

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    name,
    contacts,
    message,
    template_name,
    language_code,
    template_params,
    scheduled_at,
  } = req.body || {};

  if (!name)             return res.status(400).json({ error: "name is required" });
  if (!contacts?.length) return res.status(400).json({ error: "contacts are required" });
  if (!message && !template_name)
    return res.status(400).json({ error: "message or template_name is required" });
  if (!scheduled_at)     return res.status(400).json({ error: "scheduled_at is required" });

  const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
  const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
  if (!token || !phoneId)
    return res.status(400).json({ error: "WhatsApp credentials missing." });

  const { data, error } = await supabase
    .from("scheduled_campaigns")
    .insert([{
      name,
      contacts: JSON.stringify(contacts),
      message:         message || null,
      template_name:   template_name || null,
      language_code:   language_code || "en_US",
      template_params: template_params ? JSON.stringify(template_params) : null,
      scheduled_at,
      status:          "pending",
      wa_token:        token,
      phone_number_id: phoneId,
      total:           contacts.length,
    }])
    .select()
    .single();

  if (error) {
    console.error("[campaigns/schedule] Insert error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  console.log(`[campaigns/schedule] Scheduled campaign "${name}" id=${data.id} at ${scheduled_at}`);
  return res.status(200).json({ success: true, scheduledId: data.id, scheduled_at });
};
