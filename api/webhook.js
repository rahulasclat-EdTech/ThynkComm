// api/webhook.js
// GET  → Meta webhook verification
// POST → Incoming messages + delivery status updates

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function sendWhatsApp(to, payload) {
  return fetch(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
    }
  );
}

async function handleAutoResponder(from, msgText) {
  const { data: rules } = await supabase
    .from("auto_responder_rules")
    .select("*")
    .eq("active", true);

  if (!rules?.length) return false;
  const text = msgText.trim().toLowerCase();

  for (const rule of rules) {
    const kw = rule.keyword.toLowerCase();
    const matched =
      rule.match_type === "exact"  ? text === kw :
      rule.match_type === "starts" ? text.startsWith(kw) :
                                     text.includes(kw);
    if (matched) {
      const payload = rule.response_type === "template"
        ? {
            type:     "template",
            template: { name: rule.template_name, language: { code: rule.language_code || "en_US" } },
          }
        : { type: "text", text: { body: rule.response_text } };

      await sendWhatsApp(from, payload);
      await supabase.from("messages").insert([{
        to_number:  from,
        body:       rule.response_text || `[template: ${rule.template_name}]`,
        status:     "sent",
        direction:  "outbound",
      }]);
      return true;
    }
  }
  return false;
}

async function handleChatBot(from, msgText) {
  const { data: flows } = await supabase
    .from("chatbot_flows")
    .select("*")
    .eq("active", true);

  if (!flows?.length) return false;

  const text = msgText.trim().toLowerCase();

  const { data: session } = await supabase
    .from("chatbot_sessions")
    .select("*")
    .eq("phone", from)
    .eq("status", "active")
    .maybeSingle();

  // Existing active session — send the next step
  if (session) {
    const flow = flows.find(f => f.id === session.flow_id);
    if (!flow) {
      await supabase.from("chatbot_sessions").update({ status: "ended" }).eq("id", session.id);
      return false;
    }
    const steps    = flow.steps || [];
    const nextStep = steps[session.current_step];
    if (!nextStep) {
      await supabase.from("chatbot_sessions").update({ status: "ended" }).eq("id", session.id);
      return false;
    }
    await sendStepMessage(from, nextStep);
    const newStep = session.current_step + 1;
    if (newStep >= steps.length) {
      await supabase.from("chatbot_sessions")
        .update({ status: "ended", current_step: newStep })
        .eq("id", session.id);
    } else {
      await supabase.from("chatbot_sessions")
        .update({ current_step: newStep })
        .eq("id", session.id);
    }
    return true;
  }

  // No active session — check if this message triggers a flow
  for (const flow of flows) {
    const triggers = (flow.triggers || "").split(",").map(t => t.trim().toLowerCase());
    if (triggers.some(t => text === t || text.includes(t))) {
      const steps = flow.steps || [];
      if (!steps.length) continue;

      // Send step 0 immediately as the trigger response
      await sendStepMessage(from, steps[0]);

      if (steps.length > 1) {
        // Persist session so subsequent messages continue the flow from step 1
        await supabase.from("chatbot_sessions").insert([{
          phone:        from,
          flow_id:      flow.id,
          current_step: 1,
          status:       "active",
        }]);
      }
      return true;
    }
  }
  return false;
}

async function sendStepMessage(to, step) {
  const payload = step.type === "template"
    ? {
        type:     "template",
        template: { name: step.templateName, language: { code: step.languageCode || "en_US" } },
      }
    : { type: "text", text: { body: step.content } };

  const r = await sendWhatsApp(to, payload);
  await supabase.from("messages").insert([{
    to_number:  to,
    body:       step.content || `[template: ${step.templateName}]`,
    status:     r.ok ? "sent" : "failed",
    direction:  "outbound",
  }]);
}

module.exports = async function handler(req, res) {
  // ── GET — Meta webhook verification ────────────────────────────
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log("✅ Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification failed" });
  }

  // ── POST — incoming messages & delivery status ──────────────────
  if (req.method === "POST") {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return res.status(404).end();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Build contact name map from contacts array in webhook payload
        const contactsMap = {};
        for (const contact of value.contacts || []) {
          contactsMap[contact.wa_id] = contact.profile?.name || contact.wa_id;
        }

        // Inbound messages
        for (const msg of value.messages || []) {
          const from       = msg.from;
          const msgText    = msg.text?.body || "";
          const msgType    = msg.type;
          const senderName = contactsMap[from] || from;

          await supabase.from("messages").insert([{
            from_number:   from,
            contact_name:  senderName,
            body:          msgText || `[${msgType}]`,
            status:        "received",
            direction:     "inbound",
            wa_message_id: msg.id,
          }]);

          // Only run auto-responder/chatbot for text messages
          if (msgType === "text" && msgText) {
            const handledByChatbot = await handleChatBot(from, msgText);
            if (!handledByChatbot) await handleAutoResponder(from, msgText);
          }
        }

        // Delivery / read status updates
        for (const status of value.statuses || []) {
          console.log(`[webhook] Status update: ${status.id} → ${status.status}`);

          // Update the message row status by wa_message_id
          const updateFields = { status: status.status };
          if (status.errors?.[0]?.code)    updateFields.error_code   = String(status.errors[0].code);
          if (status.errors?.[0]?.message) updateFields.error_detail = status.errors[0].message;

          const { data: updatedMsg, error: updateErr } = await supabase
            .from("messages")
            .update(updateFields)
            .eq("wa_message_id", status.id)
            .select("campaign_id, id")
            .maybeSingle();

          if (updateErr) console.error(`[webhook] Message update failed: ${updateErr.message}`);
          if (!updatedMsg) console.warn(`[webhook] No message found for wa_message_id=${status.id}`);

          // Update campaign delivered/read count directly (no RPC needed)
          if (updatedMsg?.campaign_id) {
            if (status.status === "delivered") {
              // Use a direct increment via SQL expression
              const { data: camp } = await supabase
                .from("campaigns")
                .select("delivered")
                .eq("id", updatedMsg.campaign_id)
                .single();
              if (camp !== null) {
                await supabase.from("campaigns")
                  .update({ delivered: (camp.delivered || 0) + 1 })
                  .eq("id", updatedMsg.campaign_id);
              }
            }
            if (status.status === "read") {
              const { data: camp } = await supabase
                .from("campaigns")
                .select("read")
                .eq("id", updatedMsg.campaign_id)
                .single();
              if (camp !== null) {
                await supabase.from("campaigns")
                  .update({ read: (camp.read || 0) + 1 })
                  .eq("id", updatedMsg.campaign_id);
              }
            }
          }
        }
      }
    }
    return res.status(200).end();
  }

  res.status(405).end();
};
