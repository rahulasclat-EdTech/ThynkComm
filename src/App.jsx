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

      {/* Connected Accounts */}
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

      {/* Add Account Form */}
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
            <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>⚠️ Never share this token. Regenerate in Meta if compromised.</div>
          </div>
          <div>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>PHONE NUMBER ID *</label>
            <input value={form.phone_number_id} onChange={e=>setForm({...form,phone_number_id:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="1234567890" />
          </div>
          <div>
            <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>WABA ID (WhatsApp Business Account ID) *</label>
            <input value={form.waba_id} onChange={e=>setForm({...form,waba_id:e.target.value})} style={{ ...inp, marginTop:5 }} placeholder="9876543210" />
          </div>
        </div>

        <div style={{ marginTop:18, padding:"14px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10 }}>
          <div style={{ fontWeight:700, fontSize:13, color:"#92400e", marginBottom:6 }}>📋 How to get these values</div>
          <ol style={{ margin:0, paddingLeft:18, fontSize:12, color:"#92400e", lineHeight:1.8 }}>
            <li>Go to <strong>developers.facebook.com</strong> → My Apps → Your App</li>
            <li>Click <strong>WhatsApp → API Setup</strong></li>
            <li>Copy the <strong>Temporary Access Token</strong> (or generate a permanent one)</li>
            <li>Copy the <strong>Phone Number ID</strong> shown below the token</li>
            <li>Copy the <strong>WhatsApp Business Account ID</strong> shown on the same page</li>
          </ol>
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

// ─── CONTACTS (with Groups) ────────────────────────────────────────
function Contacts() {
  const [groups, setGroups]       = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeGroup, setActiveGroup] = useState(null); // null = show groups list
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [search, setSearch]       = useState("");
  const [form, setForm]           = useState({ name:"", phone:"", email:"", tag:"Lead" });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const fileRef = useRef();

  // Load contacts from API
  const loadContacts = () => {
    fetch("/api/contacts")
      .then(r => r.json())
      .then(data => { setContacts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  // Load groups from localStorage
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
    if (!window.confirm("Delete this group? Contacts will not be deleted.")) return;
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
      // Add contact to group
      if (activeGroup) {
        const updated = groups.map(g => g.id === activeGroup ? { ...g, contactIds: [...(g.contactIds||[]), saved.id] } : g);
        saveGroups(updated);
      }
      setShowAddContact(false);
      setForm({ name:"", phone:"", email:"", tag:"Lead" });
      loadContacts();
    } else {
      const d = await r.json(); alert(d.error);
    }
  };

  // Excel import
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
      if (phoneIdx === -1) return alert("CSV must have a column named 'phone', 'mobile' or 'number'");
      let imported = 0;
      const newIds = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/"/g,""));
        const phone = cols[phoneIdx];
        if (!phone) continue;
        const name  = nameIdx  >= 0 ? cols[nameIdx]  : phone;
        const email = emailIdx >= 0 ? cols[emailIdx] : "";
        const r = await fetch("/api/contacts", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ name, phone, email, tag:"Lead" }),
        });
        if (r.ok) { const d = await r.json(); newIds.push(d.id); imported++; }
      }
      // Add imported contacts to group
      if (activeGroup && newIds.length) {
        const updated = groups.map(g => g.id === activeGroup ? { ...g, contactIds: [...(g.contactIds||[]), ...newIds] } : g);
        saveGroups(updated);
      }
      loadContacts();
      alert(`✅ Imported ${imported} contacts successfully!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const currentGroup   = groups.find(g => g.id === activeGroup);
  const groupContacts  = activeGroup
    ? contacts.filter(c => (currentGroup?.contactIds || []).includes(c.id))
    : [];
  const filteredContacts = groupContacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  // ── Groups List View ──
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
            <input value={groupName} onChange={e=>setGroupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGroup()} style={{ ...inp }} placeholder="Group name e.g. Premium Customers" autoFocus />
            <button style={{ ...btn(), flexShrink:0 }} onClick={addGroup}>Create</button>
            <button style={{ ...btn("ghost"), flexShrink:0 }} onClick={()=>{setShowAddGroup(false);setGroupName("");}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <Loader /> : groups.length === 0 ? (
        <div style={{ ...card, textAlign:"center", padding:"50px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
          <h3 style={{ margin:"0 0 8px", color:C.text }}>No groups yet</h3>
          <p style={{ color:C.sub, fontSize:14, margin:"0 0 16px" }}>Create a group to start organising your contacts</p>
          <button style={btn()} onClick={() => setShowAddGroup(true)}>+ Create First Group</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {groups.map(g => {
            const count = (g.contactIds||[]).length;
            return (
              <div key={g.id} style={{ ...card, cursor:"pointer", transition:"all 0.15s" }}
                onClick={() => setActiveGroup(g.id)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👥</div>
                  <button onClick={e=>{e.stopPropagation();deleteGroup(g.id);}} style={{ ...btn("ghost"), fontSize:12, color:C.red, padding:"4px 8px" }}>✕</button>
                </div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{g.name}</div>
                <div style={{ fontSize:13, color:C.sub, marginBottom:10 }}>{count} contact{count!==1?"s":""}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:C.sub }}>{g.created_at?.split("T")[0]}</span>
                  <span style={{ ...pill(C.accent2, C.accentLight), fontSize:11 }}>Open →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Group Detail View ──
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <button onClick={() => { setActiveGroup(null); setSearch(""); setShowAddContact(false); }} style={{ ...btn("secondary"), padding:"8px 14px", fontSize:13 }}>← Back</button>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>👥 {currentGroup?.name}</h2>
          <p style={{ margin:"2px 0 0", fontSize:12, color:C.sub }}>{groupContacts.length} contacts in this group</p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
          <button style={{ ...btn("secondary"), fontSize:13 }} onClick={() => fileRef.current.click()}>📥 Import CSV/Excel</button>
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

      {/* CSV format hint */}
      <div style={{ ...card, marginBottom:14, background:"#fffbeb", border:"1px solid #fde68a", padding:"12px 16px" }}>
        <div style={{ fontSize:12, color:"#92400e" }}>
          📋 <strong>CSV Import Format:</strong> Your file should have columns: <code>name, phone, email</code> (headers required). Phone must include country code e.g. <code>919999999999</code>
        </div>
      </div>

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Contacts ({filteredContacts.length})</h3>
          <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, width:220, fontSize:13 }} />
        </div>
        {loading ? <Loader /> : filteredContacts.length === 0 ? (
          <div style={{ textAlign:"center", padding:"30px 0", color:C.sub, fontSize:13 }}>
            No contacts in this group yet. Add manually or import a CSV.
          </div>
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
          </div>
          <div style={card}>
            <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message</h3>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} style={{ ...inp, minHeight:120, resize:"vertical" }} placeholder="Type your message here..." />
            <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{msg.length}/4096</div>
          </div>
          {status==="success" && <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"12px 16px", color:C.accent2, fontWeight:600 }}>✅ Message sent!</div>}
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
  const [step, setStep]               = useState(1);
  const [contacts, setContacts]       = useState([]);
  const [groups, setGroups]           = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [msgType, setMsgType]         = useState("text"); // "text" | "template"
  const [message, setMessage]         = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("en_US");
  const [status, setStatus]           = useState(null);
  const [result, setResult]           = useState(null);
  const [scheduleType, setScheduleType] = useState("now"); // "now" | "scheduled"
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
    if (scheduleType === "scheduled" && (!scheduleDate || !scheduleTime)) return alert("Please select a date and time for scheduling");
    setStatus("sending");
    try {
      const r = await fetch("/api/campaigns", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: campaignName,
          contactIds: groupContacts.map(c => c.id),
          message: msgType === "text" ? message : undefined,
          templateName: msgType === "template" ? templateName : undefined,
          languageCode: templateLang,
          scheduleType,
          scheduledAt: scheduleType === "scheduled" ? `${scheduleDate}T${scheduleTime}` : null,
          timezone: scheduleTimezone,
        }),
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

      {/* Step 1 — Name */}
      {step===1 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Campaign Name</h3>
          <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} style={inp} placeholder="e.g. Diwali Sale 2025" />
          <button style={{ ...btn(), marginTop:14 }} onClick={()=>{ if(!campaignName) return alert("Enter a campaign name"); setStep(2); }}>Continue →</button>
        </div>
      )}

      {/* Step 2 — Template / Message */}
      {step===2 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Message Type</h3>

          {/* Toggle */}
          <div style={{ display:"flex", gap:10, marginBottom:18 }}>
            {[["text","✏️ Custom Text"],["template","📋 Meta Template"]].map(([val,label])=>(
              <button key={val} onClick={()=>setMsgType(val)} style={{ ...btn(msgType===val?"primary":"secondary"), fontSize:13 }}>{label}</button>
            ))}
          </div>

          {msgType === "text" && (
            <div>
              <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>MESSAGE TEXT *</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} style={{ ...inp, minHeight:140, resize:"vertical", marginTop:6 }} placeholder="Type your campaign message... Use {{1}}, {{2}} for variables." />
              <div style={{ fontSize:11, color:C.sub, marginTop:5 }}>{message.length}/4096</div>
            </div>
          )}

          {msgType === "template" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ padding:"12px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, fontSize:12, color:"#92400e" }}>
                ⚠️ Templates must be pre-approved by Meta. Go to <strong>Meta Business Manager → Message Templates</strong> to create and get approval.
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TEMPLATE NAME * (exact name from Meta)</label>
                <input value={templateName} onChange={e=>setTemplateName(e.target.value)} style={{ ...inp, marginTop:6 }} placeholder="e.g. hello_world" />
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>LANGUAGE CODE</label>
                <select value={templateLang} onChange={e=>setTemplateLang(e.target.value)} style={{ ...inp, marginTop:6 }}>
                  <option value="en_US">English (US)</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="gu">Gujarati</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="bn">Bengali</option>
                  <option value="pa">Punjabi</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button style={btn("secondary")} onClick={()=>setStep(1)}>← Back</button>
            <button style={btn()} onClick={()=>{ if(msgType==="text"&&!message) return alert("Enter your message"); if(msgType==="template"&&!templateName) return alert("Enter template name"); setStep(3); }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3 — Select Group */}
      {step===3 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 6px", fontSize:15, fontWeight:700 }}>Select Contact Group</h3>
          <p style={{ margin:"0 0 16px", fontSize:13, color:C.sub }}>All opted-in contacts in the selected group will receive this campaign</p>

          {groups.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px", background:C.bg, borderRadius:10 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👥</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>No contact groups found</div>
              <div style={{ fontSize:13, color:C.sub }}>Go to Contacts → create a group first</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {groups.map(g => {
                const count = contacts.filter(c => (g.contactIds||[]).includes(c.id) && c.opt_in).length;
                const sel = selectedGroup === g.id;
                return (
                  <div key={g.id} onClick={()=>setSelectedGroup(g.id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderRadius:10, border:`2px solid ${sel?C.accent:C.border}`, background:sel?C.accentLight:"white", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.accent},${C.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👥</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{g.name}</div>
                        <div style={{ fontSize:12, color:C.sub }}>{count} opted-in contact{count!==1?"s":""}</div>
                      </div>
                    </div>
                    <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${sel?C.accent:C.border}`, background:sel?C.accent:"white", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:12 }}>
                      {sel?"✓":""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button style={btn("secondary")} onClick={()=>setStep(2)}>← Back</button>
            <button style={btn()} onClick={()=>{ if(!selectedGroup) return alert("Select a contact group"); setStep(4); }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 4 — Schedule */}
      {step===4 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 6px", fontSize:15, fontWeight:700 }}>Schedule Campaign</h3>
          <p style={{ margin:"0 0 18px", fontSize:13, color:C.sub }}>Send immediately or schedule for a specific date and time</p>

          {/* Send Now vs Schedule toggle */}
          <div style={{ display:"flex", gap:12, marginBottom:22 }}>
            {[
              ["now",       "⚡", "Send Now",      "Launch immediately after review"],
              ["scheduled", "🕐", "Schedule Later", "Pick a date and time to send"],
            ].map(([val, icon, label, desc]) => (
              <div key={val} onClick={()=>setScheduleType(val)} style={{ flex:1, padding:"16px", borderRadius:12, border:`2px solid ${scheduleType===val?C.accent:C.border}`, background:scheduleType===val?C.accentLight:"white", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:4, color:scheduleType===val?C.accent2:C.text }}>{label}</div>
                <div style={{ fontSize:12, color:C.sub }}>{desc}</div>
                <div style={{ marginTop:10, width:18, height:18, borderRadius:"50%", border:`2px solid ${scheduleType===val?C.accent:C.border}`, background:scheduleType===val?C.accent:"white", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:11 }}>
                  {scheduleType===val?"✓":""}
                </div>
              </div>
            ))}
          </div>

          {/* Date/Time picker — only shown when scheduled */}
          {scheduleType === "scheduled" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"18px", background:C.bg, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div>
                  <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>DATE *</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e=>setScheduleDate(e.target.value)}
                    style={{ ...inp, marginTop:6 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TIME *</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e=>setScheduleTime(e.target.value)}
                    style={{ ...inp, marginTop:6 }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:C.sub, fontWeight:700 }}>TIMEZONE</label>
                <select value={scheduleTimezone} onChange={e=>setScheduleTimezone(e.target.value)} style={{ ...inp, marginTop:6 }}>
                  <option value="Asia/Kolkata">India Standard Time (IST) — UTC+5:30</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST) — UTC+4</option>
                  <option value="Asia/Singapore">Singapore Time (SGT) — UTC+8</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT) — UTC+0</option>
                  <option value="America/New_York">Eastern Time (ET) — UTC-5</option>
                  <option value="America/Los_Angeles">Pacific Time (PT) — UTC-8</option>
                  <option value="America/Chicago">Central Time (CT) — UTC-6</option>
                  <option value="Europe/Paris">Central European Time (CET) — UTC+1</option>
                  <option value="Australia/Sydney">Australian Eastern Time (AET) — UTC+10</option>
                </select>
              </div>
              {scheduleDate && scheduleTime && (
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"white", borderRadius:10, border:`1px solid ${C.accent}40` }}>
                  <span style={{ fontSize:20 }}>📅</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:C.accent2 }}>Scheduled for</div>
                    <div style={{ fontSize:13, color:C.sub }}>
                      {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleDateString("en-IN", { weekday:"long", year:"numeric", month:"long", day:"numeric" })} at {scheduleTime} ({scheduleTimezone.split("/")[1]?.replace("_"," ")})
                    </div>
                  </div>
                </div>
              )}
              <div style={{ fontSize:12, color:C.sub, padding:"10px 14px", background:"#fffbeb", borderRadius:8, border:"1px solid #fde68a" }}>
                ⚠️ <strong>Note:</strong> Scheduling saves the campaign details. You'll need a cron job or Vercel scheduled function to trigger sending at the set time. For now this stores the schedule time in the campaign record.
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:18 }}>
            <button style={btn("secondary")} onClick={()=>setStep(3)}>← Back</button>
            <button style={btn()} onClick={()=>setStep(5)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 5 — Review & Send */}
      {step===5 && (
        <div style={card}>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>Review & Send</h3>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {[
              ["Campaign Name", campaignName],
              ["Message Type", msgType === "template" ? `Template: ${templateName} (${templateLang})` : "Custom Text"],
              ["Contact Group", currentGroup?.name || "—"],
              ["Recipients", `${groupContacts.length} opted-in contacts`],
              ["Schedule", scheduleType === "now" ? "⚡ Send Immediately" : `🕐 ${scheduleDate} at ${scheduleTime} (${scheduleTimezone.split("/")[1]?.replace("_"," ")})`],
            ].map(([label, value]) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 14px", background:C.bg, borderRadius:9 }}>
                <span style={{ color:C.sub, fontSize:13 }}>{label}</span>
                <span style={{ fontWeight:700, fontSize:13 }}>{value}</span>
              </div>
            ))}
            {msgType === "text" && (
              <div style={{ padding:"10px 14px", background:C.bg, borderRadius:9 }}>
                <div style={{ color:C.sub, fontSize:13, marginBottom:4 }}>Message Preview</div>
                <div style={{ fontSize:13, whiteSpace:"pre-wrap" }}>{message}</div>
              </div>
            )}
          </div>

          {status==="success" && result && (
            <div style={{ background:C.accentLight, border:`1px solid ${C.accent}`, borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
              <div style={{ fontWeight:700, color:C.accent2, marginBottom:4 }}>
                {scheduleType === "scheduled" ? "📅 Campaign Scheduled!" : "✅ Campaign Sent!"}
              </div>
              <div style={{ fontSize:13, color:C.sub }}>
                {scheduleType === "scheduled"
                  ? `Scheduled for ${scheduleDate} at ${scheduleTime} (${scheduleTimezone.split("/")[1]?.replace("_"," ")})`
                  : `Sent: ${result.sent} | Failed: ${result.failed}`}
              </div>
            </div>
          )}
          {status==="error" && <ErrorBox msg="Something went wrong. Check your API credentials." />}

          <div style={{ display:"flex", gap:10 }}>
            <button style={btn("secondary")} onClick={()=>setStep(4)}>← Back</button>
            <button style={{ ...btn(), minWidth:180 }} onClick={send} disabled={status==="sending"}>
              {status==="sending" ? "⏳ Sending..." : scheduleType === "scheduled" ? "📅 Schedule Campaign" : "🚀 Launch Campaign"}
            </button>
          </div>
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

// ─── PAGE ROUTER ──────────────────────────────────────────────────
function PageContent({ page }) {
  const map = {
    "dashboard":        <Dashboard />,
    "contacts":         <Contacts />,
    "campaign-summary": <CampaignSummary />,
    "create-campaign":  <CreateCampaign />,
    "send-single":      <SendSingle />,
    "link-qr":          <LinkQR />,
    "wa-account":       <WAAccount />,
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
  const [activePage, setActivePage]             = useState("dashboard");
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
