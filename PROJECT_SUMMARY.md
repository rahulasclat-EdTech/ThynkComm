# ThynkApp Sender / ThynkComm — Full Project Summary
> Paste this entire file at the start of any new Claude conversation to get instant context.
> Last Updated: March 2026

---

## 🧠 Project Overview

A **WhatsApp Marketing SaaS Dashboard** called **ThynkApp Sender** (branding) / **ThynkComm** (repo name).
Built to sell as a real product — allows users to send bulk WhatsApp campaigns, manage contacts,
create message templates, set up auto-responders, chatbots, live chat inbox, and view delivery analytics.
All powered by **Meta WhatsApp Cloud API** directly (no 3rd party middleware).

---

## 🌐 Live URLs

| Service | URL |
|---|---|
| Frontend (Live) | https://thynkcom.vercel.app |
| GitHub Repo | https://github.com/rahulasclat-EdTech/ThynkComm |
| Supabase Dashboard | supabase.com → project: wasend |

---

## 🛠 Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React 18 + Vite 5 | Vercel (free) |
| Backend API | Vercel Serverless Functions (Node.js) | Vercel (free) |
| Database | Supabase (PostgreSQL) | Supabase (free) |
| WhatsApp | Meta Cloud API v19.0 | Meta (pay per message) |
| Styling | Inline JS styles, dark theme | — |
| State | React useState / useEffect only | — |
| Auth | localStorage-based login system | — |
| Scheduling | cron-job.org (free external cron) | cron-job.org (free) |

---

## 🎨 Design System (Dark Theme)

```javascript
const C = {
  bg:          "#0f1923",        // deep navy background
  sidebar:     "#131f2e",        // sidebar
  card:        "#1a2940",        // card surface
  accent:      "#1ab8a8",        // teal primary (logo color)
  accent2:     "#0e8a7d",        // darker teal
  accentLight: "#1ab8a820",      // teal glow
  border:      "#ffffff14",      // subtle border
  text:        "#f0f8ff",        // near white
  sub:         "#7fa8c4",        // muted
  red:         "#ff5c7a",
  yellow:      "#ffd166",
  blue:        "#4db8ff",
  purple:      "#c77dff",
  green:       "#06d6a0",
  orange:      "#ff9f43",
}
```

Logo: ThynkSuccess logo embedded as base64 PNG in App.jsx (LOGO_SRC constant)
Brand name: **ThynkApp Sender** (replaces old "WASend")

---

## 📁 Correct Repo Structure

```
ThynkComm/
├── api/
│   ├── contacts.js           ← GET/POST /api/contacts
│   ├── campaigns.js          ← GET/POST /api/campaigns (send now or schedule)
│   ├── send-message.js       ← POST /api/send-message
│   ├── webhook.js            ← GET/POST /api/webhook (Meta webhook + auto-responder + chatbot)
│   ├── cron-send.js          ← GET /api/cron-send (called by cron-job.org every minute)
│   ├── templates.js          ← GET /api/templates (fetch approved Meta templates)
│   ├── live-chat.js          ← GET/POST /api/live-chat (conversations + admin reply)
│   ├── auto-responder.js     ← GET/POST /api/auto-responder (rules)
│   └── chatbot-flows.js      ← GET/POST /api/chatbot-flows (flows)
├── src/
│   ├── App.jsx               ← entire React frontend (~2500 lines)
│   └── main.jsx
├── package.json              ← NO "type": "module" — removed
├── vite.config.js
├── index.html
└── PROJECT_SUMMARY_FULL.md
```

---

## ⚙️ Vercel Configuration

```
Project Name:     thynkcom
Framework:        Vite
Root Directory:   (BLANK)
Build Command:    npm run build
Output Dir:       dist
Branch:           main
```

### Environment Variables (Vercel → Settings → Environment Variables)
```
WHATSAPP_TOKEN        → Meta permanent system user token (NOT temporary)
PHONE_NUMBER_ID       → Meta Phone Number ID (numeric, from API Setup page)
WABA_ID               → WhatsApp Business Account ID
SUPABASE_URL          → https://xxxxxx.supabase.co
SUPABASE_ANON_KEY     → eyJ... (anon/public key)
WEBHOOK_VERIFY_TOKEN  → any secret string e.g. thynkcomm2026
CRON_SECRET           → any secret string e.g. cronthynk2026
```

---

## 🗄️ Supabase Tables

### contacts
```sql
id          bigserial PRIMARY KEY
name        text
phone       text        -- format: 919999999999
email       text
tag         text        default: 'Lead'
opt_in      bool        default: true
created_at  timestamptz default: now()
```

### campaigns
```sql
id          bigserial PRIMARY KEY
name        text
status      text        default: 'Running'
total       int4        default: 0
sent        int4        default: 0
delivered   int4        default: 0
failed      int4        default: 0
created_at  timestamptz default: now()
```

### messages
```sql
id            bigserial PRIMARY KEY
to_number     text
from_number   text
contact_name  text        -- real WhatsApp contact name from webhook
body          text
status        text
direction     text        -- 'inbound' or 'outbound'
wa_message_id text
created_at    timestamptz default: now()
```

### scheduled_campaigns
```sql
id              bigserial PRIMARY KEY
name            text
contact_ids     bigint[]
message         text
template_name   text
language_code   text        default: 'en_US'
scheduled_at    timestamptz
timezone        text        default: 'Asia/Kolkata'
status          text        default: 'pending'
error_message   text
campaign_id     bigint
sent_at         timestamptz
created_at      timestamptz default: now()
```

### auto_responder_rules
```sql
id            bigserial PRIMARY KEY
keyword       text
match_type    text        -- 'exact', 'contains', 'starts'
response_type text        -- 'text' or 'template'
response_text text
template_name text
language_code text        default: 'en_US'
active        bool        default: true
created_at    timestamptz default: now()
```

### chatbot_flows
```sql
id         bigserial PRIMARY KEY
name       text
triggers   text
active     bool        default: true
steps      jsonb       default: '[]'
created_at timestamptz default: now()
```

### chatbot_sessions
```sql
id           bigserial PRIMARY KEY
phone        text
flow_id      bigint
current_step int         default: 0
status       text        default: 'active'
created_at   timestamptz default: now()
```

### ⚠️ RLS must be DISABLED on ALL tables
```sql
ALTER TABLE contacts            DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns           DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages            DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE auto_responder_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_flows       DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_sessions    DISABLE ROW LEVEL SECURITY;
```

---

## 🔌 API Routes

| Method | Route | What it does |
|---|---|---|
| GET | /api/contacts | Fetch all contacts |
| POST | /api/contacts | Add new contact |
| GET | /api/campaigns | Fetch all campaigns |
| POST | /api/campaigns | Create + send/schedule campaign |
| POST | /api/send-message | Send single WhatsApp message |
| GET | /api/webhook | Meta webhook verification |
| POST | /api/webhook | Receive messages + trigger auto-responder/chatbot |
| GET | /api/cron-send | Run scheduled campaigns (called by cron-job.org) |
| GET | /api/templates | Fetch approved Meta templates |
| GET | /api/live-chat | Fetch all conversations |
| GET | /api/live-chat?phone=X | Fetch single conversation thread |
| POST | /api/live-chat | Admin sends reply to user |
| GET | /api/auto-responder | Fetch auto-responder rules |
| POST | /api/auto-responder | Save auto-responder rules |
| GET | /api/chatbot-flows | Fetch chatbot flows |
| POST | /api/chatbot-flows | Save chatbot flows |

---

## 🔐 Login / Multi-User System

- Login page shown before dashboard (email + password)
- Default admin: **admin@thynkapp.com** / **admin123**
- Users stored in **localStorage** (client-side, no backend needed)
- Roles: **admin** (full), **manager** (campaigns+contacts), **agent** (live chat+send), **viewer** (read only)
- Avatar colors auto-assigned from a palette
- Logout via sidebar bottom (⎋ button) or clicking avatar in topbar
- Admin can add/remove users from **Users & Access** page

---

## 📱 Pages & Status

### ✅ Fully Working
| Page | Features |
|---|---|
| Dashboard | Real stats, delivery funnel |
| Contacts | Groups → Add manual / Import CSV |
| Campaign Summary | Real data from Supabase |
| Create Campaign | Template or text, select group, schedule |
| Send Single Message | Real WhatsApp send |
| Link & QR Generator | WA links + QR codes |
| WhatsApp Account | Live Meta API verification |
| Auto-Responder | Template dropdown (approved templates), keyword rules |
| ChatBot Builder | Visual flow builder, template steps, drag-reorder |
| Live Chat | Real-time inbox, shows real phone numbers, admin reply |
| Users & Access | Add/remove users, roles |

### 🔲 Placeholder (show "Get Started" only)
| Page | ID |
|---|---|
| Account Groups | wa-group |
| Message Template | msg-template |
| List Message Template | list-template |
| Group Grabber | group-grabber |
| WhatsApp Warmer | wa-warmer |
| WhatsApp API | wa-api |
| Integrations | integrations |
| White Label | white-label |
| ChatBot | chatbot (partially built) |
| Auto-Responder | auto-responder (partially built) |

---

## 🕐 Campaign Scheduling

- **Send Now** → immediate send via Meta API
- **Schedule Later** → saved to `scheduled_campaigns` table
- **cron-job.org** (free) calls `/api/cron-send?secret=YOUR_CRON_SECRET` every minute
- Cron checks for pending campaigns due now, fires them, marks as sent
- Setup: cron-job.org → Create cronjob → URL: `https://thynkcom.vercel.app/api/cron-send?secret=cronthynk2026`

---

## 🤖 Auto-Responder + ChatBot Logic

### Auto-Responder
- Rules stored in Supabase `auto_responder_rules`
- Webhook receives message → checks all active rules → first match wins
- Response types: **text** or **Meta template** (from approved templates dropdown)
- Match types: exact, contains, starts with

### ChatBot
- Flows stored in Supabase `chatbot_flows`
- Sessions tracked in `chatbot_sessions`
- Triggered by keywords in inbound messages
- Step types: message, template, collect, delay, end
- Chatbot takes priority over auto-responder

---

## 💬 Live Chat

- Left panel: all conversations grouped by real WhatsApp phone number
- Shows real phone number (e.g. +919999999999) NOT internal IDs
- Contact name from Meta webhook payload stored in `contact_name` column
- Auto-refreshes every 5 seconds
- Admin can reply with text or approved Meta template
- "Open in WhatsApp" button per conversation

---

## 🐛 Issues Resolved

| Issue | Fix |
|---|---|
| 404 on Vercel | Root Directory was set wrong → set to blank |
| api/ not detected | api/ was inside subfolder → moved to repo root |
| Contact not saving | Supabase RLS enabled → disabled via SQL |
| import/export syntax crash | Removed "type":"module" from package.json, switched to require/module.exports |
| JSON parse error on API | Same import/export fix |
| Campaign not scheduling | Created scheduled_campaigns table + cron-send.js |
| Template dropdown empty | Created /api/templates → fetches from Meta WABA |
| Live chat shows ID not phone | webhook.js updated to store from_number (real phone) + contact_name |
| WhatsApp connection fails | WAAccount page now live-tests credentials against Meta API |

---

## 🚀 Deployment Workflow

```
Edit files on GitHub
→ Vercel auto-deploys in ~60 seconds
→ Live at thynkcom.vercel.app
```

---

## 📋 Remaining Roadmap

### Priority 1 — Core
- [ ] Message Templates page (list + create Meta-approved templates via UI)
- [ ] List Message Template page
- [ ] WhatsApp API page (show credentials, token management)

### Priority 2 — Growth
- [ ] Integrations (Razorpay, Cashfree webhooks)
- [ ] Group Grabber (export WA group contacts)
- [ ] WhatsApp Warmer

### Priority 3 — SaaS
- [ ] Multi-tenant (each user sees own data)
- [ ] Supabase Auth (replace localStorage auth with proper auth)
- [ ] White Label (custom branding per client)
- [ ] Billing / Subscription system

### Priority 4 — Polish
- [ ] Real charts (Recharts)
- [ ] Mobile responsive layout
- [ ] Real-time updates via Supabase Realtime

---

## 🗣️ How to Use This File With Claude

Paste this at the start of any new Claude chat:

> "Here is my full project summary for ThynkApp Sender / ThynkComm.
> [paste this entire file]
> I want to [your request]"

### Example requests:
- "Build the Message Templates page"
- "Add Recharts to the Dashboard"
- "Make the app mobile responsive"
- "Fix the Campaign page bug where..."
- "Add Supabase Auth login"
