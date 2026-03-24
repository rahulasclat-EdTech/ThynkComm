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

// ─── NAV ─────────────────────────────────────────────────────────
const NAV = [
  { section: null, items: [{ id: "dashboard", label: "Dashboard", icon: "⊞", sub: "Overview" }] },
  { section: "ACCOUNTS", items: [
    { id: "wa-account", label: "WhatsApp Account", icon: "📱", sub: "Connect Meta API" },
    { id: "wa-group",   label: "Account Group",    icon: "👥", sub: "Create & manage groups" },
  ]},
  { section: "CAMPAIGN", items: [
    { id: "campaign-summary", label: "Campaign Summary",    icon: "📊", sub: "Find campaign summary" },
    { id: "create-campaign",  label: "Create Campaign",     icon: "📤", sub: "Create & send messages" },
    { id: "send-single",      label: "Send Single Message", icon: "✉️", sub: "Send a message" },
    { id: "live-chat",        label: "Live Chat",           icon: "💬", sub: "Real-time conversations" },
    { id: "auto-responder",   label: "Auto-Responder",      icon: "🔄", sub: "Reply 24/7 automatically" },
    { id: "chatbot",          label: "ChatBot",             icon: "🤖", sub: "Automated conversation" },
  ]},
  { section: "TEMPLATE", items: [
    { id: "msg-template",  label: "Message Template",      icon: "📝", sub: "Create captions" },
    { id: "list-template", label: "List Message Template", icon: "📋", sub: "Create with options" },
  ]},
  { section: "CONTACT", items: [
    { id: "contacts", label: "Contacts", icon: "🧑‍🤝‍🧑", sub: "Groups & contacts" },
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
  Inactive: [C.sub, "#f0f4f2"],
};

// ─── SHARED COMPONENTS ────────────────────────────────────────────
function Badge({ status }) {
  const [c, bg] = scColor[status] || [C.sub, "#f0f4f2"];
  return <span style={pill(c, bg)}>{status}</span>;
}
function Stat({ icon, label, value, color }) {
  return (
    <div style={{ ...card, display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:26, fontWeight:800, color: color||C.text }}>{value}</div>
      <div style={{ fontSize:12, color:C.sub }}>{label}</div>
    </div>
  );
}
function Loader() {
  return <div style={{ textAlign:"center", padding:40, color:C.sub, fontSize:14 }}>Loading...</div>;
}
function ErrorBox({ msg }) {
  return <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"12px 16px", color:C.red, fontSize:13 }}>⚠️ {msg}</div>;
}

// ─── SHARED TEMPLATE HOOK ─────────────────────────────────────────
function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  useEffect(() => {
    setLoading(true);
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
        else setError(data.error || "Failed to load templates");
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  return { templates, loading, error };
}

// ─── TEMPLATE PICKER COMPONENT ────────────────────────────────────
function TemplatePicker({ value, langValue, onChange, onLangChange }) {
  const { templates, loading, error } = useTemplates();
  const selected = templates.find(t => t.name === value);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div>
        <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>SELECT APPROVED TEMPLATE *</label>
        {loading && <div style={{ fontSize:12, color:C.sub, marginTop:6 }}>⏳ Loading templates from Meta...</div>}
        {error   && <div style={{ fontSize:12, color:C.red, marginTop:6 }}>⚠️ {error} — check WABA_ID & WHATSAPP_TOKEN in Vercel</div>}
        {!loading && !error && (
          <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, marginTop:5 }}>
            <option value="">— Select a template —</option>
            {templates.map(t => (
              <option key={`${t.name}_${t.language}`} value={t.name}>
                {t.name} ({t.language}) — {t.category}
              </option>
            ))}
          </select>
        )}
      </div>
      {selected && (
        <div style={{ padding:"10px 12px", background:C.accentLight, borderRadius:8, fontSize:12, color:C.accent2, border:`1px solid ${C.accent}30` }}>
          <strong>Preview:</strong> {selected.preview || "(no preview available)"}
        </div>
      )}
      <div>
        <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>LANGUAGE</label>
        <select value={langValue} onChange={e => onLangChange(e.target.value)} style={{ ...inp, marginTop:5 }}>
          <option value="en_US">English (US)</option>
          <option value="en_GB">English (UK)</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
          <option value="gu">Gujarati</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
          <option value="kn">Kannada</option>
          <option value="bn">Bengali</option>
        </select>
      </div>
    </div>
  );
}

// ─── WHATSAPP ACCOUNT ─────────────────────────────────────────────
function WAAccount() {
  const [form, setForm] = useState({ token:"", phone_number_id:"", waba_id:"", display_name:"" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("wa_accounts");
    if (stored) setAccounts(JSON.parse(stored));
  }, []);

  const save = () => {
    if (!form.token || !form.phone_number_id || !form.waba_id) {
      setError("Token, Phone Number ID and WABA ID are required"); return;
    }
    setSaving(true);
    setTimeout(() => {
      const newAccounts = [...accounts, { ...form, id: Date.now(), connected_at: new Date().toISOString() }];
      localStorage.setItem("wa_accounts", JSON.stringify(newAccounts));
      setAccounts(newAccounts);
      setForm({ token:"", phone_number_id:"", waba_id:"", display_name:"" });
      setSaved(true); setSaving(false); setError(null);
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  };

  const remove = (id) => {
    const updated = accounts.filter(a => a.id !== id);
    localStorage.setItem("wa_accounts", JSON.stringify(updated));
    setAccounts(updated);
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>WhatsApp Account</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Connect your Meta WhatsApp Business account via API credentials.</p>
      {accounts.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700 }}>Connected Accounts ({accounts.length})</h3>
          {accounts.map(a => (
            <div key={a.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:C.accentLight, borderRadius:10, marginBottom:10, border:`1px solid ${C.accent}30` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:16 }}>📱</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{a.display_name || "WhatsApp Business"}</div>
                  <div style={{ fontSize:12, color:C.sub }}>Phone ID: {a.phone_number_id} · WABA: {a.waba_id}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={pill(C.accent, C.accentLight)}>✓ Connected</span>
                <button onClick={() => remove(a.id)} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"6px 12px" }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ ...card, border:`1.5px solid ${C.border}` }}>
        <h3 style={{ margin:"0 0 6px", fontSize:15, fontWeight:700 }}>Add New Account</h3>
        <p style={{ color:C.sub, fontSize:12, margin:"0 0 16px" }}>Get these values from <strong>Meta Business → WhatsApp → API Setup</strong></p>
        {error && <div style={{ marginBottom:14 }}><ErrorBox msg={error} /></div>}
        {saved && <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"12px 16px", color:C.accent2, fontWeight:600, marginBottom:14 }}>✅ Account connected successfully!</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>DISPLAY NAME (optional)</label>
            <input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="My Business Account" />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>ACCESS TOKEN *</label>
            <input value={form.token} onChange={e=>setForm({...form,token:e.target.value})} style={{ ...inp, marginTop:5, fontFamily:"monospace", fontSize:12 }} placeholder="EAAxxxxxxxxxxxxx..." type="password" />
          </div>
          <div>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PHONE NUMBER ID *</label>
            <input value={form.phone_number_id} onChange={e=>setForm({...form,phone_number_id:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="1234567890" />
          </div>
          <div>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>WABA ID *</label>
            <input value={form.waba_id} onChange={e=>setForm({...form,waba_id:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="9876543210" />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16 }}>
          <button style={{ ...btn(), minWidth:180 }} onClick={save} disabled={saving}>
            {saving ? "Connecting..." : "🔗 Connect Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACTS ─────────────────────────────────────────────────────
function Contacts() {
  const [groups, setGroups]           = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeGroup, setActiveGroup] = useState(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [groupName, setGroupName]     = useState("");
  const [search, setSearch]           = useState("");
  const [form, setForm]               = useState({ name:"", phone:"", email:"", tag:"Lead" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const fileRef = useRef();

  const loadContacts = () => {
    fetch("/api/contacts")
      .then(r => r.json())
      .then(data => { setContacts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  const loadGroups = () => {
    const stored = localStorage.getItem("contact_groups");
    setGroups(stored ? JSON.parse(stored) : []);
  };
  useEffect(() => { loadContacts(); loadGroups(); }, []);

  const saveGroups = (updated) => {
    localStorage.setItem("contact_groups", JSON.stringify(updated));
    setGroups(updated);
  };
  const addGroup = () => {
    if (!groupName.trim()) return;
    const newGroup = { id: Date.now().toString(), name: groupName.trim(), created_at: new Date().toISOString(), contactIds: [] };
    saveGroups([...groups, newGroup]);
    setGroupName(""); setShowAddGroup(false);
  };
  const deleteGroup = (id) => {
    if (!window.confirm("Delete this group?")) return;
    saveGroups(groups.filter(g => g.id !== id));
    if (activeGroup === id) setActiveGroup(null);
  };
  const addContact = async () => {
    if (!form.name || !form.phone) return alert("Name and phone are required");
    setSaving(true);
    const r = await fetch("/api/contacts", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...form, group_id: activeGroup }),
    });
    setSaving(false);
    if (r.ok) {
      const saved = await r.json();
      if (activeGroup) {
        const updated = groups.map(g => g.id === activeGroup ? { ...g, contactIds: [...(g.contactIds||[]), saved.id] } : g);
        saveGroups(updated);
      }
      setShowAddContact(false);
      setForm({ name:"", phone:"", email:"", tag:"Lead" });
      loadContacts();
    } else { const d = await r.json(); alert(d.error); }
  };
  const handleExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter(Boolean);
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx  = headers.findIndex(h => h.includes("name"));
      const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("number"));
      const emailIdx = headers.findIndex(h => h.includes("email"));
      if (phoneIdx === -1) return alert("CSV must have a 'phone' column");
      let imported = 0; const newIds = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/"/g,""));
        const phone = cols[phoneIdx]; if (!phone) continue;
        const name  = nameIdx >= 0 ? cols[nameIdx] : phone;
        const email = emailIdx >= 0 ? cols[emailIdx] : "";
        const r = await fetch("/api/contacts", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name, phone, email, tag:"Lead" }) });
        if (r.ok) { const d = await r.json(); newIds.push(d.id); imported++; }
      }
      if (activeGroup && newIds.length) {
        const updated = groups.map(g => g.id === activeGroup ? { ...g, contactIds: [...(g.contactIds||[]), ...newIds] } : g);
        saveGroups(updated);
      }
      loadContacts();
      alert(`✅ Imported ${imported} contacts!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const currentGroup = groups.find(g => g.id === activeGroup);
  const groupContacts = activeGroup ? contacts.filter(c => (currentGroup?.contactIds||[]).includes(c.id)) : [];
  const filteredContacts = groupContacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  if (!activeGroup) return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Contact Groups</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Organise contacts into groups for targeted campaigns</p>
        </div>
        <button style={btn()} onClick={() => setShowAddGroup(true)}>+ New Group</button>
      </div>
      {showAddGroup && (
        <div style={{ ...card, marginBottom:16, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 12px", color:C.accent2 }}>Create New Group</h4>
          <div style={{ display:"flex", gap:10 }}>
            <input value={groupName} onChange={e=>setGroupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGroup()} style={inp} placeholder="Group name e.g. Premium Customers" autoFocus />
            <button style={{ ...btn(), flexShrink:0 }} onClick={addGroup}>Create</button>
            <button style={{ ...btn("ghost"), flexShrink:0 }} onClick={()=>{setShowAddGroup(false);setGroupName("");}}>Cancel</button>
          </div>
        </div>
      )}
      {loading ? <Loader /> : groups.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"50px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
          <h3 style={{ margin:"0 0 8px" }}>No groups yet</h3>
          <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Create a group to organise your contacts</p>
          <button style={btn()} onClick={() => setShowAddGroup(true)}>+ Create First Group</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {groups.map(g => {
            const count = (g.contactIds||[]).length;
            return (
              <div key={g.id} style={{ ...card, cursor:"pointer" }} onClick={() => setActiveGroup(g.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👥</div>
                  <button onClick={e=>{e.stopPropagation();deleteGroup(g.id);}} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"4px 8px" }}>✕</button>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{g.name}</div>
                <div style={{ fontSize:13, color:C.sub, marginBottom:10 }}>{count} contact{count!==1?"s":""}</div>
                <span style={{ ...pill(C.accent2, C.accentLight), fontSize:11 }}>Open →</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={() => { setActiveGroup(null); setSearch(""); setShowAddContact(false); }} style={{ ...btn("secondary"), padding:"8px 14px", fontSize:13 }}>← Back</button>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>👥 {currentGroup?.name}</h2>
          <p style={{ margin:"2px 0 0", fontSize:12, color:C.sub }}>{groupContacts.length} contacts</p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
          <button style={{ ...btn("secondary"), fontSize:13 }} onClick={() => fileRef.current.click()}>📥 Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display:"none" }} onChange={handleExcel} />
          <button style={btn()} onClick={() => setShowAddContact(true)}>+ Add Contact</button>
        </div>
      </div>
      {showAddContact && (
        <div style={{ ...card, marginBottom:16, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>Add Contact to "{currentGroup?.name}"</h4>
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
            <button style={btn("ghost")} onClick={()=>setShowAddContact(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Contacts ({filteredContacts.length})</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, width:220, fontSize:13 }} />
        </div>
        {loading ? <Loader /> : filteredContacts.length === 0 ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:C.sub, fontSize:13 }}>No contacts yet. Add manually or import a CSV.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Name","Phone","Email","Tag","Opt-In"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredContacts.map(c=>(
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px", fontWeight:600 }}>{c.name}</td>
                  <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{c.phone}</td>
                  <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{c.email}</td>
                  <td style={{ padding:"12px" }}><span style={pill(C.blue,"#eff6ff")}>{c.tag}</span></td>
                  <td style={{ padding:"12px" }}><Badge status={c.opt_in?"Active":"Paused"}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/campaigns").then(r=>r.json()).then(data=>{setCampaigns(Array.isArray(data)?data:[]);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  const totalSent      = campaigns.reduce((s,c) => s + (c.sent||0), 0);
  const totalFailed    = campaigns.reduce((s,c) => s + (c.failed||0), 0);
  const totalDelivered = totalSent - totalFailed;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="📤" label="Messages Sent"  value={totalSent.toLocaleString()}      color={C.accent2} />
        <Stat icon="✅" label="Delivered"       value={totalDelivered.toLocaleString()} color={C.blue} />
        <Stat icon="🚀" label="Total Campaigns" value={campaigns.length}                color={C.purple} />
        <Stat icon="❌" label="Failed"          value={totalFailed.toLocaleString()}    color={C.red} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:700 }}>Recent Campaigns</h3>
          {loading ? <Loader /> : campaigns.slice(0,4).map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              <div><div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div><div style={{ fontSize:12, color:C.sub }}>{(c.sent||0).toLocaleString()} sent</div></div>
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
                <span style={{ color:C.sub }}>{l}</span><span style={{ fontWeight:700 }}>{v.toLocaleString()}</span>
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

// ─── CAMPAIGN SUMMARY ─────────────────────────────────────────────
function CampaignSummary() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  useEffect(() => {
    fetch("/api/campaigns").then(r=>r.json()).then(data=>{setCampaigns(Array.isArray(data)?data:[]);setLoading(false);}).catch(()=>setLoading(false));
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

// ─── SEND SINGLE ──────────────────────────────────────────────────
function SendSingle() {
  const [to, setTo]         = useState("");
  const [msg, setMsg]       = useState("");
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState("");

  const send = async () => {
    if (!to || !msg) return alert("Phone number and message are required");
    setStatus("sending");
    try {
      const r = await fetch("/api/send-message", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ to: to.replace(/\D/g,""), message: msg }) });
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
          </div>
          <div style={card}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message</h3>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} style={{ ...inp, minHeight:120, resize:"vertical" }} placeholder="Type your message here..." />
            <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{msg.length}/4096</div>
          </div>
          {status==="success" && <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"12px 16px", color:C.accent2, fontWeight:600 }}>✅ Message sent!</div>}
          {status==="error"   && <ErrorBox msg={errMsg} />}
          <button style={{ ...btn(), alignSelf:"flex-start", minWidth:160 }} onClick={send} disabled={status==="sending"}>{status==="sending" ? "Sending..." : "📤 Send Message"}</button>
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
  const [step, setStep]             = useState(1);
  const [contacts, setContacts]     = useState([]);
  const [groups, setGroups]         = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [msgType, setMsgType]       = useState("text");
  const [message, setMessage]       = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("en_US");
  const [status, setStatus]         = useState(null);
  const [result, setResult]         = useState(null);
  const [scheduleType, setScheduleType] = useState("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTimezone, setScheduleTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    fetch("/api/contacts").then(r=>r.json()).then(d=>setContacts(Array.isArray(d)?d:[]));
    const stored = localStorage.getItem("contact_groups");
    setGroups(stored ? JSON.parse(stored) : []);
  }, []);

  const currentGroup = groups.find(g => g.id === selectedGroup);
  const groupContacts = selectedGroup && currentGroup
    ? contacts.filter(c => (currentGroup.contactIds||[]).includes(c.id) && c.opt_in)
    : contacts.filter(c => c.opt_in);

  const send = async () => {
    if (!campaignName) return alert("Campaign name is required");
    if (!selectedGroup) return alert("Please select a contact group");
    if (msgType === "text" && !message) return alert("Message is required");
    if (msgType === "template" && !templateName) return alert("Template name is required");
    if (!groupContacts.length) return alert("No opted-in contacts in this group");
    setStatus("sending");
    try {
      const r = await fetch("/api/campaigns", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: campaignName, contactIds: groupContacts.map(c => c.id), message: msgType==="text"?message:undefined, templateName: msgType==="template"?templateName:undefined, languageCode: templateLang }),
      });
      const data = await r.json();
      if (r.ok) { setStatus("success"); setResult(data); }
      else { setStatus("error"); }
    } catch { setStatus("error"); }
  };

  const steps = ["Name Campaign","Select Template","Select Group","Schedule","Review & Send"];

  return (
    <div>
      <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Create Campaign</h2>
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
      {step===1 && (<div style={card}><h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Campaign Name</h3><input value={campaignName} onChange={e=>setCampaignName(e.target.value)} style={inp} placeholder="e.g. Diwali Sale 2025" /><button style={{ ...btn(), marginTop:14 }} onClick={()=>{ if(!campaignName) return alert("Enter a campaign name"); setStep(2); }}>Continue →</button></div>)}
      {step===2 && (<div style={card}><h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message Type</h3><div style={{ display:"flex", gap:10, marginBottom:18 }}>{[["text","✏️ Custom Text"],["template","📋 Meta Template"]].map(([val,label])=>(<button key={val} onClick={()=>setMsgType(val)} style={{ ...btn(msgType===val?"primary":"secondary"), fontSize:13 }}>{label}</button>))}</div>{msgType==="text"&&(<div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MESSAGE TEXT *</label><textarea value={message} onChange={e=>setMessage(e.target.value)} style={{ ...inp, minHeight:140, resize:"vertical", marginTop:6 }} placeholder="Type your message..." /><div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{message.length}/4096</div></div>)}{msgType==="template"&&(<div style={{ display:"flex", flexDirection:"column", gap:12 }}><div style={{ padding:"12px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e" }}>⚠️ Templates must be pre-approved by Meta.</div><div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TEMPLATE NAME *</label><input value={templateName} onChange={e=>setTemplateName(e.target.value)} style={{ ...inp, marginTop:6 }} placeholder="e.g. hello_world" /></div><div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>LANGUAGE</label><select value={templateLang} onChange={e=>setTemplateLang(e.target.value)} style={{ ...inp, marginTop:6 }}><option value="en_US">English (US)</option><option value="hi">Hindi</option><option value="mr">Marathi</option><option value="gu">Gujarati</option><option value="ta">Tamil</option></select></div></div>)}<div style={{ display:"flex", gap:10, marginTop:16 }}><button style={btn("secondary")} onClick={()=>setStep(1)}>← Back</button><button style={btn()} onClick={()=>setStep(3)}>Continue →</button></div></div>)}
      {step===3 && (<div style={card}><h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Select Contact Group</h3><div style={{ display:"flex", flexDirection:"column", gap:10 }}>{groups.length===0?<div style={{ color:C.sub, fontSize:13 }}>No groups yet. Go to Contacts to create a group first.</div>:groups.map(g=>(<div key={g.id} onClick={()=>setSelectedGroup(g.id)} style={{ padding:"14px 16px", borderRadius:10, border:`2px solid ${selectedGroup===g.id?C.accent:C.border}`, cursor:"pointer", background:selectedGroup===g.id?C.accentLight:"white" }}><div style={{ fontWeight:700 }}>{g.name}</div><div style={{ fontSize:12, color:C.sub }}>{(g.contactIds||[]).length} contacts</div></div>))}</div><div style={{ display:"flex", gap:10, marginTop:16 }}><button style={btn("secondary")} onClick={()=>setStep(2)}>← Back</button><button style={btn()} onClick={()=>{ if(!selectedGroup) return alert("Select a group"); setStep(4); }}>Continue →</button></div></div>)}
      {step===4 && (<div style={card}><h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Schedule</h3><div style={{ display:"flex", gap:10, marginBottom:18 }}>{[["now","⚡ Send Now"],["scheduled","📅 Schedule Later"]].map(([val,label])=>(<button key={val} onClick={()=>setScheduleType(val)} style={{ ...btn(scheduleType===val?"primary":"secondary"), fontSize:13 }}>{label}</button>))}</div>{scheduleType==="scheduled"&&(<div style={{ display:"flex", flexDirection:"column", gap:12 }}><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}><div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>DATE *</label><input type="date" value={scheduleDate} min={new Date().toISOString().split("T")[0]} onChange={e=>setScheduleDate(e.target.value)} style={{ ...inp, marginTop:6 }} /></div><div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TIME *</label><input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)} style={{ ...inp, marginTop:6 }} /></div></div><div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TIMEZONE</label><select value={scheduleTimezone} onChange={e=>setScheduleTimezone(e.target.value)} style={{ ...inp, marginTop:6 }}><option value="Asia/Kolkata">India (IST) UTC+5:30</option><option value="Asia/Dubai">Dubai (GST) UTC+4</option><option value="Europe/London">London (GMT) UTC+0</option><option value="America/New_York">New York (ET) UTC-5</option></select></div></div>)}<div style={{ display:"flex", gap:10, marginTop:16 }}><button style={btn("secondary")} onClick={()=>setStep(3)}>← Back</button><button style={btn()} onClick={()=>setStep(5)}>Continue →</button></div></div>)}
      {step===5 && (<div style={card}><h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Review & Send</h3><div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>{[["Campaign Name",campaignName],["Message Type",msgType==="template"?`Template: ${templateName}` : "Custom Text"],["Contact Group",currentGroup?.name||"—"],["Recipients",`${groupContacts.length} opted-in contacts`],["Schedule",scheduleType==="now"?"⚡ Send Now":`📅 ${scheduleDate} at ${scheduleTime}`]].map(([label,value])=>(<div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:C.bg, borderRadius:9 }}><span style={{ color:C.sub, fontSize:13 }}>{label}</span><span style={{ fontWeight:700, fontSize:13 }}>{value}</span></div>))}{msgType==="text"&&(<div style={{ padding:"10px 14px", background:C.bg, borderRadius:9 }}><div style={{ color:C.sub, fontSize:13, marginBottom:4 }}>Message Preview</div><div style={{ fontSize:13, whiteSpace:"pre-wrap" }}>{message}</div></div>)}</div>{status==="success"&&result&&(<div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}><div style={{ fontWeight:700, color:C.accent2, marginBottom:4 }}>✅ Campaign Sent!</div><div style={{ fontSize:13, color:C.sub }}>Sent: {result.sent} | Failed: {result.failed}</div></div>)}{status==="error"&&<ErrorBox msg="Something went wrong. Check API credentials." />}<div style={{ display:"flex", gap:10 }}><button style={btn("secondary")} onClick={()=>setStep(4)}>← Back</button><button style={{ ...btn(), minWidth:180 }} onClick={send} disabled={status==="sending"}>{status==="sending"?"⏳ Sending...":"🚀 Launch Campaign"}</button></div></div>)}
    </div>
  );
}

// ─── MESSAGE TEMPLATE ─────────────────────────────────────────────
function MessageTemplate() {
  const STORAGE_KEY = "msg_templates";
  const [templates, setTemplates] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [
      { id:1, name:"Order Confirmation", category:"Transactional", status:"Approved", body:"Hi {{1}}, your order #{{2}} has been confirmed! Expected delivery: {{3}}." },
      { id:2, name:"Flash Sale Alert",   category:"Marketing",     status:"Approved", body:"🔥 Hi {{1}}, get up to 50% off today only. Use code {{2}}." },
      { id:3, name:"Support Follow-up",  category:"Support",       status:"Pending",  body:"Hi {{1}}, this is a follow-up on ticket #{{2}}. Is your issue resolved?" },
    ];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:"", category:"Marketing", body:"" });
  const [selected, setSelected] = useState(null);

  const save = (ts) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ts)); setTemplates(ts); };

  const addTemplate = () => {
    if (!form.name || !form.body) return alert("Name and body are required");
    const newT = { id: Date.now(), ...form, status:"Pending" };
    save([...templates, newT]);
    setForm({ name:"", category:"Marketing", body:"" }); setShowAdd(false);
  };

  const deleteTemplate = (id) => {
    if (!window.confirm("Delete this template?")) return;
    save(templates.filter(t => t.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Message Templates</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Create and manage your WhatsApp message templates</p>
        </div>
        <button style={btn()} onClick={() => setShowAdd(!showAdd)}>+ Create Template</button>
      </div>

      <div style={{ padding:"12px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e", marginBottom:18 }}>
        ⚠️ <strong>Note:</strong> Templates shown here are for your reference. For real campaigns, templates must also be submitted and approved in <strong>Meta Business Manager → WhatsApp → Message Templates</strong>.
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>New Message Template</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TEMPLATE NAME *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="e.g. order_confirmation" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>CATEGORY</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option>Marketing</option><option>Transactional</option><option>Support</option><option>Onboarding</option>
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MESSAGE BODY * (use {`{{1}}`}, {`{{2}}`} for variables)</label>
              <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} style={{ ...inp, minHeight:100, resize:"vertical", marginTop:5 }} placeholder="Hi {{1}}, your order {{2}} is confirmed!" />
              <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>{form.body.length}/1024 chars</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={btn()} onClick={addTemplate}>💾 Save Template</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {templates.map(t => (
            <div key={t.id} onClick={()=>setSelected(t)} style={{ ...card, cursor:"pointer", border:`2px solid ${selected?.id===t.id?C.accent:C.border}`, background:selected?.id===t.id?C.accentLight:"white" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{t.name}</div>
                  <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>{t.category}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <Badge status={t.status} />
                  <button onClick={e=>{e.stopPropagation();deleteTemplate(t.id);}} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"4px 8px" }}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize:12, color:C.sub, fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.body}</div>
            </div>
          ))}
          {templates.length === 0 && <div style={{ ...card, textAlign:"center", padding:"40px 20px", color:C.sub }}>No templates yet. Create your first one!</div>}
        </div>

        <div style={{ ...card, alignSelf:"flex-start", position:"sticky", top:0 }}>
          {selected ? (
            <>
              <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>📋 Template Preview</h3>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:4 }}>NAME</div>
                <div style={{ fontWeight:700 }}>{selected.name}</div>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:4 }}>CATEGORY</div>
                <span style={pill(C.blue,"#eff6ff")}>{selected.category}</span>
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:4 }}>STATUS</div>
                <Badge status={selected.status} />
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:8 }}>MESSAGE PREVIEW</div>
                <div style={{ background:"#e5ddd5", borderRadius:12, padding:14 }}>
                  <div style={{ background:"white", borderRadius:"0 10px 10px 10px", padding:"10px 14px", fontSize:13, maxWidth:"90%", boxShadow:"0 1px 2px rgba(0,0,0,0.1)", whiteSpace:"pre-wrap", lineHeight:1.5 }}>
                    {selected.body.replace(/{{(\d+)}}/g, (_, n) => `[Variable ${n}]`)}
                  </div>
                </div>
              </div>
              <div style={{ padding:"12px 14px", background:"#fffbeb", borderRadius:10, border:"1px solid #fde68a", fontSize:12, color:"#92400e" }}>
                Variables like {`{{1}}`} will be replaced with real data when sending campaigns.
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 20px", color:C.sub }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
              <div style={{ fontSize:14 }}>Click a template to preview it</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LIST MESSAGE TEMPLATE ────────────────────────────────────────
function ListTemplate() {
  const STORAGE_KEY = "list_templates";
  const [templates, setTemplates] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name:"", header:"", body:"", footer:"", buttonText:"Choose an option", sections:[{ title:"Options", rows:[{ id:"1", title:"", description:"" }] }] });

  const save = (ts) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ts)); setTemplates(ts); };

  const addRow = (sIdx) => {
    const sections = [...form.sections];
    sections[sIdx].rows.push({ id: Date.now().toString(), title:"", description:"" });
    setForm({...form, sections});
  };
  const updateRow = (sIdx, rIdx, field, val) => {
    const sections = [...form.sections];
    sections[sIdx].rows[rIdx][field] = val;
    setForm({...form, sections});
  };
  const removeRow = (sIdx, rIdx) => {
    const sections = [...form.sections];
    sections[sIdx].rows = sections[sIdx].rows.filter((_,i) => i !== rIdx);
    setForm({...form, sections});
  };

  const addTemplate = () => {
    if (!form.name || !form.body) return alert("Name and body are required");
    const allRows = form.sections.flatMap(s => s.rows);
    if (allRows.some(r => !r.title)) return alert("All option titles are required");
    save([...templates, { id: Date.now(), ...form }]);
    setShowAdd(false);
    setForm({ name:"", header:"", body:"", footer:"", buttonText:"Choose an option", sections:[{ title:"Options", rows:[{ id:"1", title:"", description:"" }] }] });
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>List Message Templates</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Create interactive list messages with selectable options</p>
        </div>
        <button style={btn()} onClick={()=>setShowAdd(!showAdd)}>+ Create List Template</button>
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}` }}>
          <h4 style={{ margin:"0 0 16px", color:C.accent2 }}>New List Message Template</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TEMPLATE NAME *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="e.g. Product Menu" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>HEADER (optional)</label>
              <input value={form.header} onChange={e=>setForm({...form,header:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Welcome to our store" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>BUTTON TEXT</label>
              <input value={form.buttonText} onChange={e=>setForm({...form,buttonText:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Choose an option" />
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>BODY *</label>
              <textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} style={{ ...inp, minHeight:80, resize:"vertical", marginTop:5 }} placeholder="Please select from the options below:" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>FOOTER (optional)</label>
              <input value={form.footer} onChange={e=>setForm({...form,footer:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Powered by WASend" />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>List Options</div>
            {form.sections[0].rows.map((row, rIdx) => (
              <div key={rIdx} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, marginBottom:8, alignItems:"center" }}>
                <input value={row.title} onChange={e=>updateRow(0,rIdx,"title",e.target.value)} style={inp} placeholder={`Option ${rIdx+1} title *`} />
                <input value={row.description} onChange={e=>updateRow(0,rIdx,"description",e.target.value)} style={inp} placeholder="Description (optional)" />
                <button onClick={()=>removeRow(0,rIdx)} style={{ ...btn("ghost"), color:C.red, padding:"10px 12px", fontSize:16 }}>✕</button>
              </div>
            ))}
            <button onClick={()=>addRow(0)} style={{ ...btn("secondary"), fontSize:13, marginTop:4 }}>+ Add Option</button>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button style={btn()} onClick={addTemplate}>💾 Save Template</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"50px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <h3 style={{ margin:"0 0 8px" }}>No list templates yet</h3>
          <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Create interactive messages with selectable options</p>
          <button style={btn()} onClick={()=>setShowAdd(true)}>+ Create First Template</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
          {templates.map(t => (
            <div key={t.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{t.name}</div>
                <button onClick={()=>save(templates.filter(x=>x.id!==t.id))} style={{ ...btn("ghost"), color:C.red, padding:"4px 8px", fontSize:12 }}>🗑</button>
              </div>
              {t.header && <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>{t.header}</div>}
              <div style={{ fontSize:13, color:C.sub, marginBottom:8 }}>{t.body}</div>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:10 }}>
                {t.sections[0].rows.map((row,i) => (
                  <div key={i} style={{ padding:"8px 12px", borderBottom: i<t.sections[0].rows.length-1?`1px solid ${C.border}`:"none", fontSize:13 }}>
                    <div style={{ fontWeight:600 }}>{row.title}</div>
                    {row.description && <div style={{ fontSize:11, color:C.sub }}>{row.description}</div>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:C.accent2, fontWeight:700, textAlign:"center", padding:"8px", background:C.accentLight, borderRadius:8 }}>📋 {t.buttonText}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AUTO RESPONDER ───────────────────────────────────────────────
function AutoResponder() {
  const STORAGE_KEY = "auto_responders";
  const { templates, loading: tplLoading } = useTemplates();
  const [rules, setRules] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [
      { id:1, keyword:"PRICE",   matchType:"exact",    responseType:"text", response:"Our pricing starts at ₹499/mo. Visit our website for details.", templateName:"", languageCode:"en_US", active:true },
      { id:2, keyword:"SUPPORT", matchType:"contains", responseType:"text", response:"Support team available Mon-Fri 9AM-6PM.", templateName:"", languageCode:"en_US", active:true },
    ];
  });
  const [showAdd, setShowAdd] = useState(false);
  const emptyForm = { keyword:"", matchType:"contains", responseType:"text", response:"", templateName:"", languageCode:"en_US", active:true };
  const [form, setForm] = useState(emptyForm);

  const save = (rs) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(rs)); setRules(rs); };
  const toggle = (id) => save(rules.map(r => r.id===id ? {...r, active:!r.active} : r));
  const remove = (id) => { if (!window.confirm("Delete this rule?")) return; save(rules.filter(r => r.id!==id)); };
  const add = () => {
    if (!form.keyword) return alert("Keyword is required");
    if (form.responseType === "text" && !form.response) return alert("Response message is required");
    if (form.responseType === "template" && !form.templateName) return alert("Please select a template");
    save([...rules, { ...form, id: Date.now() }]);
    setForm(emptyForm); setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Auto-Responder</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Automatically reply 24/7 — with custom text or your approved Meta templates</p>
        </div>
        <button style={btn()} onClick={()=>setShowAdd(!showAdd)}>+ Add Rule</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="🔄" label="Total Rules"  value={rules.length} />
        <Stat icon="✅" label="Active Rules" value={rules.filter(r=>r.active).length} color={C.accent} />
        <Stat icon="⏸" label="Paused Rules" value={rules.filter(r=>!r.active).length} color={C.yellow} />
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>New Auto-Response Rule</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TRIGGER KEYWORD *</label>
              <input value={form.keyword} onChange={e=>setForm({...form,keyword:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="e.g. PRICE, HELP, ORDER" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MATCH TYPE</label>
              <select value={form.matchType} onChange={e=>setForm({...form,matchType:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option value="exact">Exact Match</option>
                <option value="contains">Contains Keyword</option>
                <option value="starts">Starts With</option>
              </select>
            </div>

            {/* Response type toggle */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>RESPONSE TYPE</label>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                {[["text","✏️ Text Message"],["template","📋 Meta Template"]].map(([val,label])=>(
                  <button key={val} onClick={()=>setForm({...form,responseType:val,response:"",templateName:""})}
                    style={{ ...btn(form.responseType===val?"primary":"secondary"), fontSize:13, padding:"8px 18px" }}>{label}</button>
                ))}
              </div>
            </div>

            {form.responseType === "text" ? (
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>AUTO-RESPONSE MESSAGE *</label>
                <textarea value={form.response} onChange={e=>setForm({...form,response:e.target.value})}
                  style={{ ...inp, minHeight:80, resize:"vertical", marginTop:5 }} placeholder="Your automated reply..." />
              </div>
            ) : (
              <div style={{ gridColumn:"1/-1" }}>
                <TemplatePicker
                  value={form.templateName} langValue={form.languageCode}
                  onChange={v=>setForm({...form,templateName:v})}
                  onLangChange={v=>setForm({...form,languageCode:v})}
                />
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={btn()} onClick={add}>Save Rule</button>
            <button style={btn("ghost")} onClick={()=>{ setShowAdd(false); setForm(emptyForm); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {rules.map(r => (
          <div key={r.id} style={{ ...card, display:"flex", alignItems:"flex-start", gap:14, opacity:r.active?1:0.7 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:r.active?C.accentLight:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              {r.responseType==="template" ? "📋" : "🔄"}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                <span style={pill(C.accent2, C.accentLight)}>Keyword: {r.keyword}</span>
                <span style={pill(C.blue,"#eff6ff")}>{r.matchType}</span>
                <span style={pill(r.responseType==="template"?C.purple:C.accent2, r.responseType==="template"?"#f3e8ff":C.accentLight)}>
                  {r.responseType==="template" ? "📋 Template" : "✏️ Text"}
                </span>
                <Badge status={r.active?"Active":"Paused"} />
              </div>
              {r.responseType==="template"
                ? <div style={{ fontSize:13, color:C.sub }}>Template: <strong>{r.templateName}</strong> · {r.languageCode}</div>
                : <div style={{ fontSize:13, color:C.sub, lineHeight:1.5 }}>{r.response}</div>
              }
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={()=>toggle(r.id)} style={{ ...btn("secondary"), fontSize:12, padding:"6px 12px" }}>{r.active?"⏸ Pause":"▶ Enable"}</button>
              <button onClick={()=>remove(r.id)} style={{ ...btn("secondary"), fontSize:12, padding:"6px 12px", color:C.red }}>🗑</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div style={{ ...card, textAlign:"center", padding:"40px", color:C.sub }}>No rules yet. Add your first auto-response rule!</div>}
      </div>
    </div>
  );
}

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Auto-Responder</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Automatically reply to incoming messages based on keywords — 24/7</p>
        </div>
        <button style={btn()} onClick={()=>setShowAdd(!showAdd)}>+ Add Rule</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="🔄" label="Total Rules"  value={rules.length} />
        <Stat icon="✅" label="Active Rules" value={rules.filter(r=>r.active).length} color={C.accent} />
        <Stat icon="⏸" label="Paused Rules" value={rules.filter(r=>!r.active).length} color={C.yellow} />
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>New Auto-Response Rule</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TRIGGER KEYWORD *</label>
              <input value={form.keyword} onChange={e=>setForm({...form,keyword:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="e.g. PRICE, HELP, ORDER" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MATCH TYPE</label>
              <select value={form.matchType} onChange={e=>setForm({...form,matchType:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option value="exact">Exact Match</option>
                <option value="contains">Contains Keyword</option>
                <option value="starts">Starts With</option>
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>AUTO-RESPONSE MESSAGE *</label>
              <textarea value={form.response} onChange={e=>setForm({...form,response:e.target.value})} style={{ ...inp, minHeight:80, resize:"vertical", marginTop:5 }} placeholder="Your automated reply message..." />
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={btn()} onClick={add}>Save Rule</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {rules.map(r => (
          <div key={r.id} style={{ ...card, display:"flex", alignItems:"flex-start", gap:14, opacity:r.active?1:0.7 }}>
            <div style={{ width:42, height:42, borderRadius:10, background:r.active?C.accentLight:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🔄</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                <span style={pill(C.accent2, C.accentLight)}>Keyword: {r.keyword}</span>
                <span style={pill(C.blue,"#eff6ff")}>{r.matchType}</span>
                <Badge status={r.active?"Active":"Paused"} />
              </div>
              <div style={{ fontSize:13, color:C.sub, lineHeight:1.5 }}>{r.response}</div>
            </div>
            <div style={{ display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={()=>toggle(r.id)} style={{ ...btn("secondary"), fontSize:12, padding:"6px 12px" }}>{r.active?"⏸ Pause":"▶ Enable"}</button>
              <button onClick={()=>remove(r.id)} style={{ ...btn("secondary"), fontSize:12, padding:"6px 12px", color:C.red }}>🗑</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div style={{ ...card, textAlign:"center", padding:"40px", color:C.sub }}>No rules yet. Add your first auto-response rule!</div>}
      </div>
    </div>
  );
}

// ─── CHATBOT ──────────────────────────────────────────────────────
function ChatBot() {
  const STORAGE_KEY = "chatbot_flows";
  const { templates, loading: tplLoading } = useTemplates();
  const [flows, setFlows] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [
      { id:1, name:"Lead Qualification", triggers:"Hi, Hello, Start", active:true,
        steps:[
          { type:"message",  content:"Welcome! 👋 What can I help you with today?" },
          { type:"collect",  content:"Name" },
          { type:"message",  content:"Thanks! Our team will reach out shortly." },
        ]
      },
    ];
  });
  const [showAdd, setShowAdd]       = useState(false);
  const [form, setForm]             = useState({ name:"", triggers:"" });
  const [activeFlow, setActiveFlow] = useState(null);

  const save  = (fs) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(fs)); setFlows(fs); };
  const toggle = (id) => save(flows.map(f => f.id===id ? {...f, active:!f.active} : f));
  const remove = (id) => { if (!window.confirm("Delete this flow?")) return; save(flows.filter(f => f.id!==id)); if(activeFlow===id) setActiveFlow(null); };
  const add = () => {
    if (!form.name || !form.triggers) return alert("Name and triggers are required");
    const nf = { id:Date.now(), ...form, active:true, steps:[{ type:"message", content:"Hello! How can I help you? 👋", templateName:"", languageCode:"en_US" }] };
    save([...flows, nf]); setForm({ name:"", triggers:"" }); setShowAdd(false); setActiveFlow(nf.id);
  };

  const updateFlow = (id, updated) => save(flows.map(f => f.id===id ? updated : f));
  const addStep    = (flowId) => { const f = flows.find(x=>x.id===flowId); updateFlow(flowId, {...f, steps:[...f.steps, { type:"message", content:"", templateName:"", languageCode:"en_US" }]}); };
  const removeStep = (flowId, idx) => { const f = flows.find(x=>x.id===flowId); updateFlow(flowId, {...f, steps:f.steps.filter((_,i)=>i!==idx)}); };
  const moveStep   = (flowId, idx, dir) => {
    const f = [...flows.find(x=>x.id===flowId).steps];
    const ni = idx+dir; if(ni<0||ni>=f.length) return;
    [f[idx],f[ni]]=[f[ni],f[idx]];
    updateFlow(flowId, {...flows.find(x=>x.id===flowId), steps:f});
  };
  const updateStep = (flowId, idx, patch) => {
    const f = flows.find(x=>x.id===flowId);
    updateFlow(flowId, {...f, steps:f.steps.map((s,i)=>i===idx?{...s,...patch}:s)});
  };

  const stepTypeColors = { message:C.accent, template:C.purple, collect:C.blue, delay:C.yellow, end:"#ef4444" };
  const stepTypeIcons  = { message:"💬", template:"📋", collect:"📝", delay:"⏱", end:"🏁" };
  const stepTypes      = ["message","template","collect","delay","end"];
  const current        = flows.find(f => f.id === activeFlow);

  // ── Flow editor view ──
  if (activeFlow && current) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setActiveFlow(null)} style={{ ...btn("secondary"), padding:"8px 14px", fontSize:13 }}>← Back</button>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>🤖 {current.name}</h2>
          <p style={{ margin:"2px 0 0", fontSize:12, color:C.sub }}>Triggers: {current.triggers} · {current.steps.length} steps</p>
        </div>
        <button style={btn()} onClick={()=>addStep(current.id)}>+ Add Step</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        {/* Start node */}
        <div style={{ padding:"8px 22px", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, borderRadius:20, color:"white", fontWeight:700, fontSize:13, marginBottom:0 }}>
          🚀 Trigger: "{current.triggers}"
        </div>
        <div style={{ width:2, height:18, background:C.accent+"60" }} />

        {current.steps.map((step, idx) => (
          <div key={idx} style={{ display:"flex", flexDirection:"column", alignItems:"center", width:"100%" }}>
            <div style={{ width:"100%", maxWidth:640, ...card, border:`2px solid ${stepTypeColors[step.type]||C.border}` }}>
              {/* Step header */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:(stepTypeColors[step.type]||C.blue)+"22", border:`2px solid ${stepTypeColors[step.type]||C.blue}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                  {stepTypeIcons[step.type]||"⚡"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:C.sub }}>Step {idx+1}</div>
                  <select value={step.type} onChange={e=>updateStep(current.id,idx,{type:e.target.value,content:"",templateName:"",languageCode:"en_US"})}
                    style={{ ...inp, padding:"4px 8px", fontSize:12, marginTop:2, width:"auto" }}>
                    {stepTypes.map(t=><option key={t} value={t}>{stepTypeIcons[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>moveStep(current.id,idx,-1)} disabled={idx===0} style={{ ...btn("secondary"), padding:"4px 8px", fontSize:12, opacity:idx===0?0.4:1 }}>↑</button>
                  <button onClick={()=>moveStep(current.id,idx,1)} disabled={idx===current.steps.length-1} style={{ ...btn("secondary"), padding:"4px 8px", fontSize:12, opacity:idx===current.steps.length-1?0.4:1 }}>↓</button>
                  <button onClick={()=>removeStep(current.id,idx)} style={{ ...btn("secondary"), padding:"4px 8px", fontSize:12, color:C.red }}>🗑</button>
                </div>
              </div>

              {/* Step content */}
              {step.type === "message" && (
                <textarea value={step.content} onChange={e=>updateStep(current.id,idx,{content:e.target.value})}
                  style={{ ...inp, minHeight:70, resize:"vertical" }} placeholder="Type the message to send to user..." />
              )}
              {step.type === "template" && (
                <TemplatePicker
                  value={step.templateName||""} langValue={step.languageCode||"en_US"}
                  onChange={v=>updateStep(current.id,idx,{templateName:v})}
                  onLangChange={v=>updateStep(current.id,idx,{languageCode:v})}
                />
              )}
              {step.type === "collect" && (
                <div>
                  <label style={{ fontSize:11, color:C.sub, fontWeight:700 }}>VARIABLE NAME (what to collect)</label>
                  <input value={step.content} onChange={e=>updateStep(current.id,idx,{content:e.target.value})}
                    style={{ ...inp, marginTop:4 }} placeholder="e.g. name, phone, order_id" />
                  <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>User reply will be stored in this variable</div>
                </div>
              )}
              {step.type === "delay" && (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <input type="number" min={1} max={60} value={step.content||"5"} onChange={e=>updateStep(current.id,idx,{content:e.target.value})}
                    style={{ ...inp, width:80 }} />
                  <span style={{ fontSize:13, color:C.sub }}>seconds before next step</span>
                </div>
              )}
              {step.type === "end" && (
                <input value={step.content} onChange={e=>updateStep(current.id,idx,{content:e.target.value})}
                  style={inp} placeholder="Optional closing message (leave blank for silent end)" />
              )}
            </div>

            {idx < current.steps.length-1 && (
              <>
                <div style={{ width:2, height:14, background:C.accent+"60" }} />
                <div style={{ fontSize:14, color:C.accent }}>▼</div>
              </>
            )}
          </div>
        ))}

        {/* End node */}
        <div style={{ width:2, height:18, background:"#ef444460" }} />
        <div style={{ padding:"8px 22px", background:"#fef2f2", border:"2px solid #fecaca", borderRadius:20, color:"#ef4444", fontWeight:700, fontSize:13 }}>🏁 End of Flow</div>
        <div style={{ marginTop:20 }}>
          <button style={btn()} onClick={()=>addStep(current.id)}>+ Add Step</button>
        </div>
      </div>
    </div>
  );

  // ── Flows list view ──
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>ChatBot Builder</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Build automated flows — supports text messages and approved Meta templates</p>
        </div>
        <button style={btn()} onClick={()=>setShowAdd(!showAdd)}>+ Create Flow</button>
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>New ChatBot Flow</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>FLOW NAME *</label>
              <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="e.g. Lead Qualification" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TRIGGER KEYWORDS * (comma separated)</label>
              <input value={form.triggers} onChange={e=>setForm({...form,triggers:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Hi, Hello, Start" />
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn()} onClick={add}>Create & Edit Flow</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        {flows.map(f => (
          <div key={f.id} style={{ ...card, borderLeft:`4px solid ${f.active?C.accent:C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:f.active?C.accentLight:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
              <Badge status={f.active?"Active":"Paused"} />
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{f.name}</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:2 }}>Triggers: {f.triggers}</div>
            <div style={{ fontSize:12, color:C.sub, marginBottom:14 }}>
              {f.steps.length} steps · {f.steps.filter(s=>s.type==="template").length} templates
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setActiveFlow(f.id)} style={{ ...btn(), flex:1, fontSize:12 }}>✏️ Edit Flow</button>
              <button onClick={()=>toggle(f.id)} style={{ ...btn("secondary"), flex:1, fontSize:12 }}>{f.active?"⏸ Pause":"▶ Activate"}</button>
              <button onClick={()=>remove(f.id)} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"10px" }}>🗑</button>
            </div>
          </div>
        ))}
        {flows.length === 0 && (
          <div style={{ gridColumn:"1/-1", ...card, textAlign:"center", padding:"50px 20px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🤖</div>
            <h3 style={{ margin:"0 0 8px" }}>No flows yet</h3>
            <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Create a flow to automate your conversations</p>
            <button style={btn()} onClick={()=>setShowAdd(true)}>+ Create First Flow</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GROUP GRABBER ────────────────────────────────────────────────
function GroupGrabber() {
  const [step, setStep]     = useState(1);
  const [groupLink, setGroupLink] = useState("");
  const [status, setStatus] = useState(null);
  const [contacts, setContacts] = useState([]);

  const grab = () => {
    if (!groupLink.includes("chat.whatsapp.com")) return alert("Please enter a valid WhatsApp group invite link");
    setStatus("loading");
    setTimeout(() => {
      setContacts([
        { name:"Sample Contact 1", phone:"919876543210" },
        { name:"Sample Contact 2", phone:"919123456789" },
        { name:"Sample Contact 3", phone:"917654321098" },
      ]);
      setStatus("done");
    }, 1500);
  };

  const exportCSV = () => {
    const csv = "name,phone\n" + contacts.map(c => `${c.name},${c.phone}`).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "group_contacts.csv"; a.click();
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>Group Grabber</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Export contacts from WhatsApp group invite links</p>

      <div style={{ ...card, marginBottom:18, background:"#fef2f2", border:"1px solid #fecaca" }}>
        <div style={{ fontWeight:700, fontSize:13, color:C.red, marginBottom:6 }}>⚠️ Important Notice</div>
        <div style={{ fontSize:13, color:"#7f1d1d", lineHeight:1.6 }}>
          This feature works with WhatsApp group invite links. Please ensure you have permission to export contacts from the group. Use responsibly and in compliance with WhatsApp's Terms of Service and applicable privacy laws.
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Enter Group Invite Link</h3>
        <input value={groupLink} onChange={e=>setGroupLink(e.target.value)} style={inp} placeholder="https://chat.whatsapp.com/xxxxxxxxxx" />
        <div style={{ fontSize:11, color:C.sub, marginTop:6 }}>Open WhatsApp group → tap Invite via Link → Copy Link → paste here</div>
        <button style={{ ...btn(), marginTop:14 }} onClick={grab} disabled={status==="loading"}>
          {status==="loading" ? "⏳ Extracting..." : "🔗 Grab Contacts"}
        </button>
      </div>

      {status==="done" && (
        <div style={{ ...card, marginTop:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Found {contacts.length} Contacts</h3>
            <button style={btn()} onClick={exportCSV}>📥 Export CSV</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Name","Phone"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {contacts.map((c,i)=>(
                <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"12px", fontWeight:600 }}>{c.name}</td>
                  <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{c.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── WHATSAPP WARMER ──────────────────────────────────────────────
function WAWarmer() {
  const STORAGE_KEY = "wa_warmer";
  const [warmers, setWarmers] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ phone:"", dailyMessages:"10", interval:"30", active:true });

  const save = (ws) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(ws)); setWarmers(ws); };
  const toggle = (id) => save(warmers.map(w => w.id===id ? {...w, active:!w.active} : w));
  const remove = (id) => { if(!window.confirm("Remove this number?")) return; save(warmers.filter(w => w.id!==id)); };
  const add = () => {
    if (!form.phone) return alert("Phone number is required");
    save([...warmers, { id: Date.now(), ...form, startDate: new Date().toISOString().split("T")[0], messagesTotal:0 }]);
    setForm({ phone:"", dailyMessages:"10", interval:"30", active:true }); setShowAdd(false);
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>WhatsApp Warmer</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Gradually warm up inactive numbers to maintain delivery rates</p>

      <div style={{ ...card, marginBottom:18, background:"#fffbeb", border:"1px solid #fde68a" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#92400e", marginBottom:6 }}>💡 How it works</div>
        <div style={{ fontSize:13, color:"#92400e", lineHeight:1.7 }}>
          Add phone numbers to gradually send messages to them over time. This helps activate inactive numbers and improves delivery rates. Messages are sent at set intervals to avoid spam detection.
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
        <button style={btn()} onClick={()=>setShowAdd(!showAdd)}>+ Add Number</button>
      </div>

      {showAdd && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>Add Number to Warmer</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PHONE NUMBER * (with country code)</label>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="919999999999" />
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MESSAGES PER DAY</label>
              <select value={form.dailyMessages} onChange={e=>setForm({...form,dailyMessages:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option value="5">5 messages/day</option>
                <option value="10">10 messages/day</option>
                <option value="20">20 messages/day</option>
                <option value="50">50 messages/day</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>INTERVAL (minutes)</label>
              <select value={form.interval} onChange={e=>setForm({...form,interval:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option value="15">Every 15 mins</option>
                <option value="30">Every 30 mins</option>
                <option value="60">Every 1 hour</option>
                <option value="120">Every 2 hours</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn()} onClick={add}>Start Warming</button>
            <button style={btn("ghost")} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {warmers.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"50px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>♻️</div>
          <h3 style={{ margin:"0 0 8px" }}>No numbers warming</h3>
          <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Add numbers to start the warming process</p>
          <button style={btn()} onClick={()=>setShowAdd(true)}>+ Add First Number</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {warmers.map(w => (
            <div key={w.id} style={{ ...card, display:"flex", alignItems:"center", gap:16, opacity:w.active?1:0.7 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:w.active?C.accentLight:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>♻️</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{w.phone}</div>
                <div style={{ display:"flex", gap:10, fontSize:12, color:C.sub }}>
                  <span>📨 {w.dailyMessages} msg/day</span>
                  <span>⏱ Every {w.interval} mins</span>
                  <span>📅 Since {w.startDate}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Badge status={w.active?"Active":"Paused"} />
                <button onClick={()=>toggle(w.id)} style={{ ...btn("secondary"), fontSize:12, padding:"6px 12px" }}>{w.active?"⏸":"▶"}</button>
                <button onClick={()=>remove(w.id)} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"6px 10px" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LINK & QR ────────────────────────────────────────────────────
function LinkQR() {
  const [phone, setPhone]         = useState("");
  const [preMsg, setPreMsg]       = useState("Hi! I'm interested in your products.");
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
            <button style={{ ...btn(), marginTop:14, width:"100%" }} onClick={()=>{ if(!phone) return alert("Enter phone number"); setGenerated(true); }}>⚡ Generate</button>
          </div>
          {generated && (
            <div style={{ ...card, border:`1.5px solid ${C.accent}` }}>
              <h4 style={{ margin:"0 0 10px", color:C.accent2 }}>Your WhatsApp Link</h4>
              <div style={{ display:"flex", gap:8 }}>
                <input readOnly value={link} style={{ ...inp, fontFamily:"monospace", fontSize:12 }} />
                <button onClick={()=>{navigator.clipboard.writeText(link);alert("Copied!");}} style={{ ...btn("secondary"), flexShrink:0, fontSize:12 }}>📋 Copy</button>
              </div>
              <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...btn(), display:"block", textAlign:"center", textDecoration:"none", marginTop:10, fontSize:13 }}>🔗 Test Link</a>
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

// ─── WA API ───────────────────────────────────────────────────────
function WAAPI() {
  const [showToken, setShowToken] = useState({});
  const accounts = JSON.parse(localStorage.getItem("wa_accounts") || "[]");

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>WhatsApp API</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Your API credentials and webhook configuration</p>

      {accounts.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"50px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔌</div>
          <h3 style={{ margin:"0 0 8px" }}>No accounts connected</h3>
          <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Connect a WhatsApp account first to see API details</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {accounts.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:16 }}>{a.display_name || "WhatsApp Business"}</div>
                <Badge status="Active" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[["Phone Number ID", a.phone_number_id],["WABA ID", a.waba_id],["Connected", a.connected_at?.split("T")[0]]].map(([label,value]) => (
                  <div key={label} style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:4 }}>{label}</div>
                    <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:600 }}>{value}</div>
                  </div>
                ))}
                <div style={{ background:C.bg, borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:4 }}>ACCESS TOKEN</div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ fontFamily:"monospace", fontSize:12, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {showToken[a.id] ? a.token : "••••••••••••••••••••"}
                    </div>
                    <button onClick={()=>setShowToken({...showToken,[a.id]:!showToken[a.id]})} style={{ ...btn("secondary"), fontSize:11, padding:"4px 8px", flexShrink:0 }}>
                      {showToken[a.id]?"Hide":"Show"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...card, marginTop:14 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>🔗 Webhook Configuration</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[["Webhook URL", `${window.location.origin}/api/webhook`],["Verify Token", "myverifytoken123"],["Subscribed Events", "messages, message_deliveries, message_reads"]].map(([label,value]) => (
            <div key={label} style={{ background:C.bg, borderRadius:10, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, color:C.sub, fontWeight:700, marginBottom:2 }}>{label}</div>
                <div style={{ fontFamily:"monospace", fontSize:13 }}>{value}</div>
              </div>
              <button onClick={()=>{navigator.clipboard.writeText(value);alert("Copied!");}} style={{ ...btn("secondary"), fontSize:12, padding:"6px 10px" }}>📋</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop:14, padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e" }}>
          📋 Set up these values in <strong>Meta Business → WhatsApp → Configuration → Webhook</strong> to receive incoming messages and delivery updates.
        </div>
      </div>
    </div>
  );
}

// ─── INTEGRATIONS ─────────────────────────────────────────────────
function Integrations() {
  const STORAGE_KEY = "integrations";
  const [connected, setConnected] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  });
  const [activeModal, setActiveModal] = useState(null);
  const [webhookUrl, setWebhookUrl]   = useState("");

  const save = (c) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); setConnected(c); };
  const toggle = (key) => {
    if (connected[key]) {
      if (!window.confirm(`Disconnect ${key}?`)) return;
      const updated = {...connected}; delete updated[key]; save(updated);
    } else {
      setActiveModal(key); setWebhookUrl("");
    }
  };
  const connect = () => {
    if (!webhookUrl) return alert("Webhook URL is required");
    save({...connected, [activeModal]: { webhookUrl, connectedAt: new Date().toISOString() }});
    setActiveModal(null);
  };

  const integrations = [
    { key:"razorpay",  name:"Razorpay",   icon:"💳", desc:"Auto-send payment confirmations and receipts via WhatsApp when payments are received.", color:"#2d6cf6" },
    { key:"cashfree",  name:"Cashfree",   icon:"🏦", desc:"Trigger WhatsApp messages on payment success, failure or refunds.", color:"#00b386" },
    { key:"shopify",   name:"Shopify",    icon:"🛍", desc:"Send order confirmations, shipping updates and delivery notifications.", color:"#96bf48" },
    { key:"woocommerce",name:"WooCommerce",icon:"🛒", desc:"WhatsApp notifications for WooCommerce orders and customer updates.", color:"#7f54b3" },
    { key:"googlesheets",name:"Google Sheets",icon:"📊",desc:"Trigger WhatsApp messages from Google Sheets data entries.", color:"#34a853" },
    { key:"zapier",    name:"Zapier",     icon:"⚡", desc:"Connect with 5000+ apps via Zapier webhooks.", color:"#ff4a00" },
  ];

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>Integrations</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Connect your favourite tools to send WhatsApp messages automatically</p>

      {activeModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ ...card, width:460, maxWidth:"90vw" }}>
            <h3 style={{ margin:"0 0 14px", fontSize:16, fontWeight:800 }}>Connect {activeModal}</h3>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>WEBHOOK URL FROM {activeModal.toUpperCase()}</label>
            <input value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)} style={{ ...inp, marginTop:6, marginBottom:14 }} placeholder="https://api.example.com/webhook/..." />
            <div style={{ padding:"12px 14px", background:C.accentLight, borderRadius:10, fontSize:12, color:C.accent2, marginBottom:16 }}>
              📋 Copy your WASend webhook URL: <strong>{window.location.origin}/api/webhook</strong><br/>Paste it in {activeModal}'s webhook settings, then paste {activeModal}'s webhook URL above.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button style={btn()} onClick={connect}>Connect</button>
              <button style={btn("ghost")} onClick={()=>setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {integrations.map(ig => (
          <div key={ig.key} style={{ ...card }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:ig.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{ig.icon}</div>
              <div onClick={()=>toggle(ig.key)} style={{ width:44, height:24, borderRadius:99, background:connected[ig.key]?C.accent:C.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:"white", position:"absolute", top:3, left:connected[ig.key]?23:3, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{ig.name}</div>
            <div style={{ fontSize:13, color:C.sub, marginBottom:12, lineHeight:1.5 }}>{ig.desc}</div>
            {connected[ig.key] && (
              <div style={{ background:C.accentLight, borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:12, color:C.accent2 }}>
                ✅ Connected since {connected[ig.key].connectedAt?.split("T")[0]}
              </div>
            )}
            <button onClick={()=>toggle(ig.key)} style={{ ...btn(connected[ig.key]?"secondary":"primary"), width:"100%", fontSize:13 }}>
              {connected[ig.key] ? "⚙️ Disconnect" : "🔗 Connect"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── WHITE LABEL ──────────────────────────────────────────────────
function WhiteLabel() {
  const STORAGE_KEY = "white_label";
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { brandName:"WASend", tagline:"WhatsApp Marketing Platform", primaryColor:"#25d366", logo:"", customDomain:"", supportEmail:"", footerText:"" };
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>White Label</h2>
      <p style={{ color:C.sub, fontSize:13, margin:"0 0 20px" }}>Customize the platform with your own brand identity</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={card}>
            <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>🏷️ Brand Identity</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>BRAND NAME</label>
                <input value={settings.brandName} onChange={e=>setSettings({...settings,brandName:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Your Brand Name" />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TAGLINE</label>
                <input value={settings.tagline} onChange={e=>setSettings({...settings,tagline:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Your platform tagline" />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PRIMARY COLOR</label>
                <div style={{ display:"flex", gap:10, marginTop:5, alignItems:"center" }}>
                  <input type="color" value={settings.primaryColor} onChange={e=>setSettings({...settings,primaryColor:e.target.value})} style={{ width:44, height:40, borderRadius:8, border:`1px solid ${C.border}`, cursor:"pointer", padding:2 }} />
                  <input value={settings.primaryColor} onChange={e=>setSettings({...settings,primaryColor:e.target.value})} style={{ ...inp }} placeholder="#25d366" />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>LOGO URL (optional)</label>
                <input value={settings.logo} onChange={e=>setSettings({...settings,logo:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="https://yourdomain.com/logo.png" />
              </div>
            </div>
          </div>

          <div style={card}>
            <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>🌐 Domain & Contact</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>CUSTOM DOMAIN</label>
                <input value={settings.customDomain} onChange={e=>setSettings({...settings,customDomain:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="app.yourbrand.com" />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>SUPPORT EMAIL</label>
                <input value={settings.supportEmail} onChange={e=>setSettings({...settings,supportEmail:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="support@yourbrand.com" />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>FOOTER TEXT</label>
                <input value={settings.footerText} onChange={e=>setSettings({...settings,footerText:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="© 2025 Your Brand. All rights reserved." />
              </div>
            </div>
          </div>

          {saved && <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"12px 16px", color:C.accent2, fontWeight:600 }}>✅ Settings saved!</div>}
          <button style={btn()} onClick={save}>💾 Save White Label Settings</button>
        </div>

        <div style={{ ...card, alignSelf:"flex-start" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>👁️ Live Preview</h3>
          <div style={{ border:`2px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
            {/* Preview header */}
            <div style={{ padding:"12px 16px", background:settings.primaryColor, display:"flex", alignItems:"center", gap:10 }}>
              {settings.logo ? (
                <img src={settings.logo} alt="logo" style={{ height:28, borderRadius:4 }} onError={e=>e.target.style.display="none"} />
              ) : (
                <div style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:14 }}>W</div>
              )}
              <span style={{ fontWeight:800, fontSize:16, color:"white" }}>{settings.brandName || "Brand Name"}</span>
            </div>
            {/* Preview content */}
            <div style={{ padding:16, background:"white" }}>
              <div style={{ fontSize:13, color:C.sub, marginBottom:12 }}>{settings.tagline || "Your tagline here"}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                {["Dashboard","Campaigns","Contacts","Templates"].map(label => (
                  <div key={label} style={{ padding:"8px 12px", background:C.bg, borderRadius:8, fontSize:12, fontWeight:600, color:C.text }}>{label}</div>
                ))}
              </div>
              <button style={{ ...btn(), width:"100%", background:`linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}cc)`, fontSize:13 }}>+ Send Campaign</button>
            </div>
            {/* Preview footer */}
            <div style={{ padding:"10px 16px", background:C.bg, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.sub, textAlign:"center" }}>
              {settings.footerText || "© 2025 Your Brand"}
            </div>
          </div>
          {settings.customDomain && (
            <div style={{ marginTop:14, padding:"10px 14px", background:C.accentLight, borderRadius:10, fontSize:12, color:C.accent2 }}>
              🌐 Will be hosted at: <strong>{settings.customDomain}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── USERS LIST ───────────────────────────────────────────────────
function UsersList() {
  const STORAGE_KEY = "platform_users";
  const [users, setUsers] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [
      { id:1, name:"Admin User",     email:"admin@company.com",      role:"Admin",   status:"Active",   plan:"Pro",    lastLogin:"Today",     joined:"2025-01-15" },
      { id:2, name:"Sales Manager",  email:"sales@company.com",      role:"Manager", status:"Active",   plan:"Pro",    lastLogin:"Yesterday", joined:"2025-02-01" },
      { id:3, name:"Support Agent",  email:"support@company.com",    role:"Agent",   status:"Active",   plan:"Basic",  lastLogin:"2 days ago",joined:"2025-02-15" },
      { id:4, name:"Marketing Team", email:"marketing@company.com",  role:"Agent",   status:"Inactive", plan:"Basic",  lastLogin:"1 week ago",joined:"2025-03-01" },
    ];
  });
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm]             = useState({ name:"", email:"", role:"Agent", plan:"Basic" });
  const [search, setSearch]         = useState("");

  const save = (us) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(us)); setUsers(us); };
  const invite = () => {
    if (!form.name || !form.email) return alert("Name and email are required");
    save([...users, { id: Date.now(), ...form, status:"Active", lastLogin:"Never", joined: new Date().toISOString().split("T")[0] }]);
    setForm({ name:"", email:"", role:"Agent", plan:"Basic" }); setShowInvite(false);
  };
  const remove = (id) => { if (!window.confirm("Remove this user?")) return; save(users.filter(u => u.id!==id)); };
  const toggleStatus = (id) => save(users.map(u => u.id===id ? {...u, status:u.status==="Active"?"Inactive":"Active"} : u));

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const planColor = { Pro:[C.purple,"#f5f3ff"], Basic:[C.blue,"#eff6ff"], Enterprise:[C.accent,"#e8f8f0"] };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>Users List</h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.sub }}>Manage your platform users and their access levels</p>
        </div>
        <button style={btn()} onClick={()=>setShowInvite(!showInvite)}>+ Invite User</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        <Stat icon="👥" label="Total Users"    value={users.length} />
        <Stat icon="✅" label="Active Users"   value={users.filter(u=>u.status==="Active").length}   color={C.accent} />
        <Stat icon="⏸" label="Inactive Users" value={users.filter(u=>u.status==="Inactive").length} color={C.yellow} />
        <Stat icon="👑" label="Admins"         value={users.filter(u=>u.role==="Admin").length}      color={C.purple} />
      </div>

      {showInvite && (
        <div style={{ ...card, marginBottom:18, border:`1.5px solid ${C.accent}`, background:C.accentLight }}>
          <h4 style={{ margin:"0 0 14px", color:C.accent2 }}>Invite New User</h4>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>FULL NAME *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="Full Name" /></div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>EMAIL *</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="user@email.com" /></div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>ROLE</label>
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option>Admin</option><option>Manager</option><option>Agent</option>
              </select>
            </div>
            <div><label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PLAN</label>
              <select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})} style={{ ...inp, marginTop:5 }}>
                <option>Basic</option><option>Pro</option><option>Enterprise</option>
              </select>
            </div>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:14 }}>
            <button style={btn()} onClick={invite}>Send Invite</button>
            <button style={btn("ghost")} onClick={()=>setShowInvite(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>All Users ({filtered.length})</h3>
          <input placeholder="🔍 Search users..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, width:220, fontSize:13 }} />
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["User","Email","Role","Plan","Status","Joined","Actions"].map(h=><th key={h} style={{ textAlign:"left", padding:"10px 12px", fontSize:11, color:C.sub, fontWeight:700, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:"12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:13, flexShrink:0 }}>{u.name[0]}</div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{u.name}</div>
                  </div>
                </td>
                <td style={{ padding:"12px", color:C.sub, fontSize:13 }}>{u.email}</td>
                <td style={{ padding:"12px" }}><span style={pill(C.blue,"#eff6ff")}>{u.role}</span></td>
                <td style={{ padding:"12px" }}><span style={pill(...(planColor[u.plan]||[C.sub,"#f0f4f2"]))}>{u.plan}</span></td>
                <td style={{ padding:"12px" }}><Badge status={u.status}/></td>
                <td style={{ padding:"12px", color:C.sub, fontSize:12 }}>{u.joined}</td>
                <td style={{ padding:"12px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>toggleStatus(u.id)} style={{ ...btn("secondary"), fontSize:11, padding:"5px 10px" }}>{u.status==="Active"?"Deactivate":"Activate"}</button>
                    <button onClick={()=>remove(u.id)} style={{ ...btn("ghost"), fontSize:11, padding:"5px 10px", color:C.red }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAGE ROUTER ──────────────────────────────────────────────────
// ─── LIVE CHAT ────────────────────────────────────────────────────
function LiveChat() {
  const { templates } = useTemplates();
  const [conversations, setConversations] = useState([]);
  const [activePhone, setActivePhone]     = useState(null);
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [msgLoading, setMsgLoading]       = useState(false);
  const [replyText, setReplyText]         = useState("");
  const [replyType, setReplyType]         = useState("text");
  const [replyTemplate, setReplyTemplate] = useState("");
  const [replyLang, setReplyLang]         = useState("en_US");
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState("");
  const [autoRefresh, setAutoRefresh]     = useState(true);
  const bottomRef = useRef();

  const loadConversations = () => {
    fetch("/api/live-chat")
      .then(r => r.json())
      .then(data => { setConversations(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadMessages = (phone) => {
    setMsgLoading(true);
    fetch(`/api/live-chat?phone=${phone}`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); setMsgLoading(false); })
      .catch(() => setMsgLoading(false));
  };

  useEffect(() => { loadConversations(); }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadConversations();
      if (activePhone) loadMessages(activePhone);
    }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, activePhone]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const openConversation = (phone) => {
    setActivePhone(phone);
    loadMessages(phone);
  };

  const sendReply = async () => {
    if (!activePhone) return;
    if (replyType === "text" && !replyText.trim()) return alert("Please type a message");
    if (replyType === "template" && !replyTemplate) return alert("Please select a template");
    setSending(true);
    const r = await fetch("/api/live-chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ to:activePhone, message:replyText, replyType, templateName:replyTemplate, languageCode:replyLang }),
    });
    setSending(false);
    if (r.ok) {
      setReplyText(""); setReplyTemplate("");
      loadMessages(activePhone); loadConversations();
    } else {
      const d = await r.json(); alert(d.error || "Failed to send");
    }
  };

  const filtered = conversations.filter(c =>
    c.phone?.includes(search) || c.lastMsg?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })
      : d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  };

  const activeConv = conversations.find(c => c.phone === activePhone);

  return (
    <div style={{ display:"flex", height:"calc(100vh - 110px)", gap:0, borderRadius:14, overflow:"hidden", border:`1px solid ${C.border}` }}>

      {/* ── Left panel — conversation list ── */}
      <div style={{ width:320, flexShrink:0, background:"white", borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>
        {/* Header */}
        <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800 }}>💬 Live Chat</h3>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:autoRefresh?C.accent:"#ccc" }} />
              <span style={{ fontSize:11, color:C.sub }}>Live</span>
              <button onClick={loadConversations} style={{ ...btn("secondary"), padding:"4px 8px", fontSize:11 }}>↻</button>
            </div>
          </div>
          <input placeholder="🔍 Search conversations..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ ...inp, fontSize:13 }} />
        </div>

        {/* Conversation list */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading ? <Loader /> : filtered.length === 0 ? (
            <div style={{ padding:30, textAlign:"center", color:C.sub, fontSize:13 }}>
              No conversations yet.<br/>Messages from customers will appear here.
            </div>
          ) : filtered.map(conv => (
            <div key={conv.phone} onClick={()=>openConversation(conv.phone)}
              style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, cursor:"pointer",
                background:activePhone===conv.phone ? C.accentLight : "white",
                borderLeft: activePhone===conv.phone ? `3px solid ${C.accent}` : "3px solid transparent" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {/* Avatar */}
                  <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
                    display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:14, flexShrink:0 }}>
                    {conv.phone?.slice(-2)}
                  </div>
                  <div>
                    {/* Show real WhatsApp number */}
                    <div style={{ fontWeight:700, fontSize:13, color:C.text }}>+{conv.phone}</div>
                    <div style={{ fontSize:11, color:C.sub }}>{conv.totalMsgs} messages</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ fontSize:11, color:C.sub }}>{fmt(conv.lastTime)}</span>
                  {conv.unread > 0 && (
                    <span style={{ background:C.accent, color:"white", borderRadius:10, fontSize:10, fontWeight:700, padding:"1px 7px" }}>{conv.unread}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize:12, color:C.sub, marginLeft:46, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {conv.direction==="outbound" ? "You: " : ""}{conv.lastMsg}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — chat window ── */}
      {!activePhone ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:C.sub, background:C.bg }}>
          <div style={{ fontSize:56 }}>💬</div>
          <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Select a conversation</div>
          <div style={{ fontSize:13 }}>Click any conversation on the left to open it</div>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:C.bg }}>
          {/* Chat header */}
          <div style={{ padding:"12px 20px", background:"white", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
                display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800 }}>
                {activePhone?.slice(-2)}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:15 }}>+{activePhone}</div>
                <div style={{ fontSize:12, color:C.sub }}>{activeConv?.totalMsgs || 0} messages · WhatsApp</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <a href={`https://wa.me/${activePhone}`} target="_blank" rel="noreferrer"
                style={{ ...btn("secondary"), textDecoration:"none", fontSize:12, padding:"6px 12px" }}>
                Open in WhatsApp ↗
              </a>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:8 }}>
            {msgLoading ? <Loader /> : messages.map((msg, i) => {
              const isOut = msg.direction === "outbound";
              return (
                <div key={i} style={{ display:"flex", justifyContent:isOut?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"65%", padding:"10px 14px", borderRadius:isOut?"14px 14px 4px 14px":"14px 14px 14px 4px",
                    background:isOut?`linear-gradient(135deg,${C.accent},${C.accent2})`:"white",
                    color:isOut?"white":C.text, fontSize:13, lineHeight:1.5,
                    boxShadow:"0 1px 3px rgba(0,0,0,0.08)", border:isOut?"none":`1px solid ${C.border}` }}>
                    <div>{msg.body}</div>
                    <div style={{ fontSize:10, marginTop:4, opacity:0.7, textAlign:"right" }}>
                      {fmt(msg.created_at)} {isOut ? (msg.status==="delivered"?"✓✓":msg.status==="read"?"✓✓":"✓") : ""}
                    </div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && !msgLoading && (
              <div style={{ textAlign:"center", color:C.sub, fontSize:13, marginTop:40 }}>No messages yet in this conversation</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div style={{ background:"white", borderTop:`1px solid ${C.border}`, padding:"14px 20px" }}>
            {/* Reply type toggle */}
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              {[["text","✏️ Text"],["template","📋 Template"]].map(([val,label])=>(
                <button key={val} onClick={()=>setReplyType(val)}
                  style={{ ...btn(replyType===val?"primary":"secondary"), fontSize:12, padding:"6px 14px" }}>{label}</button>
              ))}
            </div>

            {replyType === "text" ? (
              <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                <textarea
                  value={replyText}
                  onChange={e=>setReplyText(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendReply(); } }}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  style={{ ...inp, flex:1, minHeight:44, maxHeight:120, resize:"none" }}
                />
                <button onClick={sendReply} disabled={sending}
                  style={{ ...btn(), padding:"12px 20px", flexShrink:0 }}>
                  {sending ? "..." : "Send ➤"}
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, color:C.sub, fontWeight:700 }}>SELECT TEMPLATE</label>
                    <select value={replyTemplate} onChange={e=>setReplyTemplate(e.target.value)} style={{ ...inp, marginTop:4, fontSize:13 }}>
                      <option value="">— Select approved template —</option>
                      {templates.map(t=>(
                        <option key={`${t.name}_${t.language}`} value={t.name}>{t.name} ({t.language}) — {t.category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:C.sub, fontWeight:700 }}>LANGUAGE</label>
                    <select value={replyLang} onChange={e=>setReplyLang(e.target.value)} style={{ ...inp, marginTop:4, fontSize:13 }}>
                      <option value="en_US">English (US)</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                      <option value="gu">Gujarati</option>
                      <option value="ta">Tamil</option>
                    </select>
                  </div>
                </div>
                {replyTemplate && templates.find(t=>t.name===replyTemplate) && (
                  <div style={{ padding:"8px 12px", background:C.accentLight, borderRadius:8, fontSize:12, color:C.accent2 }}>
                    Preview: {templates.find(t=>t.name===replyTemplate)?.preview}
                  </div>
                )}
                <button onClick={sendReply} disabled={sending} style={{ ...btn(), alignSelf:"flex-end", minWidth:160 }}>
                  {sending ? "Sending..." : "📋 Send Template ➤"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PageContent({ page }) {
  const map = {
    "dashboard":        <Dashboard />,
    "contacts":         <Contacts />,
    "campaign-summary": <CampaignSummary />,
    "create-campaign":  <CreateCampaign />,
    "send-single":      <SendSingle />,
    "link-qr":          <LinkQR />,
    "wa-account":       <WAAccount />,
    "auto-responder":   <AutoResponder />,
    "chatbot":          <ChatBot />,
    "live-chat":        <LiveChat />,
    "msg-template":     <MessageTemplate />,
    "list-template":    <ListTemplate />,
    "group-grabber":    <GroupGrabber />,
    "wa-warmer":        <WAWarmer />,
    "wa-api":           <WAAPI />,
    "integrations":     <Integrations />,
    "white-label":      <WhiteLabel />,
    "users-list":       <UsersList />,
    "wa-group":         <Contacts />,
  };
  return map[page] || <Dashboard />;
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage]             = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:"'DM Sans','Segoe UI',sans-serif", color:C.text, overflow:"hidden" }}>
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
