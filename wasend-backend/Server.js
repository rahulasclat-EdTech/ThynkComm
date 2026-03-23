import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  WEBHOOK_VERIFY_TOKEN = "myverifytoken123",
} = process.env;

const WA_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

const headers = {
  Authorization: `Bearer ${WHATSAPP_TOKEN}`,
  "Content-Type": "application/json",
};

// ─── IN-MEMORY STORE (replace with Supabase later) ───────────────
let contacts = [
  { id: 1, name: "Test User", phone: "919999999999", tag: "Lead", optIn: true },
];
let campaigns = [];
let messages = [];

// ─── HEALTH CHECK ─────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "WASend backend running ✅" }));

// ─── SEND SINGLE MESSAGE ──────────────────────────────────────────
// POST /api/send-message
// Body: { to: "919999999999", message: "Hello!" }
app.post("/api/send-message", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message)
    return res.status(400).json({ error: "to and message are required" });

  try {
    const response = await axios.post(
      WA_URL,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      { headers }
    );

    const log = {
      id: Date.now(),
      to,
      message,
      status: "sent",
      waMessageId: response.data.messages?.[0]?.id,
      timestamp: new Date().toISOString(),
    };
    messages.push(log);

    res.json({ success: true, data: log });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ─── SEND TEMPLATE MESSAGE ────────────────────────────────────────
// POST /api/send-template
// Body: { to: "919999999999", templateName: "hello_world", languageCode: "en_US" }
app.post("/api/send-template", async (req, res) => {
  const { to, templateName, languageCode = "en_US", components = [] } = req.body;
  if (!to || !templateName)
    return res.status(400).json({ error: "to and templateName are required" });

  try {
    const response = await axios.post(
      WA_URL,
      {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      { headers }
    );

    res.json({ success: true, data: response.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// ─── BULK CAMPAIGN ────────────────────────────────────────────────
// POST /api/send-campaign
// Body: { name: "My Campaign", contactIds: [1,2], message: "Hi!" }
app.post("/api/send-campaign", async (req, res) => {
  const { name, contactIds, message, templateName, languageCode } = req.body;
  if (!name || !contactIds?.length)
    return res.status(400).json({ error: "name and contactIds are required" });

  const targets = contacts.filter((c) => contactIds.includes(c.id) && c.optIn);
  if (!targets.length)
    return res.status(400).json({ error: "No opted-in contacts found" });

  const campaign = {
    id: Date.now(),
    name,
    status: "Running",
    total: targets.length,
    sent: 0,
    delivered: 0,
    failed: 0,
    date: new Date().toISOString().split("T")[0],
    results: [],
  };
  campaigns.push(campaign);

  // Send to each contact (with 500ms delay to avoid rate limits)
  for (const contact of targets) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      let payload;
      if (templateName) {
        payload = {
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "template",
          template: { name: templateName, language: { code: languageCode || "en_US" } },
        };
      } else {
        payload = {
          messaging_product: "whatsapp",
          to: contact.phone,
          type: "text",
          text: { body: message },
        };
      }

      const r = await axios.post(WA_URL, payload, { headers });
      campaign.sent++;
      campaign.results.push({ contact: contact.name, status: "sent", id: r.data.messages?.[0]?.id });
    } catch (err) {
      campaign.failed++;
      campaign.results.push({ contact: contact.name, status: "failed", error: err.response?.data });
    }
  }

  campaign.status = "Completed";
  res.json({ success: true, campaign });
});

// ─── CONTACTS ─────────────────────────────────────────────────────
app.get("/api/contacts", (req, res) => res.json(contacts));

app.post("/api/contacts", (req, res) => {
  const { name, phone, email, tag } = req.body;
  if (!name || !phone)
    return res.status(400).json({ error: "name and phone are required" });

  const contact = { id: Date.now(), name, phone, email, tag: tag || "Lead", optIn: true };
  contacts.push(contact);
  res.json({ success: true, contact });
});

app.delete("/api/contacts/:id", (req, res) => {
  contacts = contacts.filter((c) => c.id !== Number(req.params.id));
  res.json({ success: true });
});

// ─── CAMPAIGNS ────────────────────────────────────────────────────
app.get("/api/campaigns", (req, res) => res.json(campaigns));

// ─── MESSAGES LOG ─────────────────────────────────────────────────
app.get("/api/messages", (req, res) => res.json(messages));

// ─── WEBHOOK — receive incoming messages from Meta ────────────────
// GET /webhook — verification handshake
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /webhook — incoming messages & delivery updates
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (body.object !== "whatsapp_business_account") return res.sendStatus(404);

  body.entry?.forEach((entry) => {
    entry.changes?.forEach((change) => {
      const value = change.value;

      // Incoming message from a user
      value.messages?.forEach((msg) => {
        console.log(`📨 Message from ${msg.from}: ${msg.text?.body || "[media]"}`);
        messages.push({
          id: msg.id,
          from: msg.from,
          type: msg.type,
          body: msg.text?.body,
          timestamp: new Date(msg.timestamp * 1000).toISOString(),
          direction: "inbound",
        });
      });

      // Delivery status updates
      value.statuses?.forEach((status) => {
        console.log(`📬 Message ${status.id} → ${status.status}`);
        const msg = messages.find((m) => m.waMessageId === status.id);
        if (msg) msg.status = status.status;
      });
    });
  });

  res.sendStatus(200);
});

// ─── START ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 WASend backend running on port ${PORT}`));
