const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { name, contactIds, message, templateName, languageCode } = req.body;
    if (!name || !contactIds?.length)
      return res.status(400).json({ error: "name and contactIds are required" });

    const { data: contacts, error: cErr } = await supabase
      .from("contacts")
      .select("*")
      .in("id", contactIds)
      .eq("opt_in", true);

    if (cErr) return res.status(500).json({ error: cErr.message });
    if (!contacts.length)
      return res.status(400).json({ error: "No opted-in contacts found" });

    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert([{ name, status: "Running", total: contacts.length, sent: 0, delivered: 0, failed: 0 }])
      .select()
      .single();

    if (campErr) return res.status(500).json({ error: campErr.message });

    let sent = 0, failed = 0;
    for (const contact of contacts) {
      try {
        const payload = templateName
          ? {
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "template",
              template: { name: templateName, language: { code: languageCode || "en_US" } },
            }
          : {
              messaging_product: "whatsapp",
              to: contact.phone,
              type: "text",
              text: { body: message },
            };

        const r = await fetch(
          `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const rData = await r.json();

        await supabase.from("messages").insert([{
          to_number: contact.phone,
          body: message || templateName,
          status: r.ok ? "sent" : "failed",
          direction: "outbound",
          wa_message_id: rData.messages?.[0]?.id,
        }]);

        r.ok ? sent++ : failed++;
      } catch {
        failed++;
      }
    }

    await supabase
      .from("campaigns")
      .update({ status: "Completed", sent, failed })
      .eq("id", campaign.id);

    return res.status(200).json({ success: true, sent, failed, campaignId: campaign.id });
  }

  res.status(405).json({ error: "Method not allowed" });
};
