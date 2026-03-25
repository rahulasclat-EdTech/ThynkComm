// api/campaigns.js
// GET  /api/campaigns  → list all campaigns
// POST /api/campaigns  → create & send (now) OR schedule a campaign

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Shared send logic ─────────────────────────────────────────────────────
// Used by both immediate sends here and by the cron job for scheduled sends.
async function sendCampaign(campaign, contacts, creds = {}) {
  const token   = creds.token   || process.env.WHATSAPP_TOKEN;
  const phoneId = creds.phoneId || process.env.PHONE_NUMBER_ID;
  let sent = 0, failed = 0;

  for (const contact of contacts) {
    try {
      const payload = campaign.template_name
        ? {
            messaging_product: "whatsapp",
            to:   contact.phone,
            type: "template",
            template: {
              name:     campaign.template_name,
              language: { code: campaign.language_code || "en_US" },
            },
          }
        : {
            messaging_product: "whatsapp",
            to:   contact.phone,
            type: "text",
            text: { body: campaign.message },
          };

      const r = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const rData = await r.json();

      // Log every message to Supabase — used by Live Chat and Campaign Summary CSV
      await supabase.from("messages").insert([{
        to_number:     contact.phone,
        contact_name:  contact.name  || null,
        body:          campaign.message || campaign.template_name,
        status:        r.ok ? "sent" : "failed",
        direction:     "outbound",
        wa_message_id: rData.messages?.[0]?.id || null,
        campaign_id:   campaign.id   || null,   // link message → campaign for CSV export
      }]);

      r.ok ? sent++ : failed++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

// ── Route handler ─────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET — return all campaigns ────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ── POST — create campaign ────────────────────────────────────
  if (req.method === "POST") {
    const {
      name, contactIds, message, templateName, languageCode,
      scheduleType, scheduledAt, timezone,
    } = req.body;

    if (!name || !contactIds?.length)
      return res.status(400).json({ error: "name and contactIds are required" });

    // Fetch opted-in contacts only
    const { data: contacts, error: cErr } = await supabase
      .from("contacts")
      .select("*")
      .in("id", contactIds)
      .eq("opt_in", true);

    if (cErr) return res.status(500).json({ error: cErr.message });
    if (!contacts.length)
      return res.status(400).json({ error: "No opted-in contacts found" });

    // ── SCHEDULED ──
    if (scheduleType === "scheduled") {
      if (!scheduledAt)
        return res.status(400).json({ error: "scheduledAt is required for scheduled campaigns" });

      const { data: scheduled, error: schErr } = await supabase
        .from("scheduled_campaigns")
        .insert([{
          name,
          contact_ids:   contactIds,
          message:       message      || null,
          template_name: templateName || null,
          language_code: languageCode || "en_US",
          scheduled_at:  new Date(scheduledAt).toISOString(),
          timezone:      timezone || "Asia/Kolkata",
          status:        "pending",
        }])
        .select()
        .single();

      if (schErr) return res.status(500).json({ error: schErr.message });

      return res.status(200).json({
        success:     true,
        scheduled:   true,
        scheduledAt: scheduled.scheduled_at,
        id:          scheduled.id,
      });
    }

    // ── SEND NOW ──
    // Store contactIds on the campaign row so the CSV export can look them up
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert([{
        name,
        status:      "Running",
        total:       contacts.length,
        sent:        0,
        delivered:   0,
        failed:      0,
        contact_ids: contactIds,   // ← stored for Campaign Summary CSV drill-down
      }])
      .select()
      .single();

    if (campErr) return res.status(500).json({ error: campErr.message });

    const { sent, failed } = await sendCampaign(
      {
        id:            campaign.id,
        message,
        template_name: templateName,
        language_code: languageCode,
      },
      contacts,
      {
        token:   req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN,
        phoneId: req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID,
      }
    );

    await supabase
      .from("campaigns")
      .update({ status: "Completed", sent, failed })
      .eq("id", campaign.id);

    return res.status(200).json({ success: true, sent, failed, campaignId: campaign.id });
  }

  res.status(405).json({ error: "Method not allowed" });
};

module.exports.sendCampaign = sendCampaign;
