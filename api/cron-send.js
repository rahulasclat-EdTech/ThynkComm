// api/cron-send.js
// Triggered every minute by cron-job.org (free)
// URL to set in cron-job.org:
//   https://thynkcom.vercel.app/api/cron-send?secret=YOUR_CRON_SECRET

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Phone number normaliser ───────────────────────────────────────────────────
// FIX: cron-send was saving contact.phone raw, causing the same contact to
//      appear as two separate conversations in Live Chat when the customer
//      replied (because inbound from_number is always normalised by Meta).
function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return String(raw);
  return digits;
}

async function sendCampaign(scheduled, contacts) {
  let sent = 0, failed = 0;

  for (const contact of contacts) {
    try {
      // FIX: normalise phone before sending and storing.
      const toNorm = normalisePhone(contact.phone) || contact.phone;

      const payload = scheduled.template_name
        ? {
            messaging_product: "whatsapp",
            to: toNorm,
            type: "template",
            template: { name: scheduled.template_name, language: { code: scheduled.language_code || "en_US" } },
          }
        : {
            messaging_product: "whatsapp",
            to: toNorm,
            type: "text",
            text: { body: scheduled.message },
          };

      const r = await fetch(
        `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const rData = await r.json();

      // FIX: save normalised phone + contact_name + source so Live Chat
      //      threads merge correctly with inbound replies.
      // FIX: capture Meta error detail so delivery report can show failure reason
      const metaErrMsg = !r.ok
        ? (rData?.error?.message || rData?.error?.error_data?.details || "Meta API error")
        : null;

      await supabase.from("messages").insert([{
        to_number:     toNorm,
        contact_name:  contact.name  || null,
        body:          scheduled.message || `[template: ${scheduled.template_name}]`,
        template_name: scheduled.template_name || null,
        status:        r.ok ? "sent" : "failed",
        direction:     "outbound",
        source:        "portal",
        wa_message_id: rData.messages?.[0]?.id,
        campaign_id:   scheduled.campaign_id || null,
        error_detail:  metaErrMsg,
      }]);

      r.ok ? sent++ : failed++;
    } catch (err) {
      // FIX: insert a failed row so the number appears in the delivery report
      await supabase.from("messages").insert([{
        to_number:    toNorm,
        contact_name: contact.name || null,
        body:         scheduled.message || `[template: ${scheduled.template_name}]`,
        status:       "failed",
        direction:    "outbound",
        source:       "portal",
        campaign_id:  scheduled.campaign_id || null,
        error_detail: err.message,
      }]);
      failed++;
    }
  }

  return { sent, failed };
}

module.exports = async function handler(req, res) {
  // Accept secret via query param (GET) or Authorization header (POST)
  const secret = req.query.secret || req.headers["authorization"]?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date().toISOString();
  console.log(`[cron-send] Running at ${now}`);

  // Find all pending campaigns due now or in the past
  const { data: dueCampaigns, error } = await supabase
    .from("scheduled_campaigns")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now);

  if (error) {
    console.error("[cron-send] Fetch error:", error);
    return res.status(500).json({ error: error.message });
  }

  if (!dueCampaigns.length) {
    console.log("[cron-send] No campaigns due.");
    return res.status(200).json({ processed: 0, message: "No campaigns due" });
  }

  console.log(`[cron-send] Found ${dueCampaigns.length} campaign(s) to send`);
  const results = [];

  for (const scheduled of dueCampaigns) {
    // Mark as processing immediately to prevent double-send
    await supabase
      .from("scheduled_campaigns")
      .update({ status: "processing" })
      .eq("id", scheduled.id);

    try {
      // Fetch opted-in contacts
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select("*")
        .in("id", scheduled.contact_ids)
        .eq("opt_in", true);

      if (cErr || !contacts?.length) {
        await supabase
          .from("scheduled_campaigns")
          .update({ status: "failed", error_message: cErr?.message || "No opted-in contacts" })
          .eq("id", scheduled.id);
        results.push({ id: scheduled.id, status: "failed" });
        continue;
      }

      // Create campaign record in campaigns table
      const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .insert([{ name: scheduled.name, status: "Running", total: contacts.length, sent: 0, delivered: 0, failed: 0 }])
        .select()
        .single();

      if (campErr) {
        await supabase
          .from("scheduled_campaigns")
          .update({ status: "failed", error_message: campErr.message })
          .eq("id", scheduled.id);
        results.push({ id: scheduled.id, status: "failed" });
        continue;
      }

      // Send messages
      const { sent, failed } = await sendCampaign({ ...scheduled, campaign_id: campaign.id }, contacts);

      // Update campaign record
      await supabase
        .from("campaigns")
        .update({ status: "Completed", sent, failed })
        .eq("id", campaign.id);

      // Mark scheduled campaign as sent
      await supabase
        .from("scheduled_campaigns")
        .update({ status: "sent", sent_at: new Date().toISOString(), campaign_id: campaign.id })
        .eq("id", scheduled.id);

      console.log(`[cron-send] ✅ "${scheduled.name}" — sent: ${sent}, failed: ${failed}`);
      results.push({ id: scheduled.id, status: "sent", sent, failed });

    } catch (err) {
      console.error(`[cron-send] ❌ Error:`, err);
      await supabase
        .from("scheduled_campaigns")
        .update({ status: "failed", error_message: err.message })
        .eq("id", scheduled.id);
      results.push({ id: scheduled.id, status: "failed", error: err.message });
    }
  }

  return res.status(200).json({ processed: results.length, results });
};
