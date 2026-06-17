// api/rcs-webhook.js
// POST /api/rcs-webhook
//
// Receives inbound RCS events from Google RBM:
//   - User reply messages
//   - Delivery receipts (delivered, read, failed)
//   - Suggestion postback events
//
// Setup:
//   1. In Google Business Communications Developer Console → your agent
//   2. Set webhook URL to: https://<your-vercel-domain>/api/rcs-webhook
//   3. Set webhook token: must match RCS_WEBHOOK_TOKEN env var
//
// Google verifies the webhook with a GET request containing a
// "secret" query param that must match RCS_WEBHOOK_TOKEN.

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET: Google webhook verification ─────────────────────────────────────
  if (req.method === "GET") {
    const { secret } = req.query;
    const expected   = (process.env.RCS_WEBHOOK_TOKEN || "").trim();

    if (!expected) {
      console.error("RCS_WEBHOOK_TOKEN not set in environment variables.");
      return res.status(500).send("Webhook token not configured.");
    }

    if (secret !== expected) {
      console.warn("RCS webhook verification failed — wrong secret.");
      return res.status(403).send("Forbidden");
    }

    // Verification success
    return res.status(200).send(secret);
  }

  // ── POST: incoming RBM event ──────────────────────────────────────────────
  if (req.method === "POST") {
    const event = req.body;
    console.log("RCS webhook event:", JSON.stringify(event, null, 2));

    // Google RBM wraps events in a "message" object
    const msg     = event?.message || event;
    const msgName = msg?.name || ""; // format: "phones/{phone}/agentMessages/{messageId}"

    try {
      // ── 1. Inbound user message ─────────────────────────────────────────
      if (msg?.userMessage || event?.senderPhoneNumber) {
        const phone      = event.senderPhoneNumber || extractPhone(msgName);
        const userMsg    = msg.userMessage;
        const textBody   = userMsg?.text || "";
        const postback   = userMsg?.suggestionResponse?.postbackData || "";
        const body       = textBody || postback || "[unsupported message type]";

        await supabase.from("rcs_messages").insert([{
          to_number:  phone,
          body,
          status:     "received",
          direction:  "inbound",
          message_id: msg.messageId || null,
        }]);

        console.log(`RCS inbound from ${phone}: ${body}`);
        return res.status(200).json({ received: true });
      }

      // ── 2. Delivery receipt ─────────────────────────────────────────────
      if (event?.deliveryReceipt || event?.readReceipt) {
        const receipt     = event.deliveryReceipt || event.readReceipt;
        const msgId       = receipt?.rcsPlatformMessageId || receipt?.messageId;
        const newStatus   = event.deliveryReceipt ? "delivered" : "read";

        if (msgId) {
          await supabase
            .from("rcs_messages")
            .update({ status: newStatus })
            .eq("message_id", msgId);
        }
        return res.status(200).json({ updated: newStatus });
      }

      // ── 3. isTyping / other events — acknowledge silently ───────────────
      return res.status(200).json({ ok: true });

    } catch (err) {
      console.error("RCS webhook handler error:", err.message);
      // Always return 200 to Google to prevent retries
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// ── Helper: extract phone from RBM resource name ─────────────────────────────
function extractPhone(name) {
  // name format: "phones/+919876543210/agentMessages/..."
  const match = name.match(/phones\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : "unknown";
}
