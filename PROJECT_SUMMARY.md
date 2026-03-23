# WASend Dashboard — Project Summary
> Share this file at the start of any Claude conversation to get instant context.

---

## 🧠 What This Project Is

A **WhatsApp Marketing Dashboard** called **WASend** — a full React frontend UI for managing WhatsApp bulk messaging campaigns, contacts, templates, bots, and API integrations. It is a **UI prototype** with mock data (no real backend yet).

---

## 📁 File Structure

```
wa-dashboard/
├── src/
│   ├── App.jsx         ← ENTIRE app lives here (single file, ~1054 lines)
│   └── main.jsx        ← React root entry point
├── index.html          ← HTML shell
├── package.json        ← React 18 + Vite 5
├── vite.config.js      ← Vite + React plugin config
├── .gitignore
└── PROJECT_SUMMARY.md  ← this file
```

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Inline styles via JS design tokens (no CSS files, no Tailwind) |
| State | React useState / useRef / useEffect only |
| Data | All mock/hardcoded (no API calls, no database) |
| Hosting | Vercel (GitHub auto-deploy) |

---

## 🎨 Design System (Design Tokens in `C` object)

```js
bg:           #f0f7f4   // page background
sidebar:      #ffffff   // sidebar & topbar
accent:       #25d366   // WhatsApp green (primary)
accent2:      #128c7e   // darker green
accentLight:  #e8f8f0   // light green tint
border:       #e4ede9
text:         #1a2e25
sub:          #6b8a7a   // muted/secondary text
red:          #ef4444
yellow:       #f59e0b
blue:         #3b82f6
purple:       #8b5cf6
```

Reusable style helpers: `card`, `inp`, `btn(variant)`, `pill(color, bg)`

---

## 🗂 Pages & Components (16 total)

### ✅ Fully Built Pages
| Page ID | Component | What It Does |
|---|---|---|
| `dashboard` | `Dashboard` | Stats grid, recent campaigns, delivery funnel chart, quick actions |
| `wa-account` | `WAAccount` | Lists 2 mock accounts, Add Account form (toggleable) |
| `campaign-summary` | `CampaignSummary` | Stats + full campaigns table with search |
| `create-campaign` | `CreateCampaign` | 4-step wizard: Template → Compose → Recipients → Review & Send |
| `send-single` | `CreateCampaign` | Reuses same component |
| `auto-responder` | `AutoResponder` | Keyword-based auto-reply rules, toggle active/paused |
| `chatbot` | `ChatBot` | Flow list + visual flow builder preview |
| `msg-template` | `MessageTemplate` | Template cards + preview panel |
| `contacts` | `Contacts` | Table with search, Add Contact form, opt-in toggle |
| `link-qr` | `LinkQR` | WA link generator + QR code display |
| `wa-api` | `WAAPI` | API keys table, token reveal toggle |
| `integrations` | `Integrations` | Razorpay, Cashfree, Shopify, WooCommerce cards |
| `white-label` | `WhiteLabel` | Brand name, logo, color customizer form |
| `users-list` | `UsersList` | Reseller users table with plan badges |

### 🔲 Placeholder Pages (UI shell only, no functionality)
| Page ID | Label |
|---|---|
| `wa-group` | Account Groups |
| `list-template` | List Message Template |
| `group-grabber` | Group Grabber |
| `wa-warmer` | WhatsApp Warmer |

---

## 📦 Mock Data Available

| Variable | Contents |
|---|---|
| `mockCampaigns` | 4 campaigns (Diwali Sale, Product Launch, Reengagement, Black Friday) |
| `mockContacts` | 6 contacts with name, phone, email, tag, optIn |
| `mockTemplates` | 5 templates (Transactional, Marketing, Support, Onboarding) |
| `mockBots` | 3 auto-responder rules (PRICE, SUPPORT, ORDER keywords) |
| `mockAPIs` | 2 API instances (Production, Razorpay Webhook) |

---

## 🏗 App Shell (in `App` component)

- **Sidebar**: Collapsible (60px ↔ 240px), nav grouped into sections, active state highlight
- **Topbar**: Shows current page title + subtitle, phone number, Live status badge, avatar
- **Router**: Simple object map `{ pageId: <Component /> }` — no React Router
- **State**: `activePage` (string) + `sidebarCollapsed` (bool) at root level

---

## 🚀 Deployment

- **Platform**: Vercel (free Hobby plan — up to 10 projects)
- **Trigger**: Auto-deploy on every `git push` to `main`
- **Build command**: `npm run build` (auto-detected by Vercel)
- **Output dir**: `dist/`
- **GitHub repo**: `wa-dashboard` (to be set up)

### Local Dev Commands
```bash
npm install       # first time only
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → /dist
```

---

## 🐛 Known Limitations / Not Yet Built

- No real WhatsApp API integration
- No backend / database
- No authentication / login screen
- No real file upload handling (file input exists but does nothing)
- No chart library (delivery funnel uses raw CSS bars)
- `CreateCampaign` "Send" button fakes a 2s loading state then shows success
- QR code in `LinkQR` is a static placeholder image

---

## 💡 Suggested Next Steps (pick any)

1. **Add React Router** — for proper URL-based navigation
2. **Connect real WhatsApp API** — Meta Cloud API or 3rd party like Interakt
3. **Add Recharts or Chart.js** — for real analytics graphs on Dashboard
4. **Add login page** — simple auth gate before dashboard
5. **Replace mock data** — wire up to a Node.js/Express or Supabase backend
6. **Make it mobile responsive** — currently desktop-only layout

---

## 🗣 How to Use This File with Claude

Paste this message at the start of any new Claude chat:

> "Here is my project summary. I'm working on a React WhatsApp dashboard called WASend. [paste this file content] — I want to [your request here]"

This gives Claude full context to help you with: adding features, fixing bugs, refactoring components, deploying, or building new pages.
