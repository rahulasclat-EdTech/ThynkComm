// api/live-chat.js
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const phone = req.query.phone;

    // Single thread
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

    // All conversations
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[live-chat] Supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[live-chat] rows from Supabase: ${(data||[]).length}`);

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

    console.log(`[live-chat] conversations returned: ${conversations.length}`);
    return res.status(200).json(conversations);
  }

  if (req.method === "POST") {
    const { to, message, templateName, languageCode, replyType } = req.body;
    if (!to) return res.status(400).json({ error: "to is required" });

    const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
    const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
    if (!token || !phoneId)
      return res.status(400).json({ error: "WhatsApp credentials missing." });

    let payload;
    if (replyType === "template" && templateName) {
      payload = { messaging_product:"whatsapp", to, type:"template",
        template: { name:templateName, language:{ code:languageCode||"en_US" } } };
    } else {
      if (!message) return res.status(400).json({ error: "message is required" });
      payload = { messaging_product:"whatsapp", to, type:"text", text:{ body:message } };
    }

    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) return res.status(400).json({ error: data.error?.message || "Send failed" });

      await supabase.from("messages").insert([{
        to_number:     to,
        body:          message || `[template: ${templateName}]`,
        status:        "sent",
        direction:     "outbound",
        wa_message_id: data.messages?.[0]?.id,
      }]);

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
};
