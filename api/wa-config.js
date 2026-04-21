// api/wa-config.js
// GET /api/wa-config
// Returns WhatsApp credentials from env vars to the frontend.
// This eliminates the need to re-enter credentials after every cache clear.

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token   = (process.env.WHATSAPP_TOKEN  || "").trim();
  const phoneId = (process.env.PHONE_NUMBER_ID || "").trim();
  const wabaId  = (process.env.WABA_ID         || "").trim();

  // Only return if all 3 are configured
  if (!token || !phoneId || !wabaId) {
    return res.status(200).json({ configured: false });
  }

  return res.status(200).json({
    configured: true,
    token,
    phone_number_id: phoneId,
    waba_id: wabaId,
  });
};
