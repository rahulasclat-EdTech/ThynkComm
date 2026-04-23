// api/campaigns.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Phone number normaliser ───────────────────────────────────────────────────
function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return String(raw);
  return digits;
}

// ── Send with rate-limit awareness: max 20 msg/sec, log Meta errors ──────────
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
  if (!r.ok) {
    const metaErr = rData?.error || {};
    console.error(`[campaigns] Meta error for ${toNorm}: code=${metaErr.code} msg=${metaErr.message}`);
  }
  return { ok: r.ok, rData };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET — list campaigns OR messages for one campaign ────────────────────
  if (req.method === "GET") {
    const campaignId = req.query.campaignId;

    if (campaignId) {
      // FIX: return real per-message rows so the delivery report shows actual
      //      status (sent / delivered / read / failed) for every number.
      //      Previously this was fetched via /api/live-chat?campaignId which
      //      has no campaignId handler and returned nothing useful.
      const { data, error } = await supabase
        .from("messages")
        .select("id, to_number, contact_name, body, template_name, status, wa_message_id, created_at, updated_at")
        .eq("campaign_id", campaignId)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ error: error.message });
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

    if (!name)     return res.status(400).json({ error: "name is required" });
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

    let sent = 0, failed = 0;

    // FIX: Process contacts in batches of 20 with a 1-second pause between
    //      batches to respect Meta's ~80 msg/sec rate limit and avoid silent
    //      failures when sending to large lists (100+ contacts).
    const BATCH_SIZE = 20;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (contact) => {
        try {
          const toNorm = normalisePhone(contact.phone) || contact.phone;

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

          console.log(`[campaigns] Sending to ${toNorm}`);
          const { ok, rData } = await sendOne(toNorm, payload, token, phoneId);

          // FIX: Capture Meta error message in the DB row so the delivery
          //      report can show WHY a message failed (invalid number, opt-out,
          //      template not approved, rate-limit, etc.)
          const metaErrMsg = !ok
            ? (rData?.error?.message || rData?.error?.error_data?.details || "Meta API error")
            : null;

          await supabase.from("messages").insert([{
            to_number:     toNorm,
            contact_name:  contact.name  || null,
            body:          message || `[template: ${template_name}]`,
            template_name: template_name || null,
            status:        ok ? "sent" : "failed",
            direction:     "outbound",
            source:        "portal",
            wa_message_id: rData.messages?.[0]?.id || null,
            campaign_id:   campaign.id   || null,
            // FIX: store error detail so report can show failure reason
            error_detail:  metaErrMsg,
          }]);

          ok ? sent++ : failed++;
        } catch (err) {
          console.error(`[campaigns] Exception for ${contact.phone}:`, err.message);
          // FIX: still insert a failed row so the number appears in the report
          const toNorm = normalisePhone(contact.phone) || contact.phone;
          await supabase.from("messages").insert([{
            to_number:    toNorm,
            contact_name: contact.name || null,
            body:         message || `[template: ${template_name}]`,
            status:       "failed",
            direction:    "outbound",
            source:       "portal",
            campaign_id:  campaign.id || null,
            error_detail: err.message,
          }]);
          failed++;
        }
      }));

      // Pause 1 second between batches (skip after last batch)
      if (i + BATCH_SIZE < contacts.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Update campaign totals
    await supabase
      .from("campaigns")
      .update({ status: "Completed", sent, failed })
      .eq("id", campaign.id);

    return res.status(200).json({ success: true, campaignId: campaign.id, sent, failed });
  }

  res.status(405).end();
};
