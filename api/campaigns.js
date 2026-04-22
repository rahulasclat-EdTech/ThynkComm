// api/campaigns.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Phone number normaliser ───────────────────────────────────────────────────
// FIX: campaigns were saving contact.phone raw (e.g. "9876543210") while
//      inbound webhook messages store from_number normalised to "919876543210".
//      This caused the same contact to appear as two separate conversations in
//      Live Chat.  Normalising here ensures they always merge into one thread.
function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return String(raw);
  return digits;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET — list all campaigns ─────────────────────────────────
  if (req.method === "GET") {
    const campaignId = req.query.campaignId;

    if (campaignId) {
      // Single campaign: return its messages for the summary CSV
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("campaign_id", campaignId)
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

  // ── POST — create & send a campaign ──────────────────────────
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

    for (const contact of contacts) {
      try {
        // FIX: normalise phone before sending and storing.
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
          console.error(`[campaigns] Meta error for ${toNorm}:`, JSON.stringify(metaErr));
        }

        // FIX: save normalised phone + contact_name + source so Live Chat
        //      threads merge correctly with inbound replies.
        await supabase.from("messages").insert([{
          to_number:     toNorm,
          contact_name:  contact.name  || null,
          body:          message || `[template: ${template_name}]`,
          template_name: template_name || null,
          status:        r.ok ? "sent" : "failed",
          direction:     "outbound",
          source:        "portal",
          wa_message_id: rData.messages?.[0]?.id || null,
          campaign_id:   campaign.id   || null,
        }]);

        r.ok ? sent++ : failed++;
      } catch (err) {
        console.error(`[campaigns] Exception for ${contact.phone}:`, err.message);
        failed++;
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
