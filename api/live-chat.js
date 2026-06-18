// api/live-chat.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "myverifytoken123";

// ── Phone number normaliser ──────────────────────────────────────────────────
// Keeps conversations from splitting when the same contact appears as
// "9876543210" (10-digit) vs "919876543210" (12-digit with country code).
function normalisePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10 && digits[0] !== "0") digits = "91" + digits;
  if (digits.length === 11 && digits[0] === "0") digits = "91" + digits.slice(1);
  if (digits.length < 10 || digits.length > 15) return raw; // return as-is if unrecognisable
  return digits;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ─── WEBHOOK VERIFICATION (Meta GET challenge) ────────────────
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

  // ─── LIST CONVERSATIONS OR MESSAGES (frontend GET) ────────────
  if (req.method === "GET") {
    const rawPhone = req.query.phone;

    // ── Single thread ─────────────────────────────────────────────
    if (rawPhone) {
      const phone = normalisePhone(decodeURIComponent(rawPhone)) || decodeURIComponent(rawPhone);

      // FIX: inbound messages store the customer number in from_number.
      //      to_number on inbound rows is now null (see webhook handler below).
      //      We match inbound by from_number and outbound by to_number.
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`from_number.eq.${phone},to_number.eq.${phone}`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) return res.status(500).json({ error: error.message });

      const normalised = (data || []).map(msg => ({
        ...msg,
        direction: msg.direction || (msg.from_number === phone ? "inbound" : "outbound"),
      }));
      return res.status(200).json(normalised);
    }

    // ── All conversations — one entry per contact phone ───────────
    // FIX: increased limit from 5000 → 10000 so busy accounts don't silently
    //      lose older conversations.
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      console.error("[live-chat] Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const convMap = {};
    for (const msg of data || []) {
      const dir = msg.direction || (msg.from_number ? "inbound" : "outbound");

      // FIX: derive and normalise the customer's phone regardless of direction.
      //      Inbound  → customer is from_number.
      //      Outbound → customer is to_number.
      //      Normalising merges 10-digit and 12-digit variants into one thread.
      const rawUserPhone = dir === "inbound" ? msg.from_number : msg.to_number;
      const userPhone    = normalisePhone(rawUserPhone) || rawUserPhone;
      if (!userPhone) continue;

      if (!convMap[userPhone]) {
        convMap[userPhone] = {
          phone:        userPhone,
          lastMsg:      msg.body,
          lastTime:     msg.created_at,
          direction:    dir,
          unread:       0,
          totalMsgs:    0,
          // Seed contact_name; may be null for outbound-first conversations —
          // filled in below as we encounter inbound messages for the same phone.
          contact_name: msg.contact_name || null,
        };
      } else {
        // FIX: keep looking for a non-null contact_name as we iterate older
        //      messages.  This means an inbound message's name always wins over
        //      an outbound (API/campaign) row that has contact_name=null.
        if (!convMap[userPhone].contact_name && msg.contact_name) {
          convMap[userPhone].contact_name = msg.contact_name;
        }
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

  // ─── OUTBOUND SEND (frontend POST from Live Chat panel) ────────
  if (req.method === "POST") {
    // Detect if this is a Meta webhook event (has "object" field)
    if (req.body && req.body.object === "whatsapp_business_account") {
      return handleWebhookEvent(req, res);
    }

    const { to, message, templateName, languageCode, replyType } = req.body;
    if (!to) return res.status(400).json({ error: "to is required" });

    // FIX: normalise destination phone for consistent storage.
    const toNorm = normalisePhone(to) || to;

    const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
    const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
    if (!token || !phoneId)
      return res.status(400).json({ error: "WhatsApp credentials missing." });

    let payload;
    if (replyType === "template" && templateName) {
      payload = {
        messaging_product: "whatsapp",
        to: toNorm,
        type: "template",
        template: { name: templateName, language: { code: languageCode || "en_US" } },
      };
    } else {
      if (!message) return res.status(400).json({ error: "message is required" });
      payload = {
        messaging_product: "whatsapp",
        to: toNorm,
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

      // FIX: save normalised to_number + source="portal" so Message Log and
      //      Live Chat can distinguish dashboard replies from API calls.
      await supabase.from("messages").insert([{
        to_number:     toNorm,
        body:          message || `[template: ${templateName}]`,
        template_name: templateName || null,
        status:        "sent",
        direction:     "outbound",
        source:        "portal",
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

// ─── HANDLE INCOMING META WEBHOOK EVENTS ─────────────────────────────────────
async function handleWebhookEvent(req, res) {
  try {
    const body = req.body;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // ── Incoming messages ──────────────────────────────────
        for (const msg of value.messages || []) {
          // FIX: normalise sender phone so it always matches to_number stored
          //      on outbound messages for the same contact.
          const fromNumber  = normalisePhone(msg.from) || msg.from;
          const waMessageId = msg.id;
          const timestamp   = new Date(parseInt(msg.timestamp) * 1000).toISOString();

          const contacts     = value.contacts || [];
          const contactEntry = contacts.find(c => c.wa_id === msg.from);
          const contactName  = contactEntry?.profile?.name || null;

          let msgBody = "";
          if (msg.type === "text") {
            msgBody = msg.text?.body || "";
          } else if (msg.type === "image") {
            msgBody = "[Image received]";
          } else if (msg.type === "audio") {
            msgBody = "[Audio received]";
          } else if (msg.type === "video") {
            msgBody = "[Video received]";
          } else if (msg.type === "document") {
            msgBody = `[Document: ${msg.document?.filename || "file"}]`;
          } else if (msg.type === "location") {
            msgBody = `[Location: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
          } else if (msg.type === "sticker") {
            msgBody = "[Sticker received]";
          } else if (msg.type === "interactive") {
            msgBody = msg.interactive?.button_reply?.title
              || msg.interactive?.list_reply?.title
              || "[Interactive message]";
          } else {
            msgBody = `[${msg.type} received]`;
          }

          // FIX: store from_number as the normalised customer phone.
          //      to_number is intentionally null for inbound rows — storing
          //      the Meta phone_number_id there was causing thread queries
          //      (which filter on the customer's phone) to miss inbound messages.
          const { error: upsertError } = await supabase
            .from("messages")
            .upsert(
              [{
                wa_message_id: waMessageId,
                from_number:   fromNumber,
                to_number:     null,
                body:          msgBody,
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
            console.log(`[webhook] Saved inbound from ${fromNumber}: "${msgBody.slice(0, 60)}"`);
          }

          // FIX: backfill contact_name on existing outbound messages for this
          //      phone that were sent before the customer ever replied, so the
          //      conversation list shows the real name straight away.
          if (contactName) {
            await supabase
              .from("messages")
              .update({ contact_name: contactName })
              .eq("to_number", fromNumber)
              .is("contact_name", null);
          }
        }

        // ── Delivery / read status updates ─────────────────────
        for (const statusUpdate of value.statuses || []) {
          const { id: waMessageId, status } = statusUpdate;

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
            console.log(`[webhook] Updated ${waMessageId} → ${mappedStatus}`);
          }
        }
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[webhook] handler error:", err.message);
    return res.status(200).json({ status: "ok" });
  }
}
