const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log("Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Verification failed" });
  }

  if (req.method === "POST") {
    const body = req.body;
    if (body.object !== "whatsapp_business_account")
      return res.status(404).end();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        for (const msg of value.messages || []) {
          await supabase.from("messages").insert([{
            from_number: msg.from,
            body: msg.text?.body || "[media]",
            status: "received",
            direction: "inbound",
            wa_message_id: msg.id,
          }]);
        }

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
