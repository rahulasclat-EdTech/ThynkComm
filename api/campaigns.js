// api/campaigns.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return String(raw);
  return digits;
}

async function sendOne(toNorm, payload, token, phoneId) {
  const r = await fetch(
    `https://graph.facebook.com/v25.0/${phoneId}/messages`,
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    }
  );
  const rData = await r.json();

  // FIX: Trust wa_message_id presence as the real success signal.
  // Meta sometimes returns a non-2xx HTTP status (e.g. 400) but still
  // includes messages[0].id in the body when the message was actually queued.
  // Using r.ok alone marks these as "failed" even though they were delivered.
  const hasMessageId = !!(rData?.messages?.[0]?.id);
  const ok = r.ok || hasMessageId;

  if (!r.ok && !hasMessageId) {
    // Log the FULL error so it appears in Vercel logs for debugging
    console.error(`[campaigns] Meta REJECTED ${toNorm} — HTTP ${r.status}:`, JSON.stringify(rData));
  } else if (!r.ok && hasMessageId) {
    console.warn(`[campaigns] Meta non-2xx but queued for ${toNorm}:`, JSON.stringify(rData));
  }
  return { ok, rData };
}

// ── Insert message row — always uses full column set ─────────────────────────
// Supabase will return a clear error if a column is missing.
// We log the FULL error so Vercel logs show exactly what's wrong.
async function safeInsertMessage(row) {
  const { error } = await supabase.from("messages").insert([row]);
  if (!error) {
    console.log(`[campaigns] Inserted message for ${row.to_number} campaign_id=${row.campaign_id}`);
    return;
  }
  // Log full error detail — visible in Vercel logs
  console.error(`[campaigns] INSERT FAILED for ${row.to_number}: ${error.message} | code: ${error.code} | details: ${error.details} | hint: ${error.hint}`);
  console.error(`[campaigns] Row was: ${JSON.stringify(row)}`);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET — list campaigns OR messages for one campaign ────────────────────
  if (req.method === "GET") {
    const campaignId = req.query.campaignId;

    if (campaignId) {
      console.log(`[campaigns] Fetching messages for campaign ${campaignId}`);

      // ── Step 1: Always fetch campaign metadata first ───────────────────────
      // Try both string and integer forms of the ID
      const { data: campData, error: campErr } = await supabase
        .from("campaigns")
        .select("id, created_at, updated_at, sent, total, name")
        .eq("id", campaignId)
        .maybeSingle();

      if (campErr) {
        console.error(`[campaigns] Campaign lookup error for id=${campaignId}: ${campErr.message}`);
        return res.status(200).json([]);
      }
      if (!campData) {
        // Log all campaign IDs so we can see what's in DB vs what was requested
        const { data: allCamps } = await supabase.from("campaigns").select("id, name").order("id", { ascending: false }).limit(10);
        console.error(`[campaigns] Campaign ${campaignId} not found. Recent IDs in DB: ${JSON.stringify(allCamps?.map(c=>({id:c.id,name:c.name})))}`);
        return res.status(200).json([]);
      }
      console.log(`[campaigns] Found campaign: id=${campData.id} name="${campData.name}" total=${campData.total}`);

      // ── Step 2: Try fetching by campaign_id column (new campaigns) ────────
      const { data: byId, error: idErr } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", String(campaignId))
        .order("created_at", { ascending: true });

      if (!idErr && byId && byId.length > 0) {
        console.log(`[campaigns] Found ${byId.length} rows by campaign_id`);
        return res.status(200).json(byId);
      }

      // campaign_id column exists but 0 rows — old messages need backfill
      // campaign_id column missing — fall back to time window
      if (idErr) console.warn(`[campaigns] campaign_id query error: ${idErr.message} — using time window`);
      else console.log(`[campaigns] 0 rows by campaign_id — using time window`);

      // ── Step 3: Time-window query scoped to this campaign's contacts ───────
      // Use campaign total count to limit results so we don't bleed into
      // adjacent campaigns that ran at similar times
      const timeFrom  = campData.created_at;
      const rawTo     = campData.updated_at || campData.created_at;
      // Add 5 min buffer but cap at campaign total+10 to avoid overlap
      const timeTo    = new Date(new Date(rawTo).getTime() + 5 * 60000).toISOString();
      const rowLimit  = Math.max((campData.total || 10) + 10, 20);

      const { data: byTime, error: timeErr } = await supabase
        .from("messages")
        .select("*")
        .gte("created_at", timeFrom)
        .lte("created_at", timeTo)
        .order("created_at", { ascending: true })
        .limit(rowLimit);

      if (timeErr) {
        // select * failed — try safe minimal columns (schema missing extras)
        const { data: minimal, error: minErr } = await supabase
          .from("messages")
          .select("id, to_number, body, status, created_at")
          .gte("created_at", timeFrom)
          .lte("created_at", timeTo)
          .order("created_at", { ascending: true })
          .limit(rowLimit);

        if (minErr) {
          console.error(`[campaigns] All queries failed: ${minErr.message}`);
          return res.status(200).json([]);
        }
        console.log(`[campaigns] Time-window minimal found ${minimal.length} rows`);
        return res.status(200).json(minimal || []);
      }

      const rows = byTime || [];
      console.log(`[campaigns] Time-window found ${rows.length} rows`);

      // ── Step 4: Silently backfill campaign_id so webhook updates work ──────
      if (rows.length > 0 && !idErr) {
        const toFix = rows.filter(m => !m.campaign_id).map(m => m.id).filter(Boolean);
        if (toFix.length > 0) {
          supabase.from("messages")
            .update({ campaign_id: String(campaignId), direction: "outbound" })
            .in("id", toFix)
            .then(() => console.log(`[campaigns] Backfilled ${toFix.length} rows with campaign_id`))
            .catch(() => {});
        }
      }

      return res.status(200).json(rows);
    }

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // ── POST — create & send a campaign ──────────────────────────────────────
  if (req.method === "POST") {
    const {
      name,
      contacts,
      message,
      template_name,
      language_code,
      template_params,
    } = req.body;

    if (!name)            return res.status(400).json({ error: "name is required" });
    if (!contacts?.length) return res.status(400).json({ error: "contacts are required" });
    if (!message && !template_name)
      return res.status(400).json({ error: "message or template_name is required" });

    const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
    const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
    if (!token || !phoneId)
      return res.status(400).json({ error: "WhatsApp credentials missing." });

    // Create campaign record
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert([{ name, status: "Running", total: contacts.length, sent: 0, delivered: 0, failed: 0 }])
      .select()
      .single();

    if (campErr) return res.status(500).json({ error: campErr.message });
    console.log(`[campaigns] Created campaign ${campaign.id} — sending to ${contacts.length} contacts`);

    let sent = 0, failed = 0;

    const BATCH_SIZE = 20;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (contact) => {
        const toNorm = normalisePhone(contact.phone) || contact.phone;
        try {
          let payload;
          if (template_name) {
            const components = [];
            if (Array.isArray(template_params) && template_params.length > 0) {
              components.push({
                type: "body",
                parameters: template_params.map(val => ({ type: "text", text: String(val) })),
              });
            }
            payload = {
              messaging_product: "whatsapp",
              to: toNorm,
              type: "template",
              template: {
                name: template_name,
                language: { code: language_code || "en_US" },
                ...(components.length > 0 ? { components } : {}),
              },
            };
          } else {
            payload = {
              messaging_product: "whatsapp",
              to: toNorm,
              type: "text",
              text: { body: message },
            };
          }

          const { ok, rData } = await sendOne(toNorm, payload, token, phoneId);
          // Meta error can be at rData.error.message or rData.error.error_data.details
          const metaErr = rData?.error || {};
          const metaErrMsg = !ok
            ? (metaErr.error_data?.details || metaErr.message || JSON.stringify(metaErr) || "Meta API error")
            : null;
          if (!ok) console.error(`[campaigns] Failed for ${toNorm}: ${metaErrMsg}`);

          await safeInsertMessage({
            to_number:     toNorm,
            contact_name:  contact.name  || null,
            body:          message || `[template: ${template_name}]`,
            template_name: template_name || null,
            status:        ok ? "sent" : "failed",
            direction:     "outbound",
            source:        "portal",
            wa_message_id: rData.messages?.[0]?.id || null,
            campaign_id:   String(campaign.id),  // cast to string — works for both UUID and integer PKs
            error_detail:  metaErrMsg,
          });

          ok ? sent++ : failed++;
        } catch (err) {
          console.error(`[campaigns] Exception for ${toNorm}:`, err.message);
          await safeInsertMessage({
            to_number:    toNorm,
            contact_name: contact.name || null,
            body:         message || `[template: ${template_name}]`,
            status:       "failed",
            direction:    "outbound",
            source:       "portal",
            campaign_id:  campaign.id,
            error_detail: err.message,
          });
          failed++;
        }
      }));

      if (i + BATCH_SIZE < contacts.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    await supabase
      .from("campaigns")
      .update({ status: "Completed", sent, failed })
      .eq("id", campaign.id);

    console.log(`[campaigns] Campaign ${campaign.id} done — sent: ${sent}, failed: ${failed}`);
    return res.status(200).json({ success: true, campaignId: campaign.id, sent, failed });
  }

  // ── PATCH — backfill campaign_id on time-window matched messages ────────
  if (req.method === "PATCH") {
    const { campaignId } = req.body || {};
    if (!campaignId) return res.status(400).json({ error: "campaignId required" });

    // Get campaign time window
    const { data: campData, error: campErr } = await supabase
      .from("campaigns")
      .select("created_at, updated_at, sent, total")
      .eq("id", campaignId)
      .single();

    if (campErr || !campData) return res.status(404).json({ error: "Campaign not found" });

    const from = campData.created_at;
    const to = campData.updated_at
      ? new Date(new Date(campData.updated_at).getTime() + 10 * 60000).toISOString()
      : new Date(new Date(from).getTime() + 30 * 60000).toISOString();

    // Find messages in window that have null campaign_id
    const { data: msgs, error: fetchErr } = await supabase
      .from("messages")
      .select("id")
      .is("campaign_id", null)
      .gte("created_at", from)
      .lte("created_at", to)
      .limit(campData.total || 500);

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!msgs?.length) return res.status(200).json({ updated: 0, message: "No unlinked messages found in time window" });

    const ids = msgs.map(m => m.id);

    // Backfill campaign_id and direction on those rows
    const { error: updateErr } = await supabase
      .from("messages")
      .update({ campaign_id: String(campaignId), direction: "outbound" })
      .in("id", ids);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    console.log(`[campaigns] Backfilled campaign_id=${campaignId} on ${ids.length} messages`);
    return res.status(200).json({ updated: ids.length, message: `Linked ${ids.length} messages to this campaign` });
  }

  res.status(405).end();
};
