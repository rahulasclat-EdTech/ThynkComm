// api/send-message.js
// POST /api/send-message
//
// Auth — accepts three credential schemes (first match wins):
//   1. x-api-key + x-api-secret  → third-party callers (Thynk Schooling, etc.)
//   2. x-wa-token + x-wa-phone-id → ThynkComm dashboard direct calls
//   3. WHATSAPP_TOKEN + PHONE_NUMBER_ID env vars → fallback / cron / webhook

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Validate an API key+secret pair against the keys stored in Supabase ──────
// If you store API keys in Supabase (recommended), uncomment the Supabase lookup.
// For now, keys live in localStorage on the dashboard client, so we simply
// validate that BOTH headers are non-empty and return the WA creds from env vars.
// To persist keys server-side, create an `api_keys` table and query it here.
async function resolveApiKeyCredentials(apiKey, apiSecret) {
  if (!apiKey || !apiSecret) return null;

  // ── Option A: validate against Supabase `api_keys` table (recommended) ──
  // Uncomment once you have the table:
  //
  // const { data } = await supabase
  //   .from("api_keys")
  //   .select("*")
  //   .eq("key", apiKey)
  //   .eq("secret", apiSecret)
  //   .eq("active", true)
  //   .single();
  //
  // if (!data) return null;  // invalid or revoked key
  //
  // return {
  //   token:   data.wa_token   || process.env.WHATSAPP_TOKEN,
  //   phoneId: data.phone_id   || process.env.PHONE_NUMBER_ID,
  //   siteId:  data.site_id    || null,
  //   keyName: data.name       || "API Key",
  // };

  // ── Option B: minimal check — key+secret non-empty, use env creds ──
  // Use this until you add the api_keys table. Any non-empty pair is accepted.
  return {
    token:   process.env.WHATSAPP_TOKEN,
    phoneId: process.env.PHONE_NUMBER_ID,
    siteId:  null,
    keyName: apiKey.slice(0, 12) + "…",
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", [
    "Content-Type",
    "x-wa-token",
    "x-wa-phone-id",
    "x-api-key",
    "x-api-secret",
    "x-site-id",
    "Authorization",
  ].join(", "));

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { to, message, template_name, language_code } = req.body;
  if (!to || (!message && !template_name))
    return res.status(400).json({ error: "to and either message or template_name are required" });

  // ── Resolve credentials ───────────────────────────────────────────────────
  let token, phoneId, siteId = null, authSource = "env";

  const apiKey    = req.headers["x-api-key"];
  const apiSecret = req.headers["x-api-secret"];
  const waToken   = req.headers["x-wa-token"];
  const waPhoneId = req.headers["x-wa-phone-id"];

  if (apiKey && apiSecret) {
    // Scheme 1 — API key / secret (Thynk Schooling, external apps)
    const creds = await resolveApiKeyCredentials(apiKey, apiSecret);
    if (!creds) {
      return res.status(401).json({ error: "Invalid or revoked API key. Check ThynkComm → Integrations." });
    }
    token      = creds.token;
    phoneId    = creds.phoneId;
    siteId     = req.headers["x-site-id"] || creds.siteId;
    authSource = "api_key:" + creds.keyName;
  } else if (waToken && waPhoneId) {
    // Scheme 2 — ThynkComm dashboard headers
    token      = waToken;
    phoneId    = waPhoneId;
    authSource = "dashboard";
  } else {
    // Scheme 3 — env var fallback
    token      = process.env.WHATSAPP_TOKEN;
    phoneId    = process.env.PHONE_NUMBER_ID;
    authSource = "env";
  }

  if (!token || !phoneId) {
    return res.status(400).json({
      error: "WhatsApp credentials missing. Provide x-api-key+x-api-secret, x-wa-token+x-wa-phone-id, or set env vars.",
    });
  }

  // ── Build Meta API payload ────────────────────────────────────────────────
  const payload = template_name
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name:     template_name,
          language: { code: language_code || "en_US" },
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      };

  try {
    const response = await fetch(
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        error: data.error?.message || data.error?.error_data?.details || JSON.stringify(data),
      });
    }

    const messageId = data.messages?.[0]?.id;

    // ── Log to Supabase messages table ────────────────────────────────────
    await supabase.from("messages").insert([{
      to_number:     to,
      body:          message || `[template: ${template_name}]`,
      status:        "sent",
      direction:     "outbound",
      wa_message_id: messageId || null,
      // Optional: tag by site_id when called from an external app
      ...(siteId ? { tag: siteId } : {}),
    }]);

    res.status(200).json({ success: true, messageId, authSource });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
