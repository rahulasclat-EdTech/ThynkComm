// api/submit-template.js
// POST /api/submit-template
// Submits a WhatsApp message template to Meta Graph API for approval.
// Proxies the request server-side so the token is never exposed to the browser
// and Meta's CORS / origin restrictions are bypassed.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Credentials: prefer headers sent by frontend, fall back to env vars
  const token  = (req.headers["x-wa-token"]   || process.env.WHATSAPP_TOKEN  || "").trim();
  const wabaId = (req.headers["x-wa-waba-id"] || process.env.WABA_ID         || "").trim();

  if (!token || !wabaId) {
    return res.status(400).json({
      error: "WhatsApp credentials missing. Add Token and WABA ID in the WhatsApp Account page.",
    });
  }

  // Body contains the template payload built by the frontend
  const payload = req.body;
  if (!payload || !payload.name) {
    return res.status(400).json({ error: "Invalid template payload." });
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/message_templates`;

    const r = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();

    if (!r.ok) {
      // Forward the full Meta error so the frontend can display it
      return res.status(400).json({
        error:    data?.error?.message  || "Submission failed",
        code:     data?.error?.code,
        subcode:  data?.error?.error_subcode,
        type:     data?.error?.type,
        metaError: data?.error,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
