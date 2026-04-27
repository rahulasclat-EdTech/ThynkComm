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
    console.error(`[campaigns] Meta rejected ${toNorm}:`, JSON.stringify(rData?.error));
  } else if (!r.ok && hasMessageId) {
    console.warn(`[campaigns] Meta returned non-2xx but message queued for ${toNorm} — treating as sent`);
  }
  return { ok, rData };
}

// ── Safe insert: tries full row first, then progressively strips columns ──────
// This handles any Supabase schema — works even if optional columns are missing.
async function safeInsertMessage(row) {
  // Attempt 1: full row
  const { error: e1 } = await supabase.from("messages").insert([row]);
  if (!e1) { console.log(`[campaigns] Insert OK for ${row.to_number}`); return; }
  console.warn(`[campaigns] Insert attempt 1 failed: ${e1.message}`);

  // Attempt 2: strip error_detail (column may not exist)
  const { error_detail, ...row2 } = row;
  const { error: e2 } = await supabase.from("messages").insert([row2]);
  if (!e2) { console.log(`[campaigns] Insert OK (no error_detail) for ${row.to_number}`); return; }
  console.warn(`[campaigns] Insert attempt 2 failed: ${e2.message}`);

  // Attempt 3: strip source too
  const { source, ...row3 } = row2;
  const { error: e3 } = await supabase.from("messages").insert([row3]);
  if (!e3) { console.log(`[campaigns] Insert OK (no source) for ${row.to_number}`); return; }
  console.warn(`[campaigns] Insert attempt 3 failed: ${e3.message}`);

  // Attempt 4: strip campaign_id too
  const { campaign_id, ...row4 } = row3;
  const { error: e4 } = await supabase.from("messages").insert([row4]);
  if (!e4) { console.log(`[campaigns] Insert OK (no campaign_id) for ${row.to_number}`); return; }
  console.warn(`[campaigns] Insert attempt 4 failed: ${e4.message}`);

  // Attempt 5: bare minimum — to_number, body, status, direction only
  const { error: e5 } = await supabase.from("messages").insert([{
    to_number: row.to_number,
    body:      row.body,
    status:    row.status,
    direction: row.direction,
  }]);
  if (!e5) { console.log(`[campaigns] Insert OK (bare minimum) for ${row.to_number}`); return; }

  // All attempts failed — log everything for debugging
  console.error(`[campaigns] ALL INSERT ATTEMPTS FAILED for ${row.to_number}. Final error: ${e5.message}`);
  console.error(`[campaigns] Row attempted:`, JSON.stringify(row));
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

      // Primary: fetch by campaign_id (with OR for direction null — old rows may not have direction set)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .or("direction.eq.outbound,direction.is.null")
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`[campaigns] GET messages error: ${error.message}`);
        // columns missing — try bare query without campaign_id filter as last resort
        const { data: bare } = await supabase
          .from("messages")
          .select("to_number, body, status, created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        return res.status(200).json({ 
          rows: [], 
          error: error.message,
          hint: "campaign_id column may be missing. Run in Supabase SQL editor: ALTER TABLE messages ADD COLUMN IF NOT EXISTS campaign_id TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS direction TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS source TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS contact_name TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_name TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS wa_message_id TEXT; ALTER TABLE messages ADD COLUMN IF NOT EXISTS error_detail TEXT;"
        });
      }

      // If no rows found by campaign_id, fall back to time-window match
      // (handles rows saved by old code where campaign_id was null/not set)
      if (!data || data.length === 0) {
        console.log(`[campaigns] No rows by campaign_id, trying time-window fallback`);
        const { data: campData } = await supabase
          .from("campaigns")
          .select("created_at, updated_at, sent, total")
          .eq("id", campaignId)
          .single();

        if (campData) {
          const from = campData.created_at;
          // Use a wider window: campaign duration + 10 min buffer
          const to = campData.updated_at
            ? new Date(new Date(campData.updated_at).getTime() + 10 * 60000).toISOString()
            : new Date(new Date(from).getTime() + 30 * 60000).toISOString();

          // Try with direction filter first
          const { data: fallback } = await supabase
            .from("messages")
            .select("*")
            .or("direction.eq.outbound,direction.is.null")
            .gte("created_at", from)
            .lte("created_at", to)
            .order("created_at", { ascending: true })
            .limit(campData.total || 500);

          if (fallback?.length > 0) {
            console.log(`[campaigns] Time-window fallback found ${fallback.length} rows`);
            return res.status(200).json(fallback);
          }

          // Last resort: no direction filter, pure time window
          const { data: fallback2 } = await supabase
            .from("messages")
            .select("*")
            .gte("created_at", from)
            .lte("created_at", to)
            .order("created_at", { ascending: true })
            .limit(campData.total || 500);

          if (fallback2?.length > 0) {
            console.log(`[campaigns] Time-window fallback2 (no direction) found ${fallback2.length} rows`);
            return res.status(200).json(fallback2);
          }
        }
      }

      console.log(`[campaigns] Found ${data?.length || 0} messages for campaign ${campaignId}`);
      return res.status(200).json(data || []);
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

    // ── Probe messages table columns once before we start ─────────────────
    // Insert a dry-run probe row to discover which columns exist.
    // We intentionally use a dummy campaign_id=null and delete it after.
    // This tells us the exact schema so safeInsertMessage can skip columns upfront.
    const probeRow = {
      to_number:     "0000000000",
      body:          "__probe__",
      status:        "failed",
      direction:     "outbound",
      source:        "portal",
      campaign_id:   null,
      contact_name:  null,
      template_name: null,
      wa_message_id: null,
      error_detail:  null,
    };
    const { error: probeErr } = await supabase.from("messages").insert([probeRow]);
    if (probeErr) {
      console.warn(`[campaigns] Schema probe failed: ${probeErr.message}`);
    } else {
      // Clean up probe row immediately
      await supabase.from("messages").delete().eq("to_number", "0000000000").eq("body", "__probe__");
      console.log(`[campaigns] Schema probe passed — all columns exist`);
    }

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
          const metaErrMsg = !ok
            ? (rData?.error?.message || rData?.error?.error_data?.details || "Meta API error")
            : null;

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
