// api/rcs-campaigns.js
// GET  /api/rcs-campaigns              → list all RCS campaigns
// POST /api/rcs-campaigns              → create & fire a new campaign
//
// Campaign send is batched (20 msg/s default) with per-message status tracking.
// Devices that are not RCS-capable get a "not_delivered" status (no fallback here —
// add SMS fallback in a future step if needed).

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const { getGoogleAccessToken } = require("./rcs-config");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalisePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s.startsWith("+")) {
    const d = s.replace(/\D/g, "");
    if (d.length === 10)                       return "+91" + d;
    if (d.length === 12 && d.startsWith("91")) return "+"  + d;
    if (d.length > 7)                          return "+"  + d;
    return null;
  }
  return s;
}

async function sendOneRcs(phone, contentMessage, agentId, accessToken, messageId) {
  const url = `https://rcsbusinessmessaging.googleapis.com/v1/phones/${encodeURIComponent(phone)}/agentMessages?messageId=${messageId}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messageId, contentMessage }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET: list campaigns ───────────────────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("rcs_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ campaigns: data || [] });
  }

  // ── POST: create & launch campaign ───────────────────────────────────────
  if (req.method === "POST") {
    const {
      campaign_name,   // display name
      template_name,   // RCS template name (from rcs_templates table)
      contacts,        // [{phone, name?, ...variables}] array
      message_type,    // "text" | "rich_card"
      text,            // for message_type === "text"
      template_params, // for rich card / template
      suggestions,     // optional quick-reply chips
      batch_delay_ms,  // ms between each send (default 60ms = ~16/s, safe limit)
    } = req.body || {};

    if (!campaign_name) return res.status(400).json({ error: "campaign_name is required." });
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0)
      return res.status(400).json({ error: "contacts array is required and must not be empty." });
    if (!text && !template_name)
      return res.status(400).json({ error: "Provide either text or template_name." });

    // ── Load credentials ────────────────────────────────────────────────────
    const agentId = (process.env.RCS_AGENT_ID || "").trim();
    const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();
    if (!agentId || !saJson) {
      return res.status(400).json({
        error: "RCS not configured.",
        hint:  "Set RCS_AGENT_ID and RCS_SERVICE_ACCOUNT_JSON in Vercel environment variables.",
      });
    }

    let accessToken;
    try {
      accessToken = await getGoogleAccessToken(saJson);
    } catch (err) {
      return res.status(401).json({ error: err.message });
    }

    // ── Create campaign record ──────────────────────────────────────────────
    const { data: campaign, error: campErr } = await supabase
      .from("rcs_campaigns")
      .insert([{
        name:          campaign_name,
        template_name: template_name || null,
        total:         contacts.length,
        sent:          0,
        failed:        0,
        status:        "running",
      }])
      .select()
      .single();

    if (campErr) return res.status(500).json({ error: campErr.message });

    // ── Respond immediately; send in background ───────────────────────────
    res.status(200).json({
      success:     true,
      campaign_id: campaign.id,
      total:       contacts.length,
      message:     "Campaign started. Messages are being sent in the background.",
    });

    // ── Background send loop ──────────────────────────────────────────────
    let sentCount   = 0;
    let failedCount = 0;
    const delay     = batch_delay_ms || 60;

    for (const contact of contacts) {
      const phone = normalisePhone(contact.phone || contact.to || contact.number);
      if (!phone) { failedCount++; continue; }

      const messageId = `rcs-${campaign.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

      // Build content message for this contact
      let contentMessage = {};
      if (message_type === "rich_card" && template_params) {
        const params = typeof template_params === "function"
          ? template_params(contact)
          : { ...template_params, ...contact };
        contentMessage = {
          richCard: {
            standaloneCard: {
              cardOrientation: "VERTICAL",
              cardContent: {
                title:       params.title       || campaign_name,
                description: params.description || text || "",
                ...(params.image_url
                  ? { media: { height: "MEDIUM", contentInfo: { fileUrl: params.image_url } } }
                  : {}),
                ...(params.buttons && params.buttons.length > 0
                  ? {
                      suggestions: params.buttons.map(b => ({
                        action: {
                          text:         b.text,
                          postbackData: b.postbackData || b.text,
                          ...(b.url ? { openUrlAction: { url: b.url } } : {}),
                        },
                      })),
                    }
                  : {}),
              },
            },
          },
        };
      } else {
        // Text message — personalise with contact name if present
        const body = (text || "")
          .replace(/\{\{name\}\}/gi,    contact.name    || "")
          .replace(/\{\{school\}\}/gi,  contact.school  || "")
          .replace(/\{\{phone\}\}/gi,   phone);
        contentMessage = { text: body };
      }

      // Attach suggestions if provided
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        contentMessage.suggestions = suggestions.map(s =>
          s.type === "action" && s.url
            ? { action: { text: s.text, postbackData: s.postbackData || s.text, openUrlAction: { url: s.url } } }
            : { reply: { text: s.text, postbackData: s.postbackData || s.text } }
        );
      }

      const result = await sendOneRcs(phone, contentMessage, agentId, accessToken, messageId);

      if (result.ok) {
        sentCount++;
        try {
          await supabase.from("rcs_messages").insert([{
            to_number:   phone,
            body:        text || `[template: ${template_name}]`,
            status:      "sent",
            direction:   "outbound",
            message_id:  messageId,
            campaign_id: campaign.id,
            template_name: template_name || null,
          }]);
        } catch (_) {}
      } else {
        failedCount++;
        const errMsg = result.data?.error?.message || "send failed";
        try {
          await supabase.from("rcs_messages").insert([{
            to_number:   phone,
            body:        text || `[template: ${template_name}]`,
            status:      "failed",
            direction:   "outbound",
            message_id:  messageId,
            campaign_id: campaign.id,
            error_msg:   errMsg,
            template_name: template_name || null,
          }]);
        } catch (_) {}
      }

      await sleep(delay);
    }

    // ── Update campaign final status ──────────────────────────────────────
    await supabase
      .from("rcs_campaigns")
      .update({
        sent:   sentCount,
        failed: failedCount,
        status: "completed",
      })
      .eq("id", campaign.id);

    return; // response already sent
  }

  return res.status(405).json({ error: "Method not allowed" });
};
