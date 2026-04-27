// api/debug.js
// GET /api/debug — tests DB connection, schema, and Meta credentials
// DELETE after debugging is done

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-wa-token, x-wa-phone-id, x-wa-waba-id");
  if (req.method === "OPTIONS") return res.status(200).end();

  const report = { timestamp: new Date().toISOString(), tests: {} };

  // ── Test 1: Supabase connection ───────────────────────────────────────────
  try {
    const { data, error } = await supabase.from("messages").select("id").limit(1);
    report.tests.supabase_connection = error
      ? { status: "FAIL", error: error.message }
      : { status: "OK", row_count_check: data?.length };
  } catch (e) {
    report.tests.supabase_connection = { status: "FAIL", error: e.message };
  }

  // ── Test 2: Check messages table columns ─────────────────────────────────
  try {
    const { data, error } = await supabase.from("messages").select("*").limit(1);
    if (error) {
      report.tests.messages_schema = { status: "FAIL", error: error.message };
    } else {
      const cols = data?.length > 0 ? Object.keys(data[0]) : [];
      const required = ["to_number", "body", "status", "direction", "campaign_id", "wa_message_id", "error_detail", "contact_name"];
      const missing = required.filter(c => !cols.includes(c));
      report.tests.messages_schema = {
        status: missing.length === 0 ? "OK" : "MISSING_COLUMNS",
        columns_found: cols,
        columns_missing: missing,
      };
    }
  } catch (e) {
    report.tests.messages_schema = { status: "FAIL", error: e.message };
  }

  // ── Test 3: Try inserting a test message row ──────────────────────────────
  const testRow = {
    to_number:    "919999999999",
    body:         "__debug_test__",
    status:       "failed",
    direction:    "outbound",
    source:       "portal",
    campaign_id:  "debug-test",
    contact_name: "Debug Test",
    wa_message_id: null,
    error_detail: "debug test row",
  };
  try {
    const { error } = await supabase.from("messages").insert([testRow]);
    if (error) {
      // Try bare minimum
      const { error: e2 } = await supabase.from("messages").insert([{
        to_number: "919999999999",
        body: "__debug_test__",
        status: "failed",
        direction: "outbound",
      }]);
      report.tests.insert_test = e2
        ? { status: "FAIL_ALL", full_error: error.message, bare_error: e2.message }
        : { status: "PARTIAL_OK", full_error: error.message, note: "Bare minimum insert works — some columns missing or have constraints" };
    } else {
      report.tests.insert_test = { status: "OK", note: "Full row insert works" };
      // Clean up
      await supabase.from("messages").delete().eq("body", "__debug_test__");
    }
  } catch (e) {
    report.tests.insert_test = { status: "EXCEPTION", error: e.message };
  }

  // ── Test 4: Meta credentials check ───────────────────────────────────────
  const token   = req.headers["x-wa-token"]   || process.env.WHATSAPP_TOKEN;
  const phoneId = req.headers["x-wa-phone-id"] || process.env.PHONE_NUMBER_ID;
  const wabaId  = req.headers["x-wa-waba-id"]  || process.env.WABA_ID;

  report.tests.credentials = {
    token_present:    !!token,
    token_prefix:     token ? token.slice(0, 8) + "…" : null,
    phone_id_present: !!phoneId,
    phone_id_value:   phoneId || null,
    waba_id_present:  !!wabaId,
    waba_id_value:    wabaId || null,
  };

  // ── Test 5: Call Meta to validate phone_id ────────────────────────────────
  if (token && phoneId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating,status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      report.tests.meta_phone_id = r.ok
        ? { status: "OK", phone: d.display_phone_number, name: d.verified_name, quality: d.quality_rating, wa_status: d.status }
        : { status: "FAIL", error: d.error?.message, code: d.error?.code };
    } catch (e) {
      report.tests.meta_phone_id = { status: "EXCEPTION", error: e.message };
    }
  } else {
    report.tests.meta_phone_id = { status: "SKIP", reason: "No token or phoneId" };
  }

  // ── Test 6: Fetch templates from Meta ────────────────────────────────────
  if (token && wabaId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=20&fields=name,language,status,components`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (r.ok) {
        const approved = (d.data || []).filter(t => t.status === "APPROVED");
        report.tests.meta_templates = {
          status: "OK",
          total: d.data?.length,
          approved: approved.length,
          // Show each approved template name + language so you can verify
          approved_list: approved.map(t => ({
            name: t.name,
            language: t.language,
            category: t.category,
            has_variables: (t.components||[]).some(c => c.type==="BODY" && (c.text||"").includes("{{")),
          })),
        };
      } else {
        report.tests.meta_templates = { status: "FAIL", error: d.error?.message, code: d.error?.code };
      }
    } catch (e) {
      report.tests.meta_templates = { status: "EXCEPTION", error: e.message };
    }
  } else {
    report.tests.meta_templates = { status: "SKIP", reason: "No token or wabaId" };
  }

  // ── Test 7: If POST with template_name, do a real send test ──────────────
  if (req.method === "POST" && req.body?.template_name && req.body?.to && token && phoneId) {
    const { template_name, language_code, to } = req.body;
    const toNorm = String(to).replace(/\D/g, "");
    const payload = {
      messaging_product: "whatsapp",
      to: toNorm,
      type: "template",
      template: { name: template_name, language: { code: language_code || "en_US" } },
    };
    try {
      const r = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      report.tests.template_send_test = {
        template: template_name,
        language_sent: language_code || "en_US",
        payload_sent: payload,
        http_status: r.status,
        meta_response: d,
        result: r.ok ? "SUCCESS" : "FAILED",
        meta_error: d.error || null,
      };
    } catch (e) {
      report.tests.template_send_test = { status: "EXCEPTION", error: e.message };
    }
  }

  return res.status(200).json(report);
};
