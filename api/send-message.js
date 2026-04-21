// api/send-message.js
// POST /api/send-message
//
// Auth — three credential schemes (first match wins):
//   1. x-api-key + x-api-secret  → third-party callers (Thynk Schooling, etc.)
//   2. x-wa-token + x-wa-phone-id → ThynkComm dashboard direct calls
//   3. WHATSAPP_TOKEN + PHONE_NUMBER_ID env vars → cron / webhook fallback

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Phone number normaliser ───────────────────────────────────────────────────
function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

// ── Resolve API key credentials ───────────────────────────────────────────────
async function resolveApiKeyCredentials(apiKey, apiSecret) {
  if (!apiKey || !apiSecret) return null;
  const token   = (process.env.WHATSAPP_TOKEN  || "").trim();
  const phoneId = (process.env.PHONE_NUMBER_ID || "").trim();
  if (!token || !phoneId) return null;
  return { token, phoneId, siteId: null, keyName: apiKey.slice(0, 12) + "…" };
}

// ── Meta error code → human-readable fix hint ─────────────────────────────────
function resolveMetaErrorHint(code, message) {
  const msg = (message || "").toLowerCase();
  if (code === 131026 || msg.includes("not in allowed"))
    return "Your Meta app is in DEVELOPMENT mode. Add this number as a test number in Meta → WhatsApp → API Setup → Test Numbers, OR switch your app to LIVE mode in App Review.";
  if (code === 131047 || msg.includes("24 hour") || msg.includes("outside"))
    return "Free-form text can only be sent within a 24-hour customer-initiated window. Use an approved Template for first-contact sends.";
  if (code === 131030 || msg.includes("recipient"))
    return "The recipient number is not registered on WhatsApp, or they have blocked your business.";
  if (code === 190 || msg.includes("token") || msg.includes("oauth"))
    return "Access Token invalid or expired. Use a permanent System User token from Meta Business Suite → Business Settings → System Users.";
  if (code === 100 || msg.includes("phone_number_id"))
    return "Wrong PHONE_NUMBER_ID. Find the correct one in Meta Developer Console → WhatsApp → API Setup.";
  if (code === 131048 || msg.includes("spam") || msg.includes("quality"))
    return "Phone number quality flagged. Check Meta Business Manager → Phone Numbers → Quality Rating.";
  if (code === 132000 || msg.includes("number of parameters") || msg.includes("localizable_params"))
    return "Template parameter count mismatch. The number of values in 'components[].parameters' must exactly match the number of {{1}},{{2}},… placeholders in your approved Meta template body.";
  if (msg.includes("permission") || code === 200)
    return "Token missing whatsapp_business_messaging permission. Re-generate token with correct permissions.";
  return "Check Meta Developer Console for full error details: developers.facebook.com";
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",
    "Content-Type, x-wa-token, x-wa-phone-id, x-api-key, x-api-secret, x-site-id, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ── FIX: also accept template_params (array of string values for {{1}},{{2}}…)
  const { to, message, template_name, language_code, template_params } = req.body || {};

  // ── Validate & normalise phone number ─────────────────────────────────────
  const toNorm = normalisePhone(to);
  if (!toNorm) {
    return res.status(400).json({
      error: `Invalid phone number "${to}".`,
      hint:  "Use full international format without + (e.g. 919876543210 for India). 10-digit Indian numbers are accepted and auto-prefixed with 91.",
    });
  }

  if (!message && !template_name) {
    return res.status(400).json({ error: "Provide either message (plain text) or template_name." });
  }

  // ── Resolve credentials ───────────────────────────────────────────────────
  let token, phoneId, siteId = null, authSource = "env";

  const apiKey    = (req.headers["x-api-key"]     || "").trim();
  const apiSecret = (req.headers["x-api-secret"]  || "").trim();
  const waToken   = (req.headers["x-wa-token"]    || "").trim();
  const waPhoneId = (req.headers["x-wa-phone-id"] || "").trim();

  if (apiKey && apiSecret) {
    const creds = await resolveApiKeyCredentials(apiKey, apiSecret);
    if (!creds) {
      return res.status(401).json({
        error: "Invalid API key / secret, or WHATSAPP_TOKEN / PHONE_NUMBER_ID are not set in Vercel environment variables.",
        hint:  "ThynkComm → Vercel Dashboard → Settings → Environment Variables → add WHATSAPP_TOKEN and PHONE_NUMBER_ID.",
      });
    }
    token = creds.token; phoneId = creds.phoneId;
    siteId = (req.headers["x-site-id"] || "").trim() || creds.siteId;
    authSource = "api_key:" + creds.keyName;
  } else if (waToken && waPhoneId) {
    token = waToken; phoneId = waPhoneId; authSource = "dashboard";
  } else {
    token   = (process.env.WHATSAPP_TOKEN  || "").trim();
    phoneId = (process.env.PHONE_NUMBER_ID || "").trim();
    authSource = "env";
  }

  if (!token || !phoneId) {
    return res.status(400).json({
      error:      "WhatsApp credentials missing.",
      authSource,
      hint:       "Send x-api-key+x-api-secret headers, or x-wa-token+x-wa-phone-id, or set WHATSAPP_TOKEN+PHONE_NUMBER_ID in Vercel env vars.",
    });
  }

  // ── Build Meta payload ────────────────────────────────────────────────────
  let metaPayload;

  if (template_name) {
    // Build components array from template_params if provided.
    // template_params: string[] — values for {{1}}, {{2}}, {{3}}, … in order.
    // e.g. ["Rahul Shrivastav", "N R School", "Thynk Success 2025", "8800903318"]
    const components = [];
    if (Array.isArray(template_params) && template_params.length > 0) {
      components.push({
        type: "body",
        parameters: template_params.map(val => ({
          type: "text",
          text: String(val),
        })),
      });
    }

    metaPayload = {
      messaging_product: "whatsapp",
      to: toNorm,
      type: "template",
      template: {
        name: template_name,
        language: { code: language_code || "en_US" },
        // Only include components if we have params — avoids 132000 error
        // when template has no variables
        ...(components.length > 0 ? { components } : {}),
      },
    };
  } else {
    metaPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toNorm,
      type: "text",
      text: { preview_url: false, body: message },
    };
  }

  // ── Call Meta Graph API ───────────────────────────────────────────────────
  let metaResponse, metaData;
  try {
    metaResponse = await fetch(
      `https://graph.facebook.com/v25.0/${phoneId}/messages`,
      {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(metaPayload),
      }
    );
    metaData = await metaResponse.json();
  } catch (networkErr) {
    return res.status(502).json({ error: "Network error reaching Meta API: " + networkErr.message });
  }

  // ── Handle Meta errors ────────────────────────────────────────────────────
  if (!metaResponse.ok) {
    const metaErr = metaData?.error || {};
    return res.status(400).json({
      error:        metaErr.message || "Meta API error",
      meta_code:    metaErr.code,
      meta_type:    metaErr.type,
      meta_fbtrace: metaErr.fbtrace_id,
      hint:         resolveMetaErrorHint(metaErr.code, metaErr.message),
      raw:          metaData,
    });
  }

  // ── Meta accepted the message ─────────────────────────────────────────────
  const messageId = metaData.messages?.[0]?.id || null;
  const waId      = metaData.contacts?.[0]?.wa_id || toNorm;

  try {
    await supabase.from("messages").insert([{
      to_number:     toNorm,
      body:          message || `[template: ${template_name}]`,
      status:        "sent",
      direction:     "outbound",
      wa_message_id: messageId,
      source:        authSource === "dashboard" ? "portal" : "api",
      template_name: template_name || null,
      ...(siteId ? { tag: siteId } : {}),
    }]);
  } catch (dbErr) {
    console.error("Supabase insert error:", dbErr.message);
  }

  return res.status(200).json({
    success:    true,
    messageId,
    waId,
    toNorm,
    authSource,
    warning: !template_name
      ? "Text messages are only deliverable within a 24-hour customer-initiated conversation window. For first-contact outreach, use an approved Template."
      : undefined,
  });
};
