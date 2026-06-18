// api/rcs.js
// Single Vercel serverless function handling ALL RCS operations.
// Routed by ?action= query param to stay within Vercel Hobby plan 12-function limit.
//
// Routes:
//   GET  /api/rcs?action=config                → check RCS config status
//   POST /api/rcs?action=config                → test Google RBM credentials
//   GET  /api/rcs?action=templates             → list RCS templates
//   POST /api/rcs?action=templates             → create RCS template
//   DELETE /api/rcs?action=templates&id=<uuid> → delete RCS template
//   POST /api/rcs?action=send                  → send single RCS message
//   GET  /api/rcs?action=campaigns             → list RCS campaigns
//   POST /api/rcs?action=campaigns             → launch RCS campaign
//   GET  /api/rcs?action=inbox                 → fetch RCS messages
//   POST /api/rcs?action=webhook               → Google RBM inbound webhook
//   GET  /api/rcs?action=webhook               → Google RBM webhook verification
//
// Env vars required:
//   RCS_AGENT_ID              — Google RBM agent ID e.g. "brand@rbm.goog"
//   RCS_SERVICE_ACCOUNT_JSON  — Stringified Google service account JSON
//   RCS_WEBHOOK_TOKEN         — Secret token for webhook verification
//   SUPABASE_URL, SUPABASE_ANON_KEY

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalisePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s.startsWith("+")) {
    const d = s.replace(/\D/g, "");
    if (d.length === 10)                       return "+91" + d;
    if (d.length === 12 && d.startsWith("91")) return "+" + d;
    if (d.length > 7)                          return "+" + d;
    return null;
  }
  return s;
}

async function getGoogleAccessToken(serviceAccountJson) {
  const sa  = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/businessmessages",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sigInput = `${b64(header)}.${b64(claims)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(sigInput);
  const signature = sign.sign(sa.private_key, "base64url");
  const jwt = `${sigInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error_description || "Failed to get Google access token");
  return tokenData.access_token;
}

function buildContentMessage({ message_type, text, template_params, suggestions }) {
  let contentMessage = {};

  if (message_type === "rich_card" && template_params) {
    contentMessage = {
      richCard: {
        standaloneCard: {
          cardOrientation: "VERTICAL",
          cardContent: {
            title:       template_params.title       || "",
            description: template_params.description || text || "",
            ...(template_params.image_url
              ? { media: { height: "MEDIUM", contentInfo: { fileUrl: template_params.image_url, forceRefresh: false } } }
              : {}),
            ...(template_params.buttons?.length
              ? { suggestions: template_params.buttons.map(b => ({ action: { text: b.text, postbackData: b.postbackData || b.text, ...(b.url ? { openUrlAction: { url: b.url } } : {}) } })) }
              : {}),
          },
        },
      },
    };
  } else {
    contentMessage = { text: text || "" };
  }

  if (Array.isArray(suggestions) && suggestions.length > 0) {
    contentMessage.suggestions = suggestions.map(s =>
      s.type === "action" && s.url
        ? { action: { text: s.text, postbackData: s.postbackData || s.text, openUrlAction: { url: s.url } } }
        : { reply: { text: s.text, postbackData: s.postbackData || s.text } }
    );
  }

  return contentMessage;
}

async function sendOneRcs(phone, contentMessage, accessToken, messageId) {
  const url = `https://rcsbusinessmessaging.googleapis.com/v1/phones/${encodeURIComponent(phone)}/agentMessages?messageId=${messageId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, contentMessage }),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleConfig(req, res) {
  if (req.method === "GET") {
    const agentId = (process.env.RCS_AGENT_ID || "").trim();
    const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();
    if (!agentId || !saJson) return res.status(200).json({ configured: false });
    let clientEmail = "";
    try { clientEmail = JSON.parse(saJson).client_email || ""; } catch (_) {}
    return res.status(200).json({ configured: true, agent_id: agentId, client_email: clientEmail });
  }

  if (req.method === "POST") {
    const { agent_id, service_account_json } = req.body || {};
    if (!agent_id || !service_account_json) return res.status(400).json({ error: "Provide agent_id and service_account_json" });
    try {
      const token   = await getGoogleAccessToken(service_account_json);
      const testRes = await fetch("https://rcsbusinessmessaging.googleapis.com/v1/rbm-agent/profile", { headers: { Authorization: `Bearer ${token}` } });
      const testData = await testRes.json();
      if (!testRes.ok) return res.status(400).json({ error: testData.error?.message || "RBM API error", hint: "Check IAM permissions for roles/rcsbusinessmessaging.agentOwner", raw: testData });
      return res.status(200).json({ valid: true, agent_name: testData.displayName || agent_id });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

async function handleTemplates(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase.from("rcs_templates").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ templates: data || [] });
  }

  if (req.method === "POST") {
    const { name, type, language, body_text, card_title, card_description, card_image_url, card_buttons, suggestions, status } = req.body || {};
    if (!name || !type) return res.status(400).json({ error: "name and type are required." });
    if (!["TEXT","RICH_CARD","CAROUSEL"].includes(type)) return res.status(400).json({ error: "type must be TEXT, RICH_CARD, or CAROUSEL" });

    const definition = { type, language: language || "en", ...(type === "TEXT" ? { body_text } : {}), ...(type === "RICH_CARD" ? { card_title, card_description, card_image_url: card_image_url || null, card_buttons: card_buttons || [] } : {}), suggestions: suggestions || [] };

    const { data, error } = await supabase.from("rcs_templates").insert([{ name, type, language: language || "en", definition, status: status || "DRAFT" }]).select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: `Template "${name}" already exists.` });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ success: true, template: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Provide template id as query param." });
    const { error } = await supabase.from("rcs_templates").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
}

async function handleSend(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, message_type, text, template_name, template_params, suggestions } = req.body || {};
  const phone = normalisePhone(to);
  if (!phone) return res.status(400).json({ error: `Invalid phone "${to}". Use E.164 or 10-digit Indian number.` });
  if (!text && !template_name) return res.status(400).json({ error: "Provide either text or template_name." });

  const agentId = (process.env.RCS_AGENT_ID || "").trim();
  const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();
  if (!agentId || !saJson) return res.status(400).json({ error: "RCS not configured. Set RCS_AGENT_ID and RCS_SERVICE_ACCOUNT_JSON in Vercel." });

  let accessToken;
  try { accessToken = await getGoogleAccessToken(saJson); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  const messageId      = `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const contentMessage = buildContentMessage({ message_type, text, template_params, suggestions });
  const result         = await sendOneRcs(phone, contentMessage, accessToken, messageId);

  const logRow = { to_number: phone, body: text || `[template: ${template_name}]`, direction: "outbound", message_id: messageId, template_name: template_name || null };

  if (!result.ok) {
    const code = result.data?.error?.code;
    const msg  = result.data?.error?.message || "Google RBM API error";
    let hint   = "Check Google Cloud Console.";
    if (code === 404) hint = "Device does not support RCS. Consider SMS fallback.";
    if (code === 403) hint = "Service account lacks permission. Grant roles/rcsbusinessmessaging.agentOwner.";
    if (code === 429) hint = "Rate limit exceeded. Reduce send frequency.";
    await supabase.from("rcs_messages").insert([{ ...logRow, status: "failed", error_code: String(code||""), error_msg: msg }]).catch(()=>{});
    return res.status(400).json({ error: msg, code, hint, raw: result.data });
  }

  await supabase.from("rcs_messages").insert([{ ...logRow, status: "sent" }]).catch(()=>{});
  return res.status(200).json({ success: true, messageId, to: phone, channel: "rcs" });
}

async function handleCampaigns(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase.from("rcs_campaigns").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ campaigns: data || [] });
  }

  if (req.method === "POST") {
    const { campaign_name, template_name, contacts, message_type, text, template_params, suggestions, batch_delay_ms } = req.body || {};
    if (!campaign_name) return res.status(400).json({ error: "campaign_name is required." });
    if (!contacts?.length) return res.status(400).json({ error: "contacts array is required." });
    if (!text && !template_name) return res.status(400).json({ error: "Provide either text or template_name." });

    const agentId = (process.env.RCS_AGENT_ID || "").trim();
    const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();
    if (!agentId || !saJson) return res.status(400).json({ error: "RCS not configured." });

    let accessToken;
    try { accessToken = await getGoogleAccessToken(saJson); }
    catch (err) { return res.status(401).json({ error: err.message }); }

    const { data: campaign, error: campErr } = await supabase.from("rcs_campaigns")
      .insert([{ name: campaign_name, template_name: template_name || null, total: contacts.length, sent: 0, failed: 0, status: "running" }])
      .select().single();
    if (campErr) return res.status(500).json({ error: campErr.message });

    // Respond immediately, fire-and-forget the sends
    res.status(200).json({ success: true, campaign_id: campaign.id, total: contacts.length, message: "Campaign started." });

    let sentCount = 0, failedCount = 0;
    const delay = batch_delay_ms || 60;

    for (const contact of contacts) {
      const phone = normalisePhone(contact.phone || contact.to || contact.number);
      if (!phone) { failedCount++; continue; }

      const messageId = `rcs-${campaign.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

      // Personalise text variables
      const personalised = (text || "")
        .replace(/\{\{name\}\}/gi, contact.name || "")
        .replace(/\{\{school\}\}/gi, contact.school || "")
        .replace(/\{\{phone\}\}/gi, phone);

      const contentMessage = buildContentMessage({
        message_type: message_type || "text",
        text: personalised,
        template_params: template_params ? { ...template_params, ...contact } : null,
        suggestions,
      });

      const result = await sendOneRcs(phone, contentMessage, accessToken, messageId);
      const logRow = { to_number: phone, body: personalised || `[template: ${template_name}]`, direction: "outbound", message_id: messageId, campaign_id: campaign.id, template_name: template_name || null };

      if (result.ok) { sentCount++; await supabase.from("rcs_messages").insert([{ ...logRow, status: "sent" }]).catch(()=>{}); }
      else { failedCount++; await supabase.from("rcs_messages").insert([{ ...logRow, status: "failed", error_msg: result.data?.error?.message || "send failed" }]).catch(()=>{}); }

      await sleep(delay);
    }

    await supabase.from("rcs_campaigns").update({ sent: sentCount, failed: failedCount, status: "completed" }).eq("id", campaign.id);
    return;
  }
}

async function handleInbox(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { direction, limit = 200, campaign_id } = req.query;
  let query = supabase.from("rcs_messages").select("*").order("created_at", { ascending: false }).limit(Number(limit));
  if (direction)   query = query.eq("direction", direction);
  if (campaign_id) query = query.eq("campaign_id", campaign_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ messages: data || [] });
}

async function handleWebhook(req, res) {
  // GET: webhook verification by Google
  if (req.method === "GET") {
    const { secret }  = req.query;
    const expected    = (process.env.RCS_WEBHOOK_TOKEN || "").trim();
    if (!expected)    return res.status(500).send("RCS_WEBHOOK_TOKEN not configured.");
    if (secret !== expected) return res.status(403).send("Forbidden");
    return res.status(200).send(secret);
  }

  // POST: inbound RBM event
  if (req.method === "POST") {
    const event = req.body;
    try {
      const msg     = event?.message || event;
      const msgName = msg?.name || "";

      if (msg?.userMessage || event?.senderPhoneNumber) {
        const phone    = event.senderPhoneNumber || extractPhone(msgName);
        const userMsg  = msg.userMessage;
        const body     = userMsg?.text || userMsg?.suggestionResponse?.postbackData || "[unsupported message type]";
        await supabase.from("rcs_messages").insert([{ to_number: phone, body, status: "received", direction: "inbound", message_id: msg.messageId || null }]);
        return res.status(200).json({ received: true });
      }

      if (event?.deliveryReceipt || event?.readReceipt) {
        const receipt   = event.deliveryReceipt || event.readReceipt;
        const msgId     = receipt?.rcsPlatformMessageId || receipt?.messageId;
        const newStatus = event.deliveryReceipt ? "delivered" : "read";
        if (msgId) await supabase.from("rcs_messages").update({ status: newStatus }).eq("message_id", msgId);
        return res.status(200).json({ updated: newStatus });
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("RCS webhook error:", err.message);
      return res.status(200).json({ ok: true }); // always 200 to prevent Google retries
    }
  }
}

function extractPhone(name) {
  const match = name.match(/phones\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER — routes by ?action=
// ─────────────────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;

  switch (action) {
    case "config":    return handleConfig(req, res);
    case "templates": return handleTemplates(req, res);
    case "send":      return handleSend(req, res);
    case "campaigns": return handleCampaigns(req, res);
    case "inbox":     return handleInbox(req, res);
    case "webhook":   return handleWebhook(req, res);
    default:
      return res.status(400).json({
        error: "Missing or invalid ?action= param.",
        valid_actions: ["config", "templates", "send", "campaigns", "inbox", "webhook"],
      });
  }
};
