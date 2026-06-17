// api/rcs-send.js
// POST /api/rcs-send
//
// Sends a single RCS message via Google RBM API (Path A — direct, no CPaaS).
//
// Body params:
//   to              string   — phone in E.164 format e.g. "+919876543210"
//   message_type    string   — "text" | "template"
//   text            string   — plain text body (if message_type === "text")
//   template_name   string   — template name (if message_type === "template")
//   template_params object   — key/value pairs for template variables
//   suggestions     array    — optional quick-reply chips [{type:"reply"|"action", text, postbackData, url}]
//
// Env vars required:
//   RCS_AGENT_ID              — Google RBM agent ID
//   RCS_SERVICE_ACCOUNT_JSON  — Stringified service account JSON

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const { getGoogleAccessToken } = require("./rcs-config");

// ── Phone normaliser → E.164 ─────────────────────────────────────────────────
function normalisePhone(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  // If already has + keep it; else prefix based on digit count
  if (!s.startsWith("+")) {
    const digits = s.replace(/\D/g, "");
    if (digits.length === 10) s = "+91" + digits;          // Indian mobile
    else if (digits.length === 12 && digits.startsWith("91")) s = "+" + digits;
    else if (digits.length > 7) s = "+" + digits;
    else return null;
  }
  return s;
}

// ── Build RBM message content ────────────────────────────────────────────────
function buildRbmContent(body) {
  const { message_type, text, template_name, template_params, suggestions } = body;

  let contentMessage = {};

  if (message_type === "text" || (!message_type && text)) {
    // Plain text RCS message
    contentMessage = { text };
  } else if (message_type === "template") {
    // RCS standalone card (rich template) — used for Google-approved templates
    // Google RBM templates are sent as richCards or text with suggestions
    // For approved templates, content is passed as-is through the suggestions system
    contentMessage = {
      text: template_name, // approved template name acts as message content ID
      ...(template_params ? { richCard: buildRichCard(template_params) } : {}),
    };
  }

  // Attach quick-reply / action suggestions if provided
  if (Array.isArray(suggestions) && suggestions.length > 0) {
    contentMessage.suggestions = suggestions.map((s) => {
      if (s.type === "action" && s.url) {
        return {
          action: {
            text: s.text,
            postbackData: s.postbackData || s.text,
            openUrlAction: { url: s.url },
          },
        };
      }
      return {
        reply: {
          text: s.text,
          postbackData: s.postbackData || s.text,
        },
      };
    });
  }

  return contentMessage;
}

// ── Build a standalone rich card from template params ────────────────────────
function buildRichCard(params) {
  return {
    standaloneCard: {
      cardOrientation: "VERTICAL",
      thumbnailImageAlignment: "RIGHT",
      cardContent: {
        title:       params.title       || "",
        description: params.description || "",
        ...(params.image_url
          ? {
              media: {
                height:      "MEDIUM",
                contentInfo: { fileUrl: params.image_url, forceRefresh: false },
              },
            }
          : {}),
        ...(params.buttons && params.buttons.length > 0
          ? {
              suggestions: params.buttons.map((b) => ({
                action: {
                  text:         b.text,
                  postbackData: b.postbackData || b.text,
                  ...(b.url ? { openUrlAction: { url: b.url } } : {}),
                  ...(b.phone ? { dialAction: { phoneNumber: b.phone } } : {}),
                },
              })),
            }
          : {}),
      },
    },
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-rcs-agent-id");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    to, message_type, text, template_name,
    template_params, suggestions,
  } = req.body || {};

  // ── Validate phone ────────────────────────────────────────────────────────
  const phone = normalisePhone(to);
  if (!phone) {
    return res.status(400).json({
      error: `Invalid phone number "${to}".`,
      hint:  "Use E.164 format e.g. +919876543210 or 10-digit Indian number.",
    });
  }

  if (!text && !template_name) {
    return res.status(400).json({ error: "Provide either text or template_name." });
  }

  // ── Load credentials ──────────────────────────────────────────────────────
  const agentId = (process.env.RCS_AGENT_ID || "").trim();
  const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();

  if (!agentId || !saJson) {
    return res.status(400).json({
      error: "RCS not configured.",
      hint:  "Set RCS_AGENT_ID and RCS_SERVICE_ACCOUNT_JSON in Vercel environment variables.",
    });
  }

  // ── Get Google access token ───────────────────────────────────────────────
  let accessToken;
  try {
    accessToken = await getGoogleAccessToken(saJson);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  // ── Build RBM payload ─────────────────────────────────────────────────────
  const contentMessage = buildRbmContent(req.body);
  const messageId      = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const rbmPayload = {
    messageId,
    contentMessage,
  };

  // ── Send via Google RBM API ───────────────────────────────────────────────
  const rbmUrl =
    `https://rcsbusinessmessaging.googleapis.com/v1/phones/${encodeURIComponent(phone)}/agentMessages?messageId=${messageId}`;

  let rbmRes, rbmData;
  try {
    rbmRes = await fetch(rbmUrl, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Goog-User-Project": process.env.GOOGLE_CLOUD_PROJECT || "",
      },
      body: JSON.stringify(rbmPayload),
    });
    rbmData = await rbmRes.json();
  } catch (networkErr) {
    return res.status(502).json({ error: "Network error reaching Google RBM API: " + networkErr.message });
  }

  // ── Handle RBM errors ─────────────────────────────────────────────────────
  if (!rbmRes.ok) {
    const code    = rbmData?.error?.code;
    const message = rbmData?.error?.message || "Google RBM API error";

    let hint = "Check Google Cloud Console for error details.";
    if (code === 404)
      hint = "Device does not support RCS or the phone number is not RCS-enabled. Consider SMS fallback.";
    if (code === 403)
      hint = "Service account lacks permission. Grant roles/rcsbusinessmessaging.agentOwner in Google Cloud IAM.";
    if (code === 429)
      hint = "Rate limit exceeded. Reduce send frequency.";
    if (code === 400)
      hint = "Invalid payload. Check template_params / message structure.";

    // Log failed attempt
    try {
      await supabase.from("rcs_messages").insert([{
        to_number:    phone,
        body:         text || `[template: ${template_name}]`,
        status:       "failed",
        direction:    "outbound",
        message_id:   messageId,
        error_code:   String(code || ""),
        error_msg:    message,
        template_name: template_name || null,
      }]);
    } catch (_) {}

    return res.status(400).json({ error: message, code, hint, raw: rbmData });
  }

  // ── Success — log to Supabase ─────────────────────────────────────────────
  try {
    await supabase.from("rcs_messages").insert([{
      to_number:     phone,
      body:          text || `[template: ${template_name}]`,
      status:        "sent",
      direction:     "outbound",
      message_id:    messageId,
      template_name: template_name || null,
    }]);
  } catch (dbErr) {
    console.error("Supabase insert error:", dbErr.message);
  }

  return res.status(200).json({
    success:    true,
    messageId,
    to:         phone,
    channel:    "rcs",
  });
};
