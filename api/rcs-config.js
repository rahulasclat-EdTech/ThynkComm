// api/rcs-config.js
// GET  /api/rcs-config        → returns whether RCS is configured
// POST /api/rcs-config        → validates credentials live against Google RBM API
//
// Required env vars:
//   RCS_AGENT_ID              → Google RBM agent ID  e.g. "thynkcomm-agent@rbm.goog"
//   RCS_SERVICE_ACCOUNT_JSON  → Full Google service account JSON (stringified)
//
// Google RBM docs: https://developers.google.com/business-communications/rcs-business-messaging

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Get Google OAuth2 access token from service account ──────────────────────
async function getGoogleAccessToken(serviceAccountJson) {
  try {
    const sa = typeof serviceAccountJson === "string"
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson;

    const now   = Math.floor(Date.now() / 1000);
    const scope = "https://www.googleapis.com/auth/businessmessages";

    // Build JWT header + claims
    const header = { alg: "RS256", typ: "JWT" };
    const claims = {
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const b64 = (obj) =>
      Buffer.from(JSON.stringify(obj)).toString("base64url");

    const sigInput = `${b64(header)}.${b64(claims)}`;

    // Sign with RSA-SHA256 using Node crypto
    const crypto = require("crypto");
    const privateKey = sa.private_key;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(sigInput);
    const signature = sign.sign(privateKey, "base64url");

    const jwt = `${sigInput}.${signature}`;

    // Exchange JWT for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || "Failed to get access token");
    }
    return tokenData.access_token;
  } catch (err) {
    throw new Error("Google auth failed: " + err.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET: return config status ──────────────────────────────────────────────
  if (req.method === "GET") {
    const agentId = (process.env.RCS_AGENT_ID || "").trim();
    const saJson  = (process.env.RCS_SERVICE_ACCOUNT_JSON || "").trim();

    if (!agentId || !saJson) {
      return res.status(200).json({ configured: false });
    }

    let clientEmail = "";
    try {
      const parsed = JSON.parse(saJson);
      clientEmail = parsed.client_email || "";
    } catch (_) {}

    return res.status(200).json({
      configured:   true,
      agent_id:     agentId,
      client_email: clientEmail,
    });
  }

  // ── POST: validate credentials live ───────────────────────────────────────
  if (req.method === "POST") {
    const { agent_id, service_account_json } = req.body || {};

    if (!agent_id || !service_account_json) {
      return res.status(400).json({ error: "Provide agent_id and service_account_json" });
    }

    try {
      const token = await getGoogleAccessToken(service_account_json);

      // Test: get agent info from RBM API
      const testRes = await fetch(
        `https://rcsbusinessmessaging.googleapis.com/v1/rbm-agent/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const testData = await testRes.json();

      if (!testRes.ok) {
        return res.status(400).json({
          error: testData.error?.message || "RBM API error",
          hint:  "Check your service account has roles/rcsbusinessmessaging.agentOwner permission",
          raw:   testData,
        });
      }

      return res.status(200).json({
        valid:      true,
        agent_name: testData.displayName || agent_id,
        raw:        testData,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// Export the getGoogleAccessToken helper for use in other RCS API files
module.exports.getGoogleAccessToken = getGoogleAccessToken;
