// api/admin.js
// Consolidates: auto-responder + chatbot-flows + debug diagnostics
// Route by ?resource= query param:
//   /api/admin?resource=auto-responder   → auto responder rules
//   /api/admin?resource=chatbot-flows    → chatbot flows
//   /api/admin?resource=debug            → diagnostics (GET) / template test (POST)

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ─── AUTO RESPONDER ───────────────────────────────────────────────────────────
async function handleAutoResponder(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase.from("auto_responder_rules").select("*").order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  if (req.method === "POST") {
    const { rules } = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: "rules array required" });
    await supabase.from("auto_responder_rules").delete().neq("id", 0);
    if (rules.length > 0) {
      const { error } = await supabase.from("auto_responder_rules").insert(
        rules.map(r => ({
          keyword: r.keyword, match_type: r.matchType,
          response_type: r.responseType || "text",
          response_text: r.response || null,
          template_name: r.templateName || null,
          language_code: r.languageCode || "en_US",
          active: r.active,
        }))
      );
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── CHATBOT FLOWS ────────────────────────────────────────────────────────────
async function handleChatbotFlows(req, res) {
  if (req.method === "GET") {
    const { data, error } = await supabase.from("chatbot_flows").select("*").order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }
  if (req.method === "POST") {
    const { flows } = req.body;
    if (!Array.isArray(flows)) return res.status(400).json({ error: "flows array required" });
    const { error: delErr } = await supabase.from("chatbot_flows").delete().neq("id", 0);
    if (delErr) return res.status(500).json({ error: delErr.message });
    if (flows.length > 0) {
      const rows = flows.map(f => ({
        id: f.id, name: f.name, triggers: f.triggers, active: f.active,
        steps: Array.isArray(f.steps)
          ? f.steps.map(s => ({ type: s.type, content: s.content || "", templateName: s.templateName || "", languageCode: s.languageCode || "en_US" }))
          : [],
      }));
      const { error: insErr } = await supabase.from("chatbot_flows").insert(rows);
      if (insErr) return res.status(500).json({ error: insErr.message });
    }
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ error: "Method not allowed" });
}

// ─── DEBUG DIAGNOSTICS ────────────────────────────────────────────────────────
async function handleDebug(req, res) {
  const report = { timestamp: new Date().toISOString(), tests: {} };

  // Test 1: Supabase connection
  try {
    const { data, error } = await supabase.from("messages").select("id").limit(1);
    report.tests.supabase_connection = error ? { status: "FAIL", error: error.message } : { status: "OK" };
  } catch (e) { report.tests.supabase_connection = { status: "FAIL", error: e.message }; }

  // Test 2: messages table columns
  try {
    const { data, error } = await supabase.from("messages").select("*").limit(1);
    if (error) {
      report.tests.messages_schema = { status: "FAIL", error: error.message };
    } else {
      const cols = data?.length > 0 ? Object.keys(data[0]) : [];
      const required = ["to_number","body","status","direction","campaign_id","wa_message_id","error_detail","contact_name"];
      const missing = required.filter(c => !cols.includes(c));
      report.tests.messages_schema = { status: missing.length === 0 ? "OK" : "MISSING_COLUMNS", columns_found: cols, columns_missing: missing };
    }
  } catch (e) { report.tests.messages_schema = { status: "FAIL", error: e.message }; }

  // Test 3: insert test
  try {
    const { error } = await supabase.from("messages").insert([{ to_number:"919999999999", body:"__debug__", status:"failed", direction:"outbound", campaign_id:"debug-test", contact_name:"Debug", wa_message_id:null, error_detail:"debug" }]);
    if (!error) {
      await supabase.from("messages").delete().eq("body","__debug__");
      report.tests.insert_test = { status: "OK", note: "Full row insert works — all columns exist" };
    } else {
      const { error: e2 } = await supabase.from("messages").insert([{ to_number:"919999999999", body:"__debug__", status:"failed", direction:"outbound" }]);
      if (!e2) {
        await supabase.from("messages").delete().eq("body","__debug__");
        report.tests.insert_test = { status: "PARTIAL", full_error: error.message, note: "Bare insert works but extra columns missing — campaign_id will NOT be saved!" };
      } else {
        report.tests.insert_test = { status: "FAIL_ALL", full_error: error.message, bare_error: e2.message };
      }
    }
  } catch (e) { report.tests.insert_test = { status: "EXCEPTION", error: e.message }; }

  // Test 4: credentials
  const token   = req.headers["x-wa-token"]    || process.env.WHATSAPP_TOKEN;
  const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
  const wabaId  = req.headers["x-wa-waba-id"]  || process.env.WABA_ID;
  report.tests.credentials = { token_present: !!token, token_prefix: token ? token.slice(0,8)+"…" : null, phone_id: phoneId || null, waba_id: wabaId || null };

  // Test 5: Meta phone validation
  if (token && phoneId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,status`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      report.tests.meta_phone = r.ok ? { status:"OK", phone:d.display_phone_number, name:d.verified_name, quality:d.quality_rating, wa_status:d.status } : { status:"FAIL", error:d.error?.message, code:d.error?.code };
    } catch (e) { report.tests.meta_phone = { status:"EXCEPTION", error:e.message }; }
  }

  // Test 6: approved templates
  if (token && wabaId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=50&fields=name,language,status,components`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (r.ok) {
        const approved = (d.data||[]).filter(t => t.status==="APPROVED");
        report.tests.meta_templates = { status:"OK", total:d.data?.length, approved:approved.length,
          approved_list: approved.map(t => ({ name:t.name, language:t.language, category:t.category, has_variables:(t.components||[]).some(c=>c.type==="BODY"&&(c.text||"").includes("{{")) })) };
      } else {
        report.tests.meta_templates = { status:"FAIL", error:d.error?.message, code:d.error?.code };
      }
    } catch (e) { report.tests.meta_templates = { status:"EXCEPTION", error:e.message }; }
  }

  // Test 7: template send test (POST only)
  if (req.method === "POST" && req.body?.template_name && req.body?.to && token && phoneId) {
    const { template_name, language_code, to } = req.body;
    const toNorm = String(to).replace(/\D/g,"");
    const payload = { messaging_product:"whatsapp", to:toNorm, type:"template", template:{ name:template_name, language:{ code:language_code||"en_US" } } };
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, { method:"POST", headers:{ Authorization:`Bearer ${token}`, "Content-Type":"application/json" }, body:JSON.stringify(payload) });
      const d = await r.json();
      report.tests.template_send_test = { template:template_name, language_sent:language_code||"en_US", http_status:r.status, meta_response:d, result:r.ok?"SUCCESS":"FAILED", meta_error:d.error||null };
    } catch (e) { report.tests.template_send_test = { status:"EXCEPTION", error:e.message }; }
  }

  return res.status(200).json(report);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  const resource = req.query.resource;

  if (resource === "auto-responder") return handleAutoResponder(req, res);
  if (resource === "chatbot-flows")  return handleChatbotFlows(req, res);
  if (resource === "debug")          return handleDebug(req, res);

  return res.status(400).json({ error: "Missing ?resource= param. Use: auto-responder, chatbot-flows, debug" });
};
