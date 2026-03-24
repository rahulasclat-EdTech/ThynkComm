import { useState, useRef, useEffect } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg: "#f0f7f4", sidebar: "#ffffff", card: "#ffffff",
  accent: "#25d366", accent2: "#128c7e", accentLight: "#e8f8f0",
  border: "#e4ede9", text: "#1a2e25", sub: "#6b8a7a",
  red: "#ef4444", yellow: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6",
};

const pill  = (color, bg) => ({ background: bg, color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "inline-block" });
const card  = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" };
const inp   = { background: "#f8fbf9", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "10px 13px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
const btn   = (variant = "primary") => ({
  padding: "10px 20px", borderRadius: 9, border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14,
  background: variant === "primary" ? `linear-gradient(135deg, ${C.accent}, ${C.accent2})` : variant === "ghost" ? "transparent" : "#f0f7f4",
  color: variant === "primary" ? "white" : variant === "ghost" ? C.sub : C.text,
  transition: "all 0.15s",
});

// ─── NAV STRUCTURE ───────────────────────────────────────────────
const NAV = [
  { section: null, items: [{ id: "dashboard", label: "Dashboard", icon: "⊞", sub: "Overview" }] },
  { section: "ACCOUNTS", items: [
    { id: "wa-account", label: "WhatsApp Account", icon: "📱", sub: "Account Added" },
    { id: "wa-group",   label: "Account Group",    icon: "👥", sub: "Create & manage groups" },
  ]},
  { section: "CAMPAIGN", items: [
    { id: "campaign-summary", label: "Campaign Summary",    icon: "📊", sub: "Find campaign summary" },
    { id: "create-campaign",  label: "Create Campaign",     icon: "📤", sub: "Create & send messages" },
    { id: "send-single",      label: "Send Single Message", icon: "✉️", sub: "Send a message" },
    { id: "auto-responder",   label: "Auto-Responder",      icon: "🔄", sub: "Reply 24/7 automatically" },
    { id: "chatbot",          label: "ChatBot",             icon: "🤖", sub: "Automated conversation" },
  ]},
  { section: "TEMPLATE", items: [
    { id: "msg-template",  label: "Message Template",      icon: "📝", sub: "Create captions" },
    { id: "list-template", label: "List Message Template", icon: "📋", sub: "Create with options" },
  ]},
  { section: "CONTACT", items: [
    { id: "contacts", label: "Contacts", icon: "🧑‍🤝‍🧑", sub: "Create, edit contacts" },
  ]},
  { section: "TOOLS", items: [
    { id: "group-grabber", label: "Group Grabber",       icon: "🔗", sub: "Export group contacts" },
    { id: "wa-warmer",     label: "WhatsApp Warmer",     icon: "♻️", sub: "Activate inactive numbers" },
    { id: "link-qr",       label: "Link & QR Generator", icon: "⬛", sub: "QR codes & chat links" },
    { id: "wa-api",        label: "WhatsApp API",        icon: "🔌", sub: "Instance ID & access token" },
    { id: "integrations",  label: "Integrations",        icon: "⚡", sub: "Razorpay, Cashfree & more" },
  ]},
  { section: "WHITE LABEL", items: [
    { id: "white-label", label: "White Label", icon: "🏷️", sub: "Customize your website" },
    { id: "users-list",  label: "Users List",  icon: "👤", sub: "See your users list" },
  ]},
];

const scColor = {
  Completed: [C.accent, C.accentLight], Running: ["#3b82f6","#eff6ff"],
  Paused: [C.yellow,"#fef3c7"], Active: [C.accent, C.accentLight],
  Approved: [C.accent, C.accentLight], Pending: [C.yellow,"#fef3c7"],
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────
function Badge({ status }) {
  const [c, bg] = scColor[status] || [C.sub, "#f0f4f2"];
  return <span style={pill(c, bg)}>{status}</span>;
}
function Stat({ icon, label, value, delta, color }) {
  return (
    <div style={{ ...card, display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:800, color: color||C.text }}>{value}</div>
      <div style={{ fontSize:12, color:C.sub }}>{label}</div>
      {delta && <div style={{ fontSize:12, color:C.accent, fontWeight:600 }}>{delta}</div>}
    </div>
  );
}
function Loader() {
  return <div style={{ textAlign:"center", padding:40, color:C.sub, fontSize:14 }}>Loading...</div>;
}
function ErrorBox({ msg }) {
  return <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"12px 16px", color:C.red, fontSize:13 }}>⚠️ {msg}</div>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(data => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalSent      = campaigns.reduce((s,c) => s + (c.sent||0), 0);
  const totalFailed    = campaigns.reduce((s,c) => s + (c.failed||0), 0);
  const totalDelivered = totalSent - totalFailed;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="📤" label="Messages Sent"    value={totalSent.toLocaleString()}      color={C.accent2} />
        <Stat icon="✅" label="Delivered"         value={totalDelivered.toLocaleString()} color={C.blue} />
        <Stat icon="🚀" label="Total Campaigns"   value={campaigns.length}                color={C.purple} />
        <Stat icon="❌" label="Failed"            value={totalFailed.toLocaleString()}    color={C.red} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 }}>
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700 }}>Recent Campaigns</h3>
          {loading ? <Loader /> : campaigns.slice(0,4).map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                <div style={{ fontSize:12, color:C.sub }}>{(c.sent||0).toLocaleString()} sent</div>
              </div>
              <Badge status={c.status} />
            </div>
          ))}
          {!loading && campaigns.length === 0 && <div style={{ color:C.sub, fontSize:13 }}>No campaigns yet.</div>}
        </div>
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700 }}>Delivery Funnel</h3>
          {[["Sent", totalSent, C.blue],["Delivered", totalDelivered, C.accent],["Failed", totalFailed, C.red]].map(([l,v,c])=>(
            <div key={l} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                <span style={{ color:C.sub }}>{l}</span>
                <span style={{ fontWeight:700 }}>{v.toLocaleString()}</span>
              </div>
              <div style={{ background:C.border, borderRadius:99, height:7 }}>
                <div style={{ width:`${totalSent>0?(v/totalSent)*100:0}%`, height:"100%", borderRadius:99, background:c }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CONTACTS ─────────────────────────────────────────────────────
function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState({ name:"", phone:"", email:"", tag:"Lead" });
  const [saving, setSaving]     = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/contacts")
      .then(r => r.json())
      .then(data => { setContacts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(load, []);

  const addContact = async () => {
    if (!form.name || !form.phone) return alert("Name and phone are required");
    setSaving(true);
    const r = await fetch("/api/contacts", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (r.ok) { setShowAdd(false); setForm({ name:"", phone:"", email:"", tag:"Lead" }); load(); }
    else { const d = await r.json(); alert(d.error); }
  };

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Contacts</h2>
        <button style={btn()} onClick={() => setShowAdd(!showAdd)}>+ Add Contact</button>
      </div>

      {error && <ErrorBox msg={error} />}

      {showAdd && (
        <div style={{ ...card, marginBottom:16, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>Add New Contact</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>NAME *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Full Name" /></div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PHONE * (with country code)</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="919999999999" /></div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>EMAIL</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="email@example.com" /></div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TAG</label>
              <select value={form.tag} onChange={e=>setForm({...form,tag:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option>Lead</option><option>Customer</option><option>VIP</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn()} onClick={addContact} disabled={saving}>{saving?"Saving...":"Save Contact"}</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>All Contacts ({filtered.length})</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, width:220, fontSize:13 }} />
        </div>
        {loading ? <Loader /> : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Name","Phone","Email","Tag","Opt-In"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px", fontWeight:600 }}>{c.name}</td>
                  <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{c.phone}</td>
                  <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{c.email}</td>
                  <td style={{ padding:"12px" }}><span style={pill(C.blue,"#eff6ff")}>{c.tag}</span></td>
                  <td style={{ padding:"12px" }}><Badge status={c.opt_in?"Active":"Paused"}/></td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={5} style={{ padding:20, textAlign:"center", color:C.sub }}>No contacts found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── CAMPAIGN SUMMARY ─────────────────────────────────────────────
function CampaignSummary() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    fetch("/api/campaigns")
      .then(r => r.json())
      .then(data => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = campaigns.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Campaign Summary</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="🚀" label="Total"     value={campaigns.length} />
        <Stat icon="✅" label="Completed" value={campaigns.filter(c=>c.status==="Completed").length} color={C.accent} />
        <Stat icon="⚡" label="Running"   value={campaigns.filter(c=>c.status==="Running").length}   color={C.blue} />
        <Stat icon="⏸" label="Paused"    value={campaigns.filter(c=>c.status==="Paused").length}    color={C.yellow} />
      </div>
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>All Campaigns</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, width:220, fontSize:13 }} />
        </div>
        {loading ? <Loader /> : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Campaign","Sent","Delivered","Failed","Date","Status"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px", fontWeight:600 }}>{c.name}</td>
                  <td style={{ padding:"12px", fontWeight:600 }}>{(c.sent||0).toLocaleString()}</td>
                  <td style={{ padding:"12px", color:C.accent, fontWeight:600 }}>{(c.delivered||0).toLocaleString()}</td>
                  <td style={{ padding:"12px", color:C.red, fontWeight:600 }}>{c.failed||0}</td>
                  <td style={{ padding:"12px", fontSize:13, color:C.sub }}>{c.created_at?.split("T")[0]}</td>
                  <td style={{ padding:"12px" }}><Badge status={c.status}/></td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:C.sub }}>No campaigns yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── SEND SINGLE MESSAGE ──────────────────────────────────────────
function SendSingle() {
  const [to, setTo]         = useState("");
  const [msg, setMsg]       = useState("");
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"
  const [errMsg, setErrMsg] = useState("");

  const send = async () => {
    if (!to || !msg) return alert("Phone number and message are required");
    setStatus("sending");
    try {
      const r = await fetch("/api/send-message", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ to: to.replace(/\D/g,""), message: msg }),
      });
      const data = await r.json();
      if (r.ok) { setStatus("success"); setTo(""); setMsg(""); }
      else { setStatus("error"); setErrMsg(data.error?.error?.message || JSON.stringify(data.error)); }
    } catch (e) { setStatus("error"); setErrMsg(e.message); }
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Send Single Message</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={card}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Recipient</h3>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PHONE NUMBER (with country code)</label>
            <input value={to} onChange={e=>setTo(e.target.value)} style={{ ...inp, marginTop:5 }} placeholder="919999999999" />
            <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>Example: 919999999999 (91 = India code, no + or spaces)</div>
          </div>
          <div style={card}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message</h3>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} style={{ ...inp, minHeight:120, resize:"vertical" }} placeholder="Type your message here..." />
            <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{msg.length}/4096</div>
          </div>
          {status==="success" && <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"12px 16px", color:C.accent2, fontWeight:600 }}>✅ Message sent successfully!</div>}
          {status==="error"   && <ErrorBox msg={errMsg} />}
          <button style={{ ...btn(), alignSelf:"flex-start", minWidth:160 }} onClick={send} disabled={status==="sending"}>
            {status==="sending" ? "Sending..." : "📤 Send Message"}
          </button>
        </div>
        <div style={{ ...card, alignSelf:"flex-start" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>Preview</h3>
          <div style={{ background:"#e5ddd5", borderRadius:12, padding:14, minHeight:200 }}>
            <div style={{ background:"white", borderRadius:"0 10px 10px 10px", padding:"10px 14px", fontSize:13, maxWidth:"80%", boxShadow:"0 1px 2px rgba(0,0,0,0.1)", whiteSpace:"pre-wrap" }}>
              {msg || <span style={{ color:"#aaa" }}>Your message will appear here</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE CAMPAIGN ──────────────────────────────────────────────
function CreateCampaign() {
  const [step, setStep]                 = useState(1);
  const [contacts, setContacts]         = useState([]);
  const [selectedContacts, setSelected] = useState([]);
  const [message, setMessage]           = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [status, setStatus]             = useState(null);
  const [result, setResult]             = useState(null);

  useEffect(()=>{
    fetch("/api/contacts").then(r=>r.json()).then(d=>setContacts(Array.isArray(d)?d:[]));
  },[]);

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const send = async () => {
    if (!campaignName) return alert("Campaign name is required");
    if (!selectedContacts.length) return alert("Select at least one contact");
    if (!message) return alert("Message is required");
    setStatus("sending");
    try {
      const r = await fetch("/api/campaigns", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name:campaignName, contactIds:selectedContacts, message }),
      });
      const data = await r.json();
      if (r.ok) { setStatus("success"); setResult(data); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
  };

  const steps = ["Name Campaign","Compose Message","Choose Recipients","Review & Send"];

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Create Campaign</h2>
      {/* Stepper */}
      <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
        {steps.map((s,i)=>(
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i<steps.length-1?1:"none" }}>
            <div onClick={()=>setStep(i+1)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:step>=i+1?`linear-gradient(135deg,${C.accent},${C.accent2})`:C.border, color:step>=i+1?"white":C.sub, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>{step>i+1?"✓":i+1}</div>
              <span style={{ fontSize:13, fontWeight:step===i+1?700:400, color:step>=i+1?C.text:C.sub, whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{ flex:1, height:2, background:step>i+1?C.accent:C.border, margin:"0 10px" }} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step===1 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Campaign Name</h3>
          <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} style={inp} placeholder="e.g. Diwali Sale 2025" />
          <button style={{ ...btn(), marginTop:14 }} onClick={()=>setStep(2)}>Continue →</button>
        </div>
      )}

      {/* Step 2 */}
      {step===2 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message</h3>
          <textarea value={message} onChange={e=>setMessage(e.target.value)} style={{ ...inp, minHeight:140, resize:"vertical" }} placeholder="Type your campaign message... Use {{1}}, {{2}} for variables." />
          <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{message.length}/4096</div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn("secondary")} onClick={()=>setStep(1)}>← Back</button>
            <button style={btn()} onClick={()=>setStep(3)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step===3 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Select Recipients ({selectedContacts.length} selected)</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:300, overflowY:"auto" }}>
            {contacts.filter(c=>c.opt_in).map(c=>(
              <div key={c.id} onClick={()=>toggle(c.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:9, border:`2px solid ${selectedContacts.includes(c.id)?C.accent:C.border}`, cursor:"pointer", background:selectedContacts.includes(c.id)?C.accentLight:"white" }}>
                <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${selectedContacts.includes(c.id)?C.accent:C.border}`, background:selectedContacts.includes(c.id)?C.accent:"white", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:12 }}>
                  {selectedContacts.includes(c.id)?"✓":""}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:C.sub }}>{c.phone}</div>
                </div>
                <span style={pill(C.blue,"#eff6ff")}>{c.tag}</span>
              </div>
            ))}
            {contacts.length===0 && <div style={{ color:C.sub, fontSize:13 }}>No opted-in contacts found. Add contacts first.</div>}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn("secondary")} onClick={()=>setStep(2)}>← Back</button>
            <button style={btn()} onClick={()=>setStep(4)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step===4 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Review & Send</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:C.bg, borderRadius:9 }}>
              <span style={{ color:C.sub, fontSize:13 }}>Campaign Name</span>
              <span style={{ fontWeight:700, fontSize:13 }}>{campaignName}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:C.bg, borderRadius:9 }}>
              <span style={{ color:C.sub, fontSize:13 }}>Recipients</span>
              <span style={{ fontWeight:700, fontSize:13 }}>{selectedContacts.length} contacts</span>
            </div>
            <div style={{ padding:"10px 14px", background:C.bg, borderRadius:9 }}>
              <div style={{ color:C.sub, fontSize:13, marginBottom:4 }}>Message Preview</div>
              <div style={{ fontSize:13, whiteSpace:"pre-wrap" }}>{message}</div>
            </div>
          </div>
          {status==="success" && result && (
            <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontWeight:700, color:C.accent2, marginBottom:4 }}>✅ Campaign Sent!</div>
              <div style={{ fontSize:13, color:C.sub }}>Sent: {result.sent} | Failed: {result.failed}</div>
            </div>
          )}
          {status==="error" && <ErrorBox msg="Something went wrong. Check your API credentials." />}
          <div style={{ display:"flex", gap:10 }}>
            <button style={btn("secondary")} onClick={()=>setStep(3)}>← Back</button>
            <button style={{ ...btn(), minWidth:160 }} onClick={send} disabled={status==="sending"}>
              {status==="sending" ? "⏳ Sending..." : "🚀 Launch Campaign"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLACEHOLDER ──────────────────────────────────────────────────
function Placeholder({ title, icon, desc }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:56, marginBottom:16 }}>{icon}</div>
      <h2 style={{ margin:"0 0 10px", fontSize:20, fontWeight:800, color:C.text }}>{title}</h2>
      <p style={{ color:C.sub, fontSize:14, margin:"0 0 20px" }}>{desc}</p>
      <button style={btn()}>Get Started</button>
    </div>
  );
}

// ─── LINK & QR ────────────────────────────────────────────────────
function LinkQR() {
  const [phone, setPhone]       = useState("");
  const [preMsg, setPreMsg]     = useState("Hi! I'm interested in your products.");
  const [generated, setGenerated] = useState(false);
  const link = `https://wa.me/${phone.replace(/\D/g,"")}?text=${encodeURIComponent(preMsg)}`;

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Link & QR Code Generator</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={card}>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>WHATSAPP NUMBER</label><input value={phone} onChange={e=>setPhone(e.target.value)} style={{ ...inp, marginTop:5 }} placeholder="919999999999" /></div>
              <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PRE-FILLED MESSAGE</label><textarea value={preMsg} onChange={e=>setPreMsg(e.target.value)} style={{ ...inp, minHeight:80, resize:"vertical", marginTop:5 }} /></div>
            </div>
            <button style={{ ...btn(), marginTop:14, width:"100%" }} onClick={()=>setGenerated(true)}>⚡ Generate</button>
          </div>
          {generated && (
            <div style={{ ...card, border:`1.5px solid ${C.accent}` }}>
              <h4 style={{ margin:"0 0 10px", color:C.accent2 }}>Your WhatsApp Link</h4>
              <div style={{ display:"flex", gap:8 }}>
                <input readOnly value={link} style={{ ...inp, fontFamily:"monospace", fontSize:12 }} />
                <button onClick={()=>navigator.clipboard.writeText(link)} style={{ ...btn("secondary"), flexShrink:0, fontSize:12 }}>📋 Copy</button>
              </div>
            </div>
          )}
        </div>
        {generated && (
          <div style={{ ...card, textAlign:"center" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>QR Code</h3>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`} alt="QR Code" style={{ width:200, height:200, borderRadius:10 }} />
            <div style={{ marginTop:14 }}>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(link)}`} download="wasend-qr.png" style={{ ...btn(), textDecoration:"none", display:"inline-block" }}>📥 Download QR</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ROUTER ──────────────────────────────────────────────────
function PageContent({ page }) {
  const map = {
    "dashboard":        <Dashboard />,
    "contacts":         <Contacts />,
    "campaign-summary": <CampaignSummary />,
    "create-campaign":  <CreateCampaign />,
    "send-single":      <SendSingle />,
    "link-qr":          <LinkQR />,
    "wa-account":   <Placeholder title="WhatsApp Accounts"      icon="📱" desc="Connect your WhatsApp Business account via Meta API." />,
    "wa-group":     <Placeholder title="Account Groups"         icon="👥" desc="Organize your accounts into groups." />,
    "auto-responder":<Placeholder title="Auto-Responder"        icon="🔄" desc="Set up keyword-based automatic replies." />,
    "chatbot":      <Placeholder title="ChatBot Builder"        icon="🤖" desc="Build automated conversation flows." />,
    "msg-template": <Placeholder title="Message Templates"      icon="📝" desc="Create and manage approved Meta templates." />,
    "list-template":<Placeholder title="List Message Template"  icon="📋" desc="Create interactive list messages." />,
    "group-grabber":<Placeholder title="Group Grabber"          icon="🔗" desc="Export contacts from WhatsApp groups." />,
    "wa-warmer":    <Placeholder title="WhatsApp Warmer"        icon="♻️" desc="Gradually activate inactive numbers." />,
    "wa-api":       <Placeholder title="WhatsApp API"           icon="🔌" desc="Manage your API instances and tokens." />,
    "integrations": <Placeholder title="Integrations"           icon="⚡" desc="Connect Razorpay, Cashfree & more." />,
    "white-label":  <Placeholder title="White Label"            icon="🏷️" desc="Customize branding for your clients." />,
    "users-list":   <Placeholder title="Users List"             icon="👤" desc="Manage your platform users." />,
  };
  return map[page] || <Dashboard />;
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage]         = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text, overflow:"hidden" }}>
      {/* Sidebar */}
      <div style={{ width:sidebarCollapsed?60:240, background:C.sidebar, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", transition:"width 0.25s", overflow:"hidden", flexShrink:0 }}>
        <div style={{ padding:"16px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer" }} onClick={()=>setSidebarCollapsed(!sidebarCollapsed)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.113 1.523 5.845L0 24l6.335-1.507A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.656-.488-5.193-1.342l-.372-.22-3.761.895.952-3.656-.242-.381A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
          </div>
          {!sidebarCollapsed && <span style={{ fontWeight:800, fontSize:17, letterSpacing:"-0.3px", whiteSpace:"nowrap" }}>WA<span style={{ color:C.accent }}>Send</span></span>}
        </div>
        {!sidebarCollapsed && (
          <div style={{ padding:"12px 12px 0" }}>
            <button onClick={()=>setActivePage("wa-account")} style={{ ...btn(), width:"100%", fontSize:13, padding:"10px" }}>+ Add account</button>
          </div>
        )}
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto", overflowX:"hidden" }}>
          {NAV.map(group=>(
            <div key={group.section||"top"} style={{ marginBottom:8 }}>
              {group.section && !sidebarCollapsed && (
                <div style={{ fontSize:10, fontWeight:800, color:C.sub, letterSpacing:"0.08em", padding:"8px 8px 4px" }}>{group.section}</div>
              )}
              {group.items.map(item=>{
                const active = activePage===item.id;
                return (
                  <button key={item.id} onClick={()=>setActivePage(item.id)} title={sidebarCollapsed?item.label:""} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, border:"none", cursor:"pointer", background:active?C.accentLight:"transparent", color:active?C.accent2:C.sub, fontWeight:active?700:400, fontSize:13, width:"100%", textAlign:"left", transition:"all 0.12s", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden" }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                    {!sidebarCollapsed && (
                      <div style={{ flex:1, overflow:"hidden" }}>
                        <div style={{ fontWeight:active?700:500, fontSize:13, lineHeight:1.2, color:active?C.accent2:C.text }}>{item.label}</div>
                        <div style={{ fontSize:10, color:C.sub, lineHeight:1.2 }}>{item.sub}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {!sidebarCollapsed && (
          <div style={{ padding:"12px", borderTop:`1px solid ${C.border}` }}>
            <div style={{ background:C.accentLight, borderRadius:10, padding:12 }}>
              <div style={{ fontSize:10, color:C.sub, fontWeight:700, marginBottom:2 }}>META ACCOUNT</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.accent }}>✓ Connected</div>
            </div>
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"14px 24px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:C.sidebar, flexShrink:0 }}>
          <div>
            {NAV.flatMap(g=>g.items).filter(i=>i.id===activePage).map(i=>(
              <div key={i.id}>
                <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>{i.label}</h1>
                <div style={{ fontSize:12, color:C.sub }}>{i.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <div style={{ padding:"7px 14px", background:C.accentLight, borderRadius:8, fontSize:12, color:C.accent2, fontWeight:700, border:`1px solid ${C.accent}30` }}>● Live</div>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:"white", fontSize:14 }}>A</div>
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:24 }}>
          <PageContent page={activePage} />
        </div>
      </div>
    </div>
  );
}
