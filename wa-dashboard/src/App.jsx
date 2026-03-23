import { useState, useRef, useEffect } from "react";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#f0f4f8", panel: "#ffffff", sidebar: "#ffffff",
  accent: "#25D366", accentDark: "#128C7E", accentLight: "#e8faf0",
  text: "#1a2332", sub: "#6b7a8d", border: "#e4eaf2",
  danger: "#ef4444", warn: "#f59e0b", info: "#3b82f6",
  card: "#ffffff", shadow: "0 2px 12px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 24px rgba(0,0,0,0.10)",
};

// ─── NAV STRUCTURE ────────────────────────────────────────────────────────────
const NAV = [
  { section: "MAIN", items: [{ id: "dashboard", label: "Dashboard", icon: "⊞", sub: "Overview & Stats" }] },
  { section: "ACCOUNTS", items: [
    { id: "wa_account", label: "WhatsApp Account", icon: "📱", sub: "Manage WABA" },
    { id: "wa_group", label: "Account Groups", icon: "👥", sub: "Create & edit groups" },
  ]},
  { section: "CAMPAIGN", items: [
    { id: "campaign_summary", label: "Campaign Summary", icon: "📊", sub: "All campaigns" },
    { id: "create_campaign", label: "Create Campaign", icon: "📤", sub: "Create & send messages" },
    { id: "single_message", label: "Send Single Message", icon: "✉️", sub: "One-off message" },
    { id: "auto_responder", label: "Auto-Responder", icon: "🔄", sub: "Reply 24/7" },
    { id: "chatbot", label: "ChatBot", icon: "🤖", sub: "Automated conversation" },
  ]},
  { section: "TEMPLATE", items: [
    { id: "msg_template", label: "Message Template", icon: "📋", sub: "Create captions" },
    { id: "list_template", label: "List Message Template", icon: "📝", sub: "Message with options" },
  ]},
  { section: "CONTACT", items: [
    { id: "contacts", label: "Contacts", icon: "👤", sub: "Create, edit contacts" },
    { id: "contact_export", label: "Export Contacts", icon: "📥", sub: "Download & export" },
  ]},
  { section: "TOOLS", items: [
    { id: "group_grabber", label: "Group Grabber", icon: "🔗", sub: "Export group contacts" },
    { id: "wa_warmer", label: "WhatsApp Warmer", icon: "🔥", sub: "Activate inactive number" },
    { id: "qr_generator", label: "Link & QR Generator", icon: "📷", sub: "Create QR codes" },
    { id: "wa_api", label: "WhatsApp API", icon: "⚡", sub: "Instance ID & token" },
  ]},
  { section: "INTEGRATIONS", items: [
    { id: "razorpay", label: "Razorpay", icon: "💳", sub: "Payment webhooks" },
    { id: "cashfree", label: "CashFree", icon: "🏦", sub: "Payment alerts" },
    { id: "webhook", label: "Webhooks", icon: "🔌", sub: "Connect any platform" },
    { id: "api_docs", label: "API Documentation", icon: "📖", sub: "Developer reference" },
  ]},
  { section: "WHITE LABEL", items: [
    { id: "white_label", label: "White Label", icon: "🏷️", sub: "Customize your brand" },
    { id: "users_list", label: "Users List", icon: "🧑‍💼", sub: "Manage users" },
  ]},
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CONTACTS = [
  { id:1, name:"Aarav Shah", phone:"+91 98765 43210", email:"aarav@email.com", tag:"VIP", optIn:true, lastMsg:"2h ago" },
  { id:2, name:"Priya Mehta", phone:"+91 91234 56789", email:"priya@email.com", tag:"Lead", optIn:true, lastMsg:"1d ago" },
  { id:3, name:"Rajan Verma", phone:"+91 99887 76655", email:"rajan@email.com", tag:"Customer", optIn:false, lastMsg:"3d ago" },
  { id:4, name:"Sneha Iyer", phone:"+91 87654 32109", email:"sneha@email.com", tag:"Customer", optIn:true, lastMsg:"5h ago" },
  { id:5, name:"Vikram Nair", phone:"+91 76543 21098", email:"vikram@email.com", tag:"Lead", optIn:true, lastMsg:"2d ago" },
  { id:6, name:"Meera Pillai", phone:"+91 94321 09876", email:"meera@email.com", tag:"VIP", optIn:true, lastMsg:"30m ago" },
];
const TEMPLATES = [
  { id:1, name:"Order Confirmation", cat:"Transactional", status:"Approved", body:"Hi {{1}}, your order #{{2}} has been confirmed! Expected delivery: {{3}}." },
  { id:2, name:"Flash Sale Alert", cat:"Marketing", status:"Approved", body:"🔥 Flash Sale! Get {{1}}% off on all products. Use code {{2}}. Valid till {{3}}." },
  { id:3, name:"Support Follow-up", cat:"Support", status:"Pending", body:"Hi {{1}}, we're following up on your ticket #{{2}}. Is your issue resolved?" },
  { id:4, name:"Welcome Message", cat:"Onboarding", status:"Approved", body:"Welcome to {{1}}, {{2}}! 🎉 We're thrilled to have you. Here's how to get started." },
  { id:5, name:"Payment Receipt", cat:"Transactional", status:"Approved", body:"Payment of ₹{{1}} received for order {{2}}. Thank you for shopping with {{3}}!" },
];
const CAMPAIGNS = [
  { id:1, name:"Diwali Sale 2025", sent:12400, delivered:11980, read:9200, replied:340, failed:420, status:"Completed", date:"12 Oct" },
  { id:2, name:"New Product Launch", sent:8700, delivered:8500, read:6100, replied:210, failed:200, status:"Running", date:"18 Nov" },
  { id:3, name:"Re-engagement Drive", sent:5300, delivered:5100, read:3800, replied:90, failed:200, status:"Paused", date:"2 Dec" },
  { id:4, name:"Winter Collection", sent:3100, delivered:3000, read:2100, replied:55, failed:100, status:"Scheduled", date:"25 Dec" },
];
const BOTS = [
  { id:1, name:"Order Tracking Bot", trigger:"order status", responses:142, status:"Active" },
  { id:2, name:"FAQ Handler", trigger:"help, support", responses:89, status:"Active" },
  { id:3, name:"Lead Qualifier", trigger:"pricing, demo", responses:34, status:"Paused" },
];
const RESPONDERS = [
  { id:1, keyword:"Hi, Hello, Hey", reply:"Hello! Welcome to our store 👋 How can we help you today?", status:"Active" },
  { id:2, keyword:"Price, Cost, Rate", reply:"Check our latest pricing at https://example.com/pricing 💰", status:"Active" },
  { id:3, keyword:"Order, Track", reply:"Please share your order ID and we'll track it for you 📦", status:"Active" },
];

const sColor = { Completed:"#22c55e", Running:"#3b82f6", Paused:"#f59e0b", Scheduled:"#8b5cf6", Active:"#22c55e", Approved:"#22c55e", Pending:"#f59e0b" };

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ status }) => (
  <span style={{ background: (sColor[status]||"#6b7a8d")+"18", color: sColor[status]||"#6b7a8d", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{status}</span>
);
const Card = ({ children, style={} }) => (
  <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:22, boxShadow:T.shadow, ...style }}>{children}</div>
);
const SectionTitle = ({ children }) => (
  <h2 style={{ margin:"0 0 18px", fontSize:17, fontWeight:700, color:T.text }}>{children}</h2>
);
const Input = ({ style={}, ...p }) => (
  <input {...p} style={{ background:"#f8fafc", border:`1.5px solid ${T.border}`, borderRadius:8, padding:"10px 13px", color:T.text, fontSize:13, outline:"none", fontFamily:"inherit", ...style }} />
);
const Textarea = ({ style={}, ...p }) => (
  <textarea {...p} style={{ background:"#f8fafc", border:`1.5px solid ${T.border}`, borderRadius:8, padding:"10px 13px", color:T.text, fontSize:13, outline:"none", fontFamily:"inherit", resize:"vertical", ...style }} />
);
const Select = ({ style={}, ...p }) => (
  <select {...p} style={{ background:"#f8fafc", border:`1.5px solid ${T.border}`, borderRadius:8, padding:"10px 13px", color:T.text, fontSize:13, outline:"none", fontFamily:"inherit", ...style }} />
);
const Btn = ({ children, variant="primary", style={}, ...p }) => {
  const base = { padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s" };
  const v = {
    primary: { background:`linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color:"white" },
    ghost: { background:T.accentLight, color:T.accentDark },
    danger: { background:"#fef2f2", color:T.danger },
    outline: { background:"transparent", border:`1.5px solid ${T.border}`, color:T.sub },
  };
  return <button {...p} style={{ ...base, ...(v[variant]||v.primary), ...style }}>{children}</button>;
};
const StatCard = ({ label, value, icon, delta, color="#25D366" }) => (
  <Card style={{ display:"flex", alignItems:"center", gap:16 }}>
    <div style={{ width:50, height:50, borderRadius:12, background:color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{icon}</div>
    <div style={{ flex:1 }}>
      <div style={{ fontSize:22, fontWeight:800, color:T.text }}>{value}</div>
      <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{label}</div>
      {delta && <div style={{ fontSize:11, color:color, fontWeight:600, marginTop:4 }}>{delta}</div>}
    </div>
  </Card>
);

// ─── PAGE COMPONENTS ──────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <StatCard label="Messages Sent" value="26,400" icon="📤" delta="↑ 12% this week" color="#25D366" />
        <StatCard label="Delivered" value="25,580" icon="✅" delta="↑ 9%" color="#3b82f6" />
        <StatCard label="Read Rate" value="74.2%" icon="👁" delta="↑ 3%" color="#8b5cf6" />
        <StatCard label="Replies" value="640" icon="💬" delta="↑ 18%" color="#f59e0b" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:16 }}>
        <Card>
          <SectionTitle>Recent Campaigns</SectionTitle>
          {CAMPAIGNS.map(c => (
            <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 80px", gap:10, alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
              <div><div style={{ fontWeight:600, fontSize:14, color:T.text }}>{c.name}</div><div style={{ fontSize:11, color:T.sub, marginTop:2 }}>{c.date}</div></div>
              <div><div style={{ fontSize:11, color:T.sub }}>Sent</div><div style={{ fontWeight:700 }}>{c.sent.toLocaleString()}</div></div>
              <div><div style={{ fontSize:11, color:T.sub }}>Read</div><div style={{ fontWeight:700 }}>{c.read.toLocaleString()}</div></div>
              <div><div style={{ fontSize:11, color:T.sub }}>Replied</div><div style={{ fontWeight:700 }}>{c.replied}</div></div>
              <Badge status={c.status} />
            </div>
          ))}
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>Active Auto-Responders</div>
            {RESPONDERS.filter(r=>r.status==="Active").map(r => (
              <div key={r.id} style={{ padding:"8px 0", borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                <div style={{ color:T.accentDark, fontWeight:600 }}>"{r.keyword}"</div>
                <div style={{ color:T.sub, marginTop:2, fontSize:11 }}>{r.reply.slice(0,48)}…</div>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:12 }}>ChatBots</div>
            {BOTS.map(b => (
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div><div style={{ fontSize:13, fontWeight:500 }}>{b.name}</div><div style={{ fontSize:11, color:T.sub }}>{b.responses} responses</div></div>
                <Badge status={b.status} />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function WAAccount() {
  const [apiKey] = useState("waba_live_xK92mP3...••••••••");
  const [show, setShow] = useState(false);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <Card>
        <SectionTitle>Connected WhatsApp Account</SectionTitle>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.accentDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>📱</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>Business Account</div>
            <div style={{ color:T.accentDark, fontWeight:600, fontSize:13 }}>✓ Meta Verified</div>
            <div style={{ color:T.sub, fontSize:12, marginTop:2 }}>+91 XXXXX XXXXX</div>
          </div>
        </div>
        {[["WABA ID","102938475663829"],["Phone Number ID","104928374655021"],["Business Account","Acme Pvt Ltd"],["API Version","v18.0"],["Status","Active"],].map(([l,v])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
            <span style={{ color:T.sub }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:12, color:T.sub, marginBottom:6 }}>Access Token</div>
          <div style={{ display:"flex", gap:8 }}>
            <Input value={show ? "EAABwzLixnjYBAO..." : apiKey} readOnly style={{ flex:1 }} />
            <Btn variant="ghost" onClick={()=>setShow(!show)}>{show?"🙈 Hide":"👁 Show"}</Btn>
          </div>
        </div>
        <Btn style={{ marginTop:14, width:"100%" }}>+ Add Another Account</Btn>
      </Card>
      <Card>
        <SectionTitle>Account Health</SectionTitle>
        {[["Quality Rating","High ⭐⭐⭐",T.accent],["Messaging Limit","10,000/day",T.info],["Template Status","8 Approved",T.accent],["Webhook Status","Connected ✓",T.accent],["Last Synced","2 min ago",T.sub],].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.sub, fontSize:13 }}>{l}</span><span style={{ color:c, fontWeight:700, fontSize:13 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop:16, padding:14, background:T.accentLight, borderRadius:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.accentDark, marginBottom:4 }}>💡 Pro Tip</div>
          <div style={{ fontSize:12, color:T.accentDark }}>Keep your quality rating HIGH by ensuring opt-in consent before messaging.</div>
        </div>
      </Card>
    </div>
  );
}

function CreateCampaign() {
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState([]);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState(null);
  const [btns, setBtns] = useState([{ label:"", type:"URL", value:"" }]);
  const [selTpl, setSelTpl] = useState(null);
  const [schedule, setSchedule] = useState("now");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const addBtn = () => btns.length < 3 && setBtns([...btns, { label:"", type:"URL", value:"" }]);
  const removeBtn = (i) => setBtns(btns.filter((_,idx)=>idx!==i));
  const updateBtn = (i,f,v) => setBtns(btns.map((b,idx)=>idx===i?{...b,[f]:v}:b));
  const toggle = (id) => setSel(p=>p.includes(id)?p.filter(c=>c!==id):[...p,id]);

  const send = () => { setSending(true); setTimeout(()=>{ setSending(false); setDone(true); setTimeout(()=>setDone(false),3000); },2200); };

  const steps = ["Audience","Message","CTA & Files","Schedule & Send"];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20 }}>
      <div>
        {/* Stepper */}
        <div style={{ display:"flex", marginBottom:22, gap:0 }}>
          {steps.map((s,i)=>(
            <div key={s} onClick={()=>setStep(i+1)} style={{ flex:1, cursor:"pointer", padding:"10px 14px", background:step===i+1?T.accent:step>i+1?"#e8faf0":T.card, borderBottom:`3px solid ${step>=i+1?T.accent:T.border}`, textAlign:"center", fontSize:12, fontWeight:step===i+1?700:500, color:step===i+1?"white":step>i+1?T.accentDark:T.sub, transition:"all 0.2s" }}>
              <span style={{ background:step>i+1?"white":step===i+1?"rgba(255,255,255,0.3)":"#e4eaf2", color:step===i+1?T.accent:step>i+1?T.accentDark:T.sub, width:20, height:20, borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center", marginRight:6, fontSize:11, fontWeight:700 }}>{step>i+1?"✓":i+1}</span>
              {s}
            </div>
          ))}
        </div>

        {step===1 && (
          <Card>
            <SectionTitle>Select Audience</SectionTitle>
            <div style={{ display:"flex", gap:10, marginBottom:14 }}>
              <Input placeholder="🔍 Search contacts..." style={{ flex:1 }} />
              <Select><option>All Tags</option><option>VIP</option><option>Lead</option><option>Customer</option></Select>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:13, color:T.sub }}>{sel.length} of {CONTACTS.length} selected</span>
              <button onClick={()=>setSel(CONTACTS.map(c=>c.id))} style={{ background:"none", border:"none", color:T.accent, fontSize:13, cursor:"pointer", fontWeight:600 }}>Select All</button>
            </div>
            {CONTACTS.map(c=>(
              <div key={c.id} onClick={()=>toggle(c.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 13px", borderRadius:9, border:`1.5px solid ${sel.includes(c.id)?T.accent:T.border}`, marginBottom:7, cursor:"pointer", background:sel.includes(c.id)?T.accentLight:"white", transition:"all 0.15s" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent}40,${T.accentDark}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:T.accentDark }}>{c.name[0]}</div>
                <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div><div style={{ fontSize:11, color:T.sub }}>{c.phone}</div></div>
                <Badge status={c.tag} />
                {sel.includes(c.id)&&<span style={{ color:T.accent, fontSize:18 }}>✓</span>}
              </div>
            ))}
            <Btn onClick={()=>setStep(2)} style={{ marginTop:12, width:"100%" }} disabled={sel.length===0}>Continue →</Btn>
          </Card>
        )}

        {step===2 && (
          <Card>
            <SectionTitle>Compose Message</SectionTitle>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:8 }}>USE APPROVED TEMPLATE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {TEMPLATES.filter(t=>t.status==="Approved").map(t=>(
                  <div key={t.id} onClick={()=>{ setSelTpl(t); setMsg(t.body); }} style={{ padding:"10px 12px", borderRadius:8, border:`1.5px solid ${selTpl?.id===t.id?T.accent:T.border}`, cursor:"pointer", background:selTpl?.id===t.id?T.accentLight:"#f8fafc", transition:"all 0.15s" }}>
                    <div style={{ fontWeight:600, fontSize:12, color:T.text }}>{t.name}</div>
                    <div style={{ fontSize:11, color:T.sub }}>{t.cat}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:8 }}>MESSAGE BODY</div>
              <Textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type your message... Use {{1}}, {{2}} for variables" style={{ width:"100%", minHeight:120, boxSizing:"border-box" }} />
              <div style={{ fontSize:11, color:T.sub, marginTop:4 }}>{msg.length}/4096 chars · Use {"{{1}}"} {"{{2}}"} for personalization</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="outline" onClick={()=>setStep(1)}>← Back</Btn>
              <Btn onClick={()=>setStep(3)} style={{ flex:1 }} disabled={!msg}>Continue →</Btn>
            </div>
          </Card>
        )}

        {step===3 && (
          <Card>
            <SectionTitle>CTA Buttons & Attachment</SectionTitle>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                CTA BUTTONS (up to 3)
                {btns.length<3&&<Btn variant="ghost" style={{ padding:"4px 12px", fontSize:11 }} onClick={addBtn}>+ Add</Btn>}
              </div>
              {btns.map((b,i)=>(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 100px 1fr auto", gap:8, marginBottom:8, alignItems:"center" }}>
                  <Input value={b.label} onChange={e=>updateBtn(i,"label",e.target.value)} placeholder="Button text" />
                  <Select value={b.type} onChange={e=>updateBtn(i,"type",e.target.value)}>
                    <option value="URL">🔗 URL</option><option value="PHONE">📞 Call</option><option value="REPLY">💬 Reply</option>
                  </Select>
                  <Input value={b.value} onChange={e=>updateBtn(i,"value",e.target.value)} placeholder={b.type==="URL"?"https://":b.type==="PHONE"?"+91…":"Reply text"} />
                  {btns.length>1&&<button onClick={()=>removeBtn(i)} style={{ background:"none", border:"none", color:T.danger, cursor:"pointer", fontSize:18 }}>×</button>}
                </div>
              ))}
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:10 }}>FILE ATTACHMENT</div>
              <input type="file" ref={fileRef} style={{ display:"none" }} onChange={e=>setFile(e.target.files[0])} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
              {file ? (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", background:"#f0fdf4", border:`1.5px solid ${T.accent}`, borderRadius:9 }}>
                  <span style={{ fontSize:22 }}>📎</span>
                  <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13 }}>{file.name}</div><div style={{ fontSize:11, color:T.sub }}>{(file.size/1024).toFixed(1)} KB</div></div>
                  <button onClick={()=>setFile(null)} style={{ background:"none", border:"none", color:T.danger, cursor:"pointer", fontSize:18 }}>×</button>
                </div>
              ):(
                <button onClick={()=>fileRef.current.click()} style={{ width:"100%", padding:"18px", border:`1.5px dashed ${T.border}`, borderRadius:9, background:"#f8fafc", color:T.sub, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  📎 Attach Image, Video, PDF or Document
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="outline" onClick={()=>setStep(2)}>← Back</Btn>
              <Btn onClick={()=>setStep(4)} style={{ flex:1 }}>Continue →</Btn>
            </div>
          </Card>
        )}

        {step===4 && (
          <Card>
            <SectionTitle>Schedule & Send</SectionTitle>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:10 }}>SEND TIMING</div>
              {[["now","Send Now","Deliver immediately"],["scheduled","Schedule for Later","Pick date & time"],["recurring","Recurring","Daily / Weekly / Monthly"]].map(([v,l,d])=>(
                <div key={v} onClick={()=>setSchedule(v)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:9, border:`1.5px solid ${schedule===v?T.accent:T.border}`, marginBottom:8, cursor:"pointer", background:schedule===v?T.accentLight:"white" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${schedule===v?T.accent:T.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {schedule===v&&<div style={{ width:10, height:10, borderRadius:"50%", background:T.accent }} />}
                  </div>
                  <div><div style={{ fontWeight:600, fontSize:13 }}>{l}</div><div style={{ fontSize:11, color:T.sub }}>{d}</div></div>
                </div>
              ))}
              {schedule==="scheduled"&&<Input type="datetime-local" style={{ width:"100%", boxSizing:"border-box", marginTop:8 }} />}
            </div>
            <div style={{ background:"#f8fafc", borderRadius:10, padding:14, marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:8 }}>Campaign Summary</div>
              {[["Recipients",`${sel.length} contacts`],["Template",selTpl?.name||"Custom"],["Attachment",file?.name||"None"],["CTA Buttons",`${btns.filter(b=>b.label).length} button(s)`],["Timing",schedule==="now"?"Immediately":schedule]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.sub }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <Btn variant="outline" onClick={()=>setStep(3)}>← Back</Btn>
              <button onClick={send} disabled={sending||sel.length===0} style={{ flex:1, padding:"12px", borderRadius:9, border:"none", background:sending||sel.length===0?"#e4eaf2":`linear-gradient(135deg,${T.accent},${T.accentDark})`, color:sending||sel.length===0?T.sub:"white", fontWeight:700, fontSize:14, cursor:sending||sel.length===0?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {sending?<><span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>⟳</span>Sending…</>:done?"✓ Campaign Sent!":`📤 Send to ${sel.length} Contact${sel.length!==1?"s":""}`}
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Live Preview */}
      <div style={{ position:"sticky", top:0, alignSelf:"start" }}>
        <div style={{ fontSize:11, color:T.sub, fontWeight:700, letterSpacing:"0.06em", marginBottom:10 }}>LIVE PREVIEW</div>
        <div style={{ background:"#e5ddd5", borderRadius:20, overflow:"hidden", border:`1px solid ${T.border}`, boxShadow:T.shadowMd }}>
          <div style={{ background:"#075e54", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"#128c7e", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"white", fontSize:16 }}>C</div>
            <div><div style={{ fontWeight:600, color:"white", fontSize:14 }}>Customer</div><div style={{ fontSize:11, color:"#a7f3d0" }}>online</div></div>
          </div>
          <div style={{ padding:14, minHeight:200, backgroundImage:"url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c9b99a' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='m0 40 40-40H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")" }}>
            {(msg||file||btns[0]?.label) ? (
              <div style={{ background:"white", borderRadius:"0 10px 10px 10px", padding:"10px 12px", maxWidth:"88%", boxShadow:"0 1px 3px rgba(0,0,0,0.1)", marginLeft:"auto" }}>
                {file&&<div style={{ background:"#f0f0f0", borderRadius:6, padding:"6px 9px", marginBottom:7, fontSize:11, color:"#075e54", display:"flex", alignItems:"center", gap:5 }}>📎 {file.name}</div>}
                {msg&&<p style={{ margin:0, fontSize:13, color:"#111", lineHeight:1.55, whiteSpace:"pre-wrap" }}>{msg}</p>}
                <div style={{ fontSize:10, color:"#999", textAlign:"right", marginTop:4 }}>12:34 PM ✓✓</div>
                {btns.filter(b=>b.label).length>0&&(
                  <div style={{ borderTop:"1px solid #eee", marginTop:8, paddingTop:8 }}>
                    {btns.filter(b=>b.label).map((b,i)=>(
                      <div key={i} style={{ textAlign:"center", color:"#0078d4", fontSize:13, fontWeight:500, padding:"5px 0", borderBottom:i<btns.filter(b2=>b2.label).length-1?"1px solid #f0f0f0":"none" }}>
                        {b.type==="URL"?"🔗":b.type==="PHONE"?"📞":"💬"} {b.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ):(
              <div style={{ textAlign:"center", color:"#999", fontSize:12, paddingTop:50 }}>Preview appears here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignSummary() {
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <StatCard label="Total Campaigns" value="12" icon="📡" color={T.accent} />
        <StatCard label="Total Messages" value="55,900" icon="📤" color={T.info} />
        <StatCard label="Avg. Read Rate" value="72%" icon="👁" color="#8b5cf6" />
        <StatCard label="Total Replies" value="785" icon="💬" color={T.warn} />
      </div>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <SectionTitle>All Campaigns</SectionTitle>
          <Input placeholder="🔍 Search campaigns…" style={{ width:220 }} />
        </div>
        {CAMPAIGNS.map(c => (
          <div key={c.id} style={{ display:"grid", gridTemplateColumns:"2fr repeat(5,1fr) 100px", gap:10, alignItems:"center", padding:"14px 0", borderBottom:`1px solid ${T.border}` }}>
            <div><div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div><div style={{ fontSize:11, color:T.sub }}>{c.date}</div></div>
            {[["Sent",c.sent],["Delivered",c.delivered],["Read",c.read],["Replied",c.replied],["Failed",c.failed]].map(([l,v])=>(
              <div key={l}><div style={{ fontSize:10, color:T.sub, textTransform:"uppercase", letterSpacing:"0.04em" }}>{l}</div><div style={{ fontWeight:700, fontSize:15 }}>{v.toLocaleString()}</div></div>
            ))}
            <Badge status={c.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function AutoResponder() {
  const [responders, setResponders] = useState(RESPONDERS);
  const [kw, setKw] = useState(""); const [rep, setRep] = useState(""); const [adding, setAdding] = useState(false);
  const add = () => { if(kw&&rep){ setResponders([...responders,{id:Date.now(),keyword:kw,reply:rep,status:"Active"}]); setKw(""); setRep(""); setAdding(false); } };
  const toggle = (id) => setResponders(r=>r.map(x=>x.id===id?{...x,status:x.status==="Active"?"Paused":"Active"}:x));
  const del = (id) => setResponders(r=>r.filter(x=>x.id!==id));
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <SectionTitle>Auto-Responder Rules</SectionTitle>
        <Btn onClick={()=>setAdding(!adding)}>+ Add Rule</Btn>
      </div>
      {adding&&(
        <Card style={{ marginBottom:16, border:`1.5px solid ${T.accent}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div><div style={{ fontSize:12, color:T.sub, marginBottom:6, fontWeight:600 }}>TRIGGER KEYWORDS (comma-separated)</div><Input value={kw} onChange={e=>setKw(e.target.value)} placeholder="Hi, Hello, Hey" style={{ width:"100%", boxSizing:"border-box" }} /></div>
            <div><div style={{ fontSize:12, color:T.sub, marginBottom:6, fontWeight:600 }}>AUTO REPLY MESSAGE</div><Input value={rep} onChange={e=>setRep(e.target.value)} placeholder="Welcome! How can we help?" style={{ width:"100%", boxSizing:"border-box" }} /></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={add}>Save Rule</Btn>
            <Btn variant="outline" onClick={()=>setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}
      {responders.map(r=>(
        <Card key={r.id} style={{ marginBottom:10, display:"flex", alignItems:"flex-start", gap:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:r.status==="Active"?T.accentLight:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🔄</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:12, color:T.sub, fontWeight:600 }}>KEYWORD:</span>
              <code style={{ background:"#f0fdf4", color:T.accentDark, padding:"2px 8px", borderRadius:5, fontSize:12, fontWeight:600 }}>{r.keyword}</code>
            </div>
            <div style={{ fontSize:13, color:T.text }}>{r.reply}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Badge status={r.status} />
            <button onClick={()=>toggle(r.id)} style={{ background:"none", border:"none", color:T.sub, cursor:"pointer", fontSize:12, padding:"4px 10px", borderRadius:6, border:`1px solid ${T.border}` }}>{r.status==="Active"?"Pause":"Activate"}</button>
            <button onClick={()=>del(r.id)} style={{ background:"none", border:"none", color:T.danger, cursor:"pointer", fontSize:18 }}>×</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ChatBot() {
  const [bots, setBots] = useState(BOTS);
  const [sel, setSel] = useState(null);
  const [flow, setFlow] = useState([{ id:1, msg:"Welcome! What can I help you with today?", opts:["Track Order","Pricing","Talk to Agent"] }]);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16 }}>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700 }}>Your ChatBots</div>
          <Btn style={{ padding:"6px 12px", fontSize:12 }}>+ New</Btn>
        </div>
        {bots.map(b=>(
          <div key={b.id} onClick={()=>setSel(b)} style={{ padding:"12px 14px", borderRadius:10, border:`1.5px solid ${sel?.id===b.id?T.accent:T.border}`, marginBottom:8, cursor:"pointer", background:sel?.id===b.id?T.accentLight:"white" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:600, fontSize:13 }}>{b.name}</div><Badge status={b.status} />
            </div>
            <div style={{ fontSize:11, color:T.sub, marginTop:4 }}>Trigger: {b.trigger}</div>
            <div style={{ fontSize:11, color:T.sub }}>{b.responses} conversations</div>
          </div>
        ))}
      </div>
      <Card>
        {sel ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div><div style={{ fontWeight:700, fontSize:16 }}>{sel.name}</div><div style={{ fontSize:12, color:T.sub }}>Flow Builder</div></div>
              <div style={{ display:"flex", gap:8 }}><Btn variant="ghost">+ Add Node</Btn><Btn>Save Flow</Btn></div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {flow.map((node,i)=>(
                <div key={node.id} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:T.accent, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, flexShrink:0 }}>{i+1}</div>
                    {i<flow.length-1&&<div style={{ width:2, height:30, background:T.border, margin:"4px 0" }} />}
                  </div>
                  <div style={{ flex:1, background:"#f8fafc", borderRadius:10, padding:"12px 14px", border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>BOT MESSAGE</div>
                    <div style={{ fontSize:13, color:T.text, marginBottom:node.opts?10:0 }}>{node.msg}</div>
                    {node.opts&&(
                      <div><div style={{ fontSize:11, color:T.sub, marginBottom:6 }}>Quick Replies:</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {node.opts.map(o=><span key={o} style={{ background:T.accentLight, color:T.accentDark, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{o}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ):(
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, color:T.sub }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🤖</div>
            <div style={{ fontWeight:600, fontSize:16 }}>Select a bot to edit its flow</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Templates() {
  const [tmpls, setTmpls] = useState(TEMPLATES);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", cat:"Marketing", body:"", btns:[] });
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <SectionTitle>Message Templates</SectionTitle>
        <Btn onClick={()=>setAdding(!adding)}>+ Create Template</Btn>
      </div>
      {adding&&(
        <Card style={{ marginBottom:18, border:`1.5px solid ${T.accent}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div><div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>TEMPLATE NAME</div><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. order_confirmation" style={{ width:"100%", boxSizing:"border-box" }} /></div>
            <div><div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>CATEGORY</div>
              <Select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} style={{ width:"100%" }}><option>Marketing</option><option>Transactional</option><option>Support</option><option>Onboarding</option></Select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}><div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>MESSAGE BODY</div><Textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Hi {{1}}, your order is ready!" style={{ width:"100%", minHeight:100, boxSizing:"border-box" }} /></div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={()=>{ if(form.name&&form.body){ setTmpls([...tmpls,{id:Date.now(),name:form.name,cat:form.cat,status:"Pending",body:form.body}]); setAdding(false); setForm({name:"",cat:"Marketing",body:"",btns:[]}); } }}>Submit for Approval</Btn>
            <Btn variant="outline" onClick={()=>setAdding(false)}>Cancel</Btn>
          </div>
        </Card>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {tmpls.map(t=>(
          <Card key={t.id}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div><div style={{ fontWeight:700, fontSize:15 }}>{t.name}</div><div style={{ fontSize:12, color:T.sub }}>{t.cat}</div></div>
              <Badge status={t.status} />
            </div>
            <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 12px", fontSize:13, color:T.text, lineHeight:1.55, marginBottom:12 }}>{t.body}</div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn variant="outline" style={{ flex:1, justifyContent:"center" }}>Edit</Btn>
              <Btn variant="ghost" style={{ flex:1, justifyContent:"center" }}>Use</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Contacts() {
  const [contacts, setContacts] = useState(CONTACTS);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", phone:"", email:"", tag:"Customer" });
  const fileRef = useRef();
  const filtered = contacts.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())||c.phone.includes(q));
  const add = () => { if(form.name&&form.phone){ setContacts([...contacts,{id:Date.now(),...form,optIn:true,lastMsg:"Just now"}]); setAdding(false); setForm({name:"",phone:"",email:"",tag:"Customer"}); } };
  return (
    <div>
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:18 }}>
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Search by name or phone…" style={{ flex:1 }} />
        <Select><option>All Tags</option><option>VIP</option><option>Lead</option><option>Customer</option></Select>
        <Btn variant="ghost" onClick={()=>{ fileRef.current.click(); }}>📥 Import CSV</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{ display:"none" }} />
        <Btn onClick={()=>setAdding(!adding)}>+ Add Contact</Btn>
      </div>
      {adding&&(
        <Card style={{ marginBottom:16, border:`1.5px solid ${T.accent}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            {[["Name","name","text","Full Name"],["Phone","phone","tel","+91 XXXXX XXXXX"],["Email","email","email","email@domain.com"]].map(([l,f,t,p])=>(
              <div key={f}><div style={{ fontSize:11, color:T.sub, fontWeight:600, marginBottom:5 }}>{l.toUpperCase()}</div><Input type={t} value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})} placeholder={p} style={{ width:"100%", boxSizing:"border-box" }} /></div>
            ))}
            <div><div style={{ fontSize:11, color:T.sub, fontWeight:600, marginBottom:5 }}>TAG</div>
              <Select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} style={{ width:"100%" }}><option>Customer</option><option>Lead</option><option>VIP</option></Select>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}><Btn onClick={add}>Save Contact</Btn><Btn variant="outline" onClick={()=>setAdding(false)}>Cancel</Btn></div>
        </Card>
      )}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:"#f8fafc" }}>{["Name","Phone","Email","Tag","Opt-In","Last Message","Actions"].map(h=><th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:11, color:T.sub, fontWeight:700, letterSpacing:"0.05em", borderBottom:`1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"13px 16px" }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent}30,${T.accentDark}30)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:T.accentDark, fontSize:13 }}>{c.name[0]}</div><span style={{ fontWeight:600, fontSize:13 }}>{c.name}</span></div></td>
                <td style={{ padding:"13px 16px", fontSize:13, color:T.sub }}>{c.phone}</td>
                <td style={{ padding:"13px 16px", fontSize:13, color:T.sub }}>{c.email}</td>
                <td style={{ padding:"13px 16px" }}><Badge status={c.tag} /></td>
                <td style={{ padding:"13px 16px" }}><span style={{ color:c.optIn?T.accent:T.danger, fontWeight:700, fontSize:13 }}>{c.optIn?"✓ Yes":"✗ No"}</span></td>
                <td style={{ padding:"13px 16px", fontSize:12, color:T.sub }}>{c.lastMsg}</td>
                <td style={{ padding:"13px 16px" }}><div style={{ display:"flex", gap:6 }}><Btn variant="ghost" style={{ padding:"5px 12px", fontSize:12 }}>Message</Btn><button onClick={()=>setContacts(contacts.filter(x=>x.id!==c.id))} style={{ background:"none", border:"none", color:T.danger, cursor:"pointer", fontSize:18 }}>×</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ContactExport() {
  const [fmt, setFmt] = useState("csv");
  const [fields, setFields] = useState(["name","phone","email","tag"]);
  const toggleField = (f) => setFields(p=>p.includes(f)?p.filter(x=>x!==f):[...p,f]);
  const allFields = ["name","phone","email","tag","optIn","lastMsg"];
  const doExport = () => {
    const rows = [fields.join(","), ...CONTACTS.map(c=>fields.map(f=>c[f]).join(","))].join("\n");
    const blob = new Blob([rows],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`contacts.${fmt}`; a.click();
  };
  return (
    <div style={{ maxWidth:600 }}>
      <Card>
        <SectionTitle>Export Contacts</SectionTitle>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:10 }}>SELECT EXPORT FORMAT</div>
          <div style={{ display:"flex", gap:10 }}>
            {["csv","xlsx","json"].map(f=>(
              <div key={f} onClick={()=>setFmt(f)} style={{ flex:1, padding:"12px", border:`1.5px solid ${fmt===f?T.accent:T.border}`, borderRadius:9, textAlign:"center", cursor:"pointer", background:fmt===f?T.accentLight:"white" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{f==="csv"?"📄":f==="xlsx"?"📊":"📦"}</div>
                <div style={{ fontWeight:700, fontSize:13, color:fmt===f?T.accentDark:T.text }}>{f.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:10 }}>SELECT FIELDS TO EXPORT</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {allFields.map(f=>(
              <div key={f} onClick={()=>toggleField(f)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${fields.includes(f)?T.accent:T.border}`, cursor:"pointer", background:fields.includes(f)?T.accentLight:"white", fontSize:13, fontWeight:fields.includes(f)?600:400, color:fields.includes(f)?T.accentDark:T.sub }}>{fields.includes(f)?"✓ ":""}{f}</div>
            ))}
          </div>
        </div>
        <div style={{ background:"#f8fafc", borderRadius:10, padding:14, marginBottom:18 }}>
          <div style={{ fontSize:12, color:T.sub, marginBottom:4 }}>Preview ({CONTACTS.length} contacts)</div>
          <code style={{ fontSize:12, color:T.text }}>{fields.join(", ")}</code>
        </div>
        <Btn onClick={doExport} style={{ width:"100%", justifyContent:"center" }}>📥 Export {CONTACTS.length} Contacts as {fmt.toUpperCase()}</Btn>
      </Card>
    </div>
  );
}

function WAAPI() {
  const [copied, setCopied] = useState("");
  const copy = (key, val) => { navigator.clipboard.writeText(val).catch(()=>{}); setCopied(key); setTimeout(()=>setCopied(""),2000); };
  const creds = [{ label:"Instance ID", value:"instance_wa_8xK92mP3vN", icon:"🔑" },{ label:"Access Token", value:"bearer_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", icon:"🔐" },{ label:"Webhook URL", value:"https://api.wasend.io/webhook/instance_wa_8xK92mP3vN", icon:"🔌" },{ label:"API Base URL", value:"https://api.wasend.io/v1", icon:"🌐" }];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <Card>
        <SectionTitle>API Credentials</SectionTitle>
        {creds.map(c=>(
          <div key={c.label} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:T.sub, fontWeight:700, marginBottom:6, letterSpacing:"0.05em" }}>{c.icon} {c.label}</div>
            <div style={{ display:"flex", gap:8 }}>
              <Input value={c.value} readOnly style={{ flex:1, fontFamily:"monospace", fontSize:12 }} />
              <Btn variant="ghost" style={{ padding:"10px 14px" }} onClick={()=>copy(c.label,c.value)}>{copied===c.label?"✓":"Copy"}</Btn>
            </div>
          </div>
        ))}
        <div style={{ background:"#fff7ed", border:`1px solid #fed7aa`, borderRadius:10, padding:12, marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#c2410c" }}>⚠️ Keep these secure</div>
          <div style={{ fontSize:12, color:"#c2410c", marginTop:4 }}>Never expose your Access Token in frontend code. Use a backend proxy.</div>
        </div>
      </Card>
      <Card>
        <SectionTitle>Send Message — API Reference</SectionTitle>
        <div style={{ background:"#1a2332", borderRadius:10, padding:16, fontFamily:"monospace", fontSize:12, color:"#e2e8f0", overflow:"auto", lineHeight:1.7 }}>
          <span style={{ color:"#7dd3fc" }}>POST</span> <span style={{ color:"#86efac" }}>https://api.wasend.io/v1/messages</span>{"\n"}
          <span style={{ color:"#fbbf24" }}>Authorization:</span> Bearer {"<YOUR_TOKEN>"}{"\n\n"}
          {"{"}{"\n"}
          {"  "}<span style={{ color:"#c084fc" }}>"phone"</span>: <span style={{ color:"#86efac" }}>"+919876543210"</span>,{"\n"}
          {"  "}<span style={{ color:"#c084fc" }}>"type"</span>: <span style={{ color:"#86efac" }}>"template"</span>,{"\n"}
          {"  "}<span style={{ color:"#c084fc" }}>"template"</span>: {"{"}{"\n"}
          {"    "}<span style={{ color:"#c084fc" }}>"name"</span>: <span style={{ color:"#86efac" }}>"order_confirmation"</span>,{"\n"}
          {"    "}<span style={{ color:"#c084fc" }}>"language"</span>: <span style={{ color:"#86efac" }}>"en"</span>,{"\n"}
          {"    "}<span style={{ color:"#c084fc" }}>"components"</span>: [{"\n"}
          {"      "}{"{ "}<span style={{ color:"#c084fc" }}>"type"</span>: <span style={{ color:"#86efac" }}>"body"</span>,{"\n"}
          {"        "}<span style={{ color:"#c084fc" }}>"parameters"</span>: [{"\n"}
          {"          "}{"{"}<span style={{ color:"#c084fc" }}>"type"</span>:<span style={{ color:"#86efac" }}>"text"</span>,<span style={{ color:"#c084fc" }}>"text"</span>:<span style={{ color:"#86efac" }}>"Aarav"</span>{"}"}{"\n"}
          {"        "}]{"\n"}{"      "}{"}"}{"\n"}
          {"    "}]{"\n"}{"  "}{"}"}{"\n"}
          {"}"}
        </div>
        <Btn variant="ghost" style={{ marginTop:12, width:"100%", justifyContent:"center" }} onClick={()=>copy("code","code")}>Copy Code</Btn>
      </Card>
    </div>
  );
}

function Integrations({ type }) {
  const configs = {
    razorpay: { title:"Razorpay Integration", icon:"💳", color:"#2563eb", fields:[{l:"Razorpay Key ID",p:"rzp_live_xxxxxxxxxxxxxxxx"},{l:"Razorpay Key Secret",p:"••••••••••••••••"},{l:"Webhook Secret",p:"whsec_xxxxxxxxxxxxxxxx"}], events:["payment.captured","payment.failed","refund.created","subscription.activated","order.paid"], desc:"Send instant WhatsApp notifications to customers on every Razorpay payment event." },
    cashfree: { title:"CashFree Integration", icon:"🏦", color:"#0891b2", fields:[{l:"App ID",p:"CF_APP_ID_xxxxxxxx"},{l:"Secret Key",p:"••••••••••••••••"},{l:"Environment",p:"Production"}], events:["PAYMENT_SUCCESS","PAYMENT_FAILED","REFUND_STATUS","SETTLEMENT","DISPUTE"], desc:"Connect CashFree to send real-time payment alerts and confirmations via WhatsApp." },
    webhook: { title:"Webhook Configuration", icon:"🔌", color:"#7c3aed", fields:[{l:"Your Webhook URL",p:"https://yourdomain.com/whatsapp/webhook"},{l:"Verify Token",p:"your_verify_token"},{l:"Secret Signing Key",p:"auto-generated"}], events:["message.received","message.delivered","message.read","campaign.sent","contact.optout"], desc:"Receive real-time events from your WhatsApp Business Account to your server." },
    api_docs: null,
  };
  if(type==="api_docs") return <WAAPI />;
  const cfg = configs[type];
  if(!cfg) return null;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:cfg.color+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{cfg.icon}</div>
            <div><div style={{ fontWeight:700, fontSize:16 }}>{cfg.title}</div><div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{cfg.desc}</div></div>
          </div>
          {cfg.fields.map(f=>(
            <div key={f.l} style={{ marginBottom:13 }}>
              <div style={{ fontSize:11, color:T.sub, fontWeight:700, marginBottom:6, letterSpacing:"0.05em" }}>{f.l.toUpperCase()}</div>
              <Input placeholder={f.p} style={{ width:"100%", boxSizing:"border-box" }} />
            </div>
          ))}
          <Btn style={{ width:"100%", justifyContent:"center", marginTop:4 }}>🔗 Connect {cfg.title.split(" ")[0]}</Btn>
        </Card>
      </div>
      <Card>
        <SectionTitle>Subscribe to Events</SectionTitle>
        <div style={{ marginBottom:12, fontSize:13, color:T.sub }}>Select which events trigger a WhatsApp message:</div>
        {cfg.events.map(ev=>(
          <div key={ev} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
            <div><code style={{ background:"#f1f5f9", padding:"3px 8px", borderRadius:5, fontSize:12, color:T.text }}>{ev}</code></div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <div style={{ position:"relative" }}>
                <input type="checkbox" defaultChecked style={{ opacity:0, width:0 }} />
                <div style={{ width:36, height:20, background:T.accent, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", padding:2 }}>
                  <div style={{ width:16, height:16, background:"white", borderRadius:"50%", marginLeft:"auto" }} />
                </div>
              </div>
            </label>
          </div>
        ))}
        <div style={{ marginTop:16, background:"#f0fdf4", borderRadius:10, padding:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.accentDark, marginBottom:4 }}>Test Webhook</div>
          <Btn variant="ghost" style={{ fontSize:12 }}>📨 Send Test Event</Btn>
        </div>
      </Card>
    </div>
  );
}

function QRGenerator() {
  const [link, setLink] = useState("https://wa.me/919876543210?text=Hello");
  const [msg, setMsg] = useState("Hello");
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>
      <Card>
        <SectionTitle>WhatsApp Link & QR Generator</SectionTitle>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>PHONE NUMBER</div>
          <Input defaultValue="+91 98765 43210" style={{ width:"100%", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>PRE-FILLED MESSAGE</div>
          <Input value={msg} onChange={e=>{ setMsg(e.target.value); setLink(`https://wa.me/919876543210?text=${encodeURIComponent(e.target.value)}`); }} style={{ width:"100%", boxSizing:"border-box" }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, color:T.sub, fontWeight:600, marginBottom:6 }}>GENERATED LINK</div>
          <div style={{ display:"flex", gap:8 }}>
            <Input value={link} readOnly style={{ flex:1, fontFamily:"monospace", fontSize:12 }} />
            <Btn variant="ghost">Copy</Btn>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn style={{ flex:1, justifyContent:"center" }}>📷 Download QR Code</Btn>
          <Btn variant="ghost" style={{ flex:1, justifyContent:"center" }}>🔗 Copy Link</Btn>
        </div>
      </Card>
      <Card style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
        <div style={{ fontSize:13, color:T.sub, fontWeight:600 }}>QR CODE PREVIEW</div>
        <div style={{ width:180, height:180, background:"#f8fafc", border:`2px solid ${T.border}`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
          {/* Simulated QR */}
          <svg width="140" height="140" viewBox="0 0 140 140">
            {Array.from({length:7}).map((_,row)=>Array.from({length:7}).map((_,col)=>{
              const pat = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,0,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]];
              return <rect key={`${row}-${col}`} x={col*20} y={row*20} width={18} height={18} fill={pat[row][col]?"#1a2332":"white"} rx={2} />;
            }))}
            {Array.from({length:5}).map((_,i)=><rect key={`d${i}`} x={70+i*14} y={70} width={12} height={12} fill={Math.random()>0.5?"#1a2332":"white"} rx={2} />)}
          </svg>
        </div>
        <div style={{ fontSize:11, color:T.sub, textAlign:"center" }}>Scan to open WhatsApp<br/>with pre-filled message</div>
      </Card>
    </div>
  );
}

function WhiteLabel() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
      <Card>
        <SectionTitle>Brand Customization</SectionTitle>
        {[["Brand Name","WASend","text"],["Logo URL","https://yourdomain.com/logo.png","url"],["Primary Color","#25D366","color"],["Support Email","support@yourdomain.com","email"],["Custom Domain","app.yourdomain.com","text"]].map(([l,d,t])=>(
          <div key={l} style={{ marginBottom:13 }}>
            <div style={{ fontSize:11, color:T.sub, fontWeight:600, marginBottom:6 }}>{l.toUpperCase()}</div>
            <Input type={t} defaultValue={d} style={{ width:"100%", boxSizing:"border-box" }} />
          </div>
        ))}
        <Btn style={{ width:"100%", justifyContent:"center" }}>💾 Save Branding</Btn>
      </Card>
      <Card>
        <SectionTitle>Users & Permissions</SectionTitle>
        {[{ name:"Admin User", email:"admin@company.com", role:"Admin", status:"Active" },{ name:"Sales Manager", email:"sales@company.com", role:"Manager", status:"Active" },{ name:"Support Agent", email:"support@company.com", role:"Agent", status:"Active" }].map(u=>(
          <div key={u.email} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent}40,${T.accentDark}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:T.accentDark }}>{u.name[0]}</div>
            <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div><div style={{ fontSize:11, color:T.sub }}>{u.email}</div></div>
            <Badge status={u.role} />
            <Badge status={u.status} />
          </div>
        ))}
        <Btn style={{ marginTop:14, width:"100%", justifyContent:"center" }}>+ Invite User</Btn>
      </Card>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const renderPage = () => {
    switch(active) {
      case "dashboard": return <Dashboard />;
      case "wa_account": case "wa_group": return <WAAccount />;
      case "campaign_summary": return <CampaignSummary />;
      case "create_campaign": return <CreateCampaign />;
      case "single_message": return <CreateCampaign />;
      case "auto_responder": return <AutoResponder />;
      case "chatbot": return <ChatBot />;
      case "msg_template": case "list_template": return <Templates />;
      case "contacts": return <Contacts />;
      case "contact_export": return <ContactExport />;
      case "qr_generator": return <QRGenerator />;
      case "razorpay": return <Integrations type="razorpay" />;
      case "cashfree": return <Integrations type="cashfree" />;
      case "webhook": return <Integrations type="webhook" />;
      case "api_docs": case "wa_api": return <WAAPI />;
      case "white_label": case "users_list": return <WhiteLabel />;
      default: return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:T.sub, fontSize:16 }}>🚧 Coming Soon</div>;
    }
  };

  const currentLabel = NAV.flatMap(s=>s.items).find(i=>i.id===active);

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", color:T.text, overflow:"hidden" }}>
      {/* Sidebar */}
      <div style={{ width:collapsed?64:248, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", transition:"width 0.25s", overflow:"hidden", flexShrink:0, boxShadow:"2px 0 12px rgba(0,0,0,0.04)" }}>
        {/* Logo */}
        <div style={{ padding:"18px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>setCollapsed(!collapsed)}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${T.accent},${T.accentDark})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.113 1.523 5.845L0 24l6.335-1.507A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.656-.488-5.193-1.342l-.372-.22-3.761.895.952-3.656-.242-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          </div>
          {!collapsed&&<div><div style={{ fontWeight:800, fontSize:16, lineHeight:1 }}>WA<span style={{ color:T.accent }}>Send</span></div><div style={{ fontSize:10, color:T.sub, marginTop:1 }}>Business Platform</div></div>}
        </div>
        {/* Add Account Btn */}
        {!collapsed&&(
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>
            <button style={{ width:"100%", padding:"9px", borderRadius:8, border:`1.5px dashed ${T.accent}`, background:T.accentLight, color:T.accentDark, fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              + Add Account
            </button>
          </div>
        )}
        {/* Nav */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 8px" }}>
          {NAV.map(section=>(
            <div key={section.section}>
              {!collapsed&&<div style={{ fontSize:10, fontWeight:800, color:"#94a3b8", letterSpacing:"0.08em", padding:"12px 8px 4px" }}>{section.section}</div>}
              {section.items.map(item=>(
                <div key={item.id} onClick={()=>setActive(item.id)} title={collapsed?item.label:""} style={{ display:"flex", alignItems:"center", gap:10, padding:collapsed?"10px 14px":"9px 10px", borderRadius:9, cursor:"pointer", marginBottom:1, background:active===item.id?T.accentLight:"transparent", color:active===item.id?T.accentDark:T.sub, fontWeight:active===item.id?700:400, transition:"all 0.12s", overflow:"hidden", whiteSpace:"nowrap" }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                  {!collapsed&&<div style={{ flex:1, overflow:"hidden" }}><div style={{ fontSize:13, overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</div></div>}
                  {!collapsed&&active===item.id&&<div style={{ width:5, height:5, borderRadius:"50%", background:T.accent, flexShrink:0 }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Meta Badge */}
        {!collapsed&&(
          <div style={{ padding:12, borderTop:`1px solid ${T.border}` }}>
            <div style={{ background:T.accentLight, borderRadius:9, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>✅</span>
              <div><div style={{ fontSize:12, fontWeight:700, color:T.accentDark }}>Meta Verified</div><div style={{ fontSize:10, color:T.sub }}>WABA Active</div></div>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ padding:"14px 24px", background:T.panel, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:T.text }}>{currentLabel?.label||"Dashboard"}</div>
            <div style={{ fontSize:12, color:T.sub }}>{currentLabel?.sub||"Overview"}</div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ background:T.accentLight, padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, color:T.accentDark }}>📱 +91 98765 43210</div>
            <div style={{ position:"relative", cursor:"pointer" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${T.accent},${T.accentDark})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:15 }}>A</div>
              <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, background:T.accent, border:"2px solid white", borderRadius:"50%" }} />
            </div>
          </div>
        </div>
        {/* Page */}
        <div style={{ flex:1, overflowY:"auto", padding:22 }}>
          {renderPage()}
        </div>
      </div>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:10px; }
        input[type=color] { padding:2px 4px; cursor:pointer; }
      `}</style>
    </div>
  );
}
