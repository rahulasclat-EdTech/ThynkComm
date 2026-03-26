// api/live-chat.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "myverifytoken123";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ─── WEBHOOK VERIFICATION (Meta GET challenge) ───────────────
  if (req.method === "GET" && req.query["hub.mode"]) {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[webhook] Verified successfully");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification failed" });
  }

  // ─── LIST CONVERSATIONS OR MESSAGES (frontend GET) ───────────
  if (req.method === "GET") {
    const phone = req.query.phone;

    // Single thread — fetch all messages for a phone number
    if (phone) {
      const decodedPhone = decodeURIComponent(phone);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`from_number.eq.${decodedPhone},to_number.eq.${decodedPhone}`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) return res.status(500).json({ error: error.message });

      const normalised = (data || []).map(msg => ({
        ...msg,
        direction: msg.direction || (msg.from_number === decodedPhone ? "inbound" : "outbound"),
      }));
      return res.status(200).json(normalised);
    }

    // All conversations — group by phone, return latest message per contact
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[live-chat] Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const convMap = {};
    for (const msg of data || []) {
      const dir       = msg.direction || (msg.from_number ? "inbound" : "outbound");
      const userPhone = dir === "inbound" ? msg.from_number : msg.to_number;
      if (!userPhone) continue;

      if (!convMap[userPhone]) {
        convMap[userPhone] = {
          phone:        userPhone,
          lastMsg:      msg.body,
          lastTime:     msg.created_at,
          direction:    dir,
          unread:       0,
          totalMsgs:    0,
          contact_name: msg.contact_name || null,
        };
      }
      convMap[userPhone].totalMsgs++;
      if (dir === "inbound" && msg.status !== "read") {
        convMap[userPhone].unread++;
      }
    }

    const conversations = Object.values(convMap).sort(
      (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
    );

    return res.status(200).json(conversations);
  }

  // ─── OUTBOUND SEND (frontend POST) ───────────────────────────
  if (req.method === "POST") {
    // Detect if this is a Meta webhook event (has "object" field)
    // Meta sends webhook as POST to this same URL
    if (req.body && req.body.object === "whatsapp_business_account") {
      return handleWebhookEvent(req, res);
    }

    // Otherwise it's a manual send from the frontend
    const { to, message, templateName, languageCode, replyType } = req.body;
    if (!to) return res.status(400).json({ error: "to is required" });

    const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
    const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
    if (!token || !phoneId)
      return res.status(400).json({ error: "WhatsApp credentials missing." });

    let payload;
    if (replyType === "template" && templateName) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: templateName, language: { code: languageCode || "en_US" } },
      };
    } else {
      if (!message) return res.status(400).json({ error: "message is required" });
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      };
    }

    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) return res.status(400).json({ error: data.error?.message || "Send failed" });

      // Save outbound message to Supabase
      await supabase.from("messages").insert([{
        to_number:     to,
        body:          message || `[template: ${templateName}]`,
        status:        "sent",
        direction:     "outbound",
        wa_message_id: data.messages?.[0]?.id,
        created_at:    new Date().toISOString(),
      }]);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
};

// ─── HANDLE INCOMING META WEBHOOK EVENTS ─────────────────────────
async function handleWebhookEvent(req, res) {
  try {
    const body = req.body;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // ── Incoming messages ──────────────────────────────────
        for (const msg of value.messages || []) {
          const fromNumber = msg.from;               // sender's phone (no +)
          const waMessageId = msg.id;
          const timestamp   = new Date(parseInt(msg.timestamp) * 1000).toISOString();

          // Resolve display name from contacts array in webhook payload
          const contacts     = value.contacts || [];
          const contactEntry = contacts.find(c => c.wa_id === fromNumber);
          const contactName  = contactEntry?.profile?.name || null;

          // Extract message body based on type
          let body = "";
          if (msg.type === "text") {
            body = msg.text?.body || "";
          } else if (msg.type === "image") {
            body = "[Image received]";
          } else if (msg.type === "audio") {
            body = "[Audio received]";
          } else if (msg.type === "video") {
            body = "[Video received]";
          } else if (msg.type === "document") {
            body = `[Document: ${msg.document?.filename || "file"}]`;
          } else if (msg.type === "location") {
            body = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
          } else if (msg.type === "sticker") {
            body = "[Sticker received]";
          } else if (msg.type === "interactive") {
            body = msg.interactive?.button_reply?.title
              || msg.interactive?.list_reply?.title
              || "[Interactive message]";
          } else {
            body = `[${msg.type} received]`;
          }

          // Upsert: avoid duplicates by wa_message_id
          const { error: upsertError } = await supabase
            .from("messages")
            .upsert(
              [{
                wa_message_id: waMessageId,
                from_number:   fromNumber,
                to_number:     value.metadata?.phone_number_id || null,
                body,
                status:        "received",
                direction:     "inbound",
                contact_name:  contactName,
                created_at:    timestamp,
              }],
              { onConflict: "wa_message_id", ignoreDuplicates: true }
            );

          if (upsertError) {
            console.error("[webhook] upsert error:", upsertError.message);
          } else {
            console.log(`[webhook] Saved inbound message from ${fromNumber}: "${body.slice(0, 60)}"`);
          }
        }

        // ── Delivery / read status updates ─────────────────────
        for (const statusUpdate of value.statuses || []) {
          const { id: waMessageId, status, recipient_id } = statusUpdate;

          // Map Meta status names to our status
          const mappedStatus =
            status === "delivered" ? "delivered" :
            status === "read"      ? "read"      :
            status === "sent"      ? "sent"      :
            status === "failed"    ? "failed"    : status;

          const { error: updateError } = await supabase
            .from("messages")
            .update({ status: mappedStatus })
            .eq("wa_message_id", waMessageId);

          if (updateError) {
            console.error("[webhook] status update error:", updateError.message);
          } else {
            console.log(`[webhook] Updated message ${waMessageId} → ${mappedStatus}`);
          }
        }
      }
    }

    // Meta requires a 200 OK quickly to avoid retries
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhook] handler error:", err.message);
    return res.status(200).json({ status: "ok" }); // still return 200 to stop Meta retries
  }
}
