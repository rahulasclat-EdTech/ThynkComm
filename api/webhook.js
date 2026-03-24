// api/webhook.js
// GET  → Meta webhook verification
// POST → Incoming messages + delivery updates + auto-responder + chatbot

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function sendWhatsApp(to, payload) {
  return fetch(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", to, ...payload }),
    }
  );
}

async function handleAutoResponder(from, msgText) {
  // Fetch active rules from Supabase
  const { data: rules } = await supabase
    .from("auto_responder_rules")
    .select("*")
    .eq("active", true);

  if (!rules || !rules.length) return false;

  const text = msgText.trim().toLowerCase();

  for (const rule of rules) {
    const kw = rule.keyword.toLowerCase();
    const matched =
      rule.match_type === "exact"    ? text === kw :
      rule.match_type === "starts"   ? text.startsWith(kw) :
                                       text.includes(kw); // contains

    if (matched) {
      let payload;
      if (rule.response_type === "template") {
        payload = {
          type: "template",
          template: { name: rule.template_name, language: { code: rule.language_code || "en_US" } },
        };
      } else {
        payload = { type: "text", text: { body: rule.response_text } };
      }

      await sendWhatsApp(from, payload);

      // Log reply
      await supabase.from("messages").insert([{
        to_number: from,
        body: rule.response_text || `[template: ${rule.template_name}]`,
        status: "sent",
        direction: "outbound",
      }]);

      return true; // matched — stop checking further rules
    }
  }
  return false;
}

async function handleChatBot(from, msgText) {
  // Fetch active chatbot flows from Supabase
  const { data: flows } = await supabase
    .from("chatbot_flows")
    .select("*")
    .eq("active", true);

  if (!flows || !flows.length) return false;

  const text = msgText.trim().toLowerCase();

  // Check chatbot sessions — is this user mid-flow?
  const { data: session } = await supabase
    .from("chatbot_sessions")
    .select("*")
    .eq("phone", from)
    .eq("status", "active")
    .single();

  if (session) {
    // Continue existing flow
    const flow = flows.find(f => f.id === session.flow_id);
    if (!flow) {
      await supabase.from("chatbot_sessions").update({ status: "ended" }).eq("id", session.id);
      return false;
    }

    const steps = flow.steps || [];
    const nextStep = steps[session.current_step];

    if (!nextStep) {
      await supabase.from("chatbot_sessions").update({ status: "ended" }).eq("id", session.id);
      return false;
    }

    await sendStepMessage(from, nextStep);

    // Advance or end session
    const newStep = session.current_step + 1;
    if (newStep >= steps.length) {
      await supabase.from("chatbot_sessions").update({ status: "ended", current_step: newStep }).eq("id", session.id);
    } else {
      await supabase.from("chatbot_sessions").update({ current_step: newStep }).eq("id", session.id);
    }
    return true;
  }

  // Check if message triggers any flow
  for (const flow of flows) {
    const triggers = (flow.triggers || "").split(",").map(t => t.trim().toLowerCase());
    if (triggers.some(t => text.includes(t) || text === t)) {
      const steps = flow.steps || [];
      if (!steps.length) continue;

      // Start session
      await supabase.from("chatbot_sessions").insert([{
        phone: from,
        flow_id: flow.id,
        current_step: 1,
        status: "active",
      }]);

      // Send first step
      await sendStepMessage(from, steps[0]);
      return true;
    }
  }

  return false;
}

async function sendStepMessage(to, step) {
  let payload;
  if (step.type === "template") {
    payload = {
      type: "template",
      template: { name: step.templateName, language: { code: step.languageCode || "en_US" } },
    };
  } else {
    payload = { type: "text", text: { body: step.content } };
  }

  const r = await sendWhatsApp(to, payload);

  await supabase.from("messages").insert([{
    to_number: to,
    body: step.content || `[template: ${step.templateName}]`,
    status: r.ok ? "sent" : "failed",
    direction: "outbound",
  }]);
}

module.exports = async function handler(req, res) {
  // GET — Meta webhook verification
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

  // POST — incoming messages & delivery status
  if (req.method === "POST") {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return res.status(404).end();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Incoming messages
        for (const msg of value.messages || []) {
          const from    = msg.from;
          const msgText = msg.text?.body || "";
          const msgType = msg.type;

          // Save inbound message
          await supabase.from("messages").insert([{
            from_number: from,
            body: msgText || `[${msgType}]`,
            status: "received",
            direction: "inbound",
            wa_message_id: msg.id,
          }]);

          // Only process text messages for auto-responder / chatbot
          if (msgType === "text" && msgText) {
            // 1. Try chatbot first
            const handledByChatbot = await handleChatBot(from, msgText);

            // 2. If no chatbot matched, try auto-responder
            if (!handledByChatbot) {
              await handleAutoResponder(from, msgText);
            }
          }
        }

        // Delivery status updates
        for (const status of value.statuses || []) {
          await supabase
            .from("messages")
            .update({ status: status.status })
            .eq("wa_message_id", status.id);
        }
      }
    }

    return res.status(200).end();
  }

  res.status(405).end();
};
