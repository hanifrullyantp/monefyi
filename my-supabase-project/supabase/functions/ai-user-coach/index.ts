// Supabase Edge Function: ai-user-coach
// - User-facing AI financial coach (chat)
// - Validates user via JWT (Authorization: Bearer <access_token>)
// - Aggregates user financial data from Postgres (transactions, budgets)
// - Sends summary + user question to LLM (Gemini)
// - Returns: { reply: string, meta?: object }
//
// IMPORTANT:
// - Do NOT put LLM key in frontend.
// - Configure secrets in Supabase Function Settings:
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//   - GEMINI_API_KEY (global key owned by you) OR set USE_USER_GEMINI_KEY=true to use profiles.gemini_key
//   - USE_USER_GEMINI_KEY (optional: 'true'|'false')
//   - APP_TZ (optional: 'Asia/Jakarta')
//
// Quota stub:
// - checkQuota(user_id) is currently a placeholder.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const jsonHeaders = { "Content-Type": "application/json" };

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

function endOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
}

function sumByType(rows: any[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amt = Number(r.amount || 0);
    if (r.type === "income") income += amt;
    if (r.type === "expense") expense += amt;
  }
  return { income, expense, net: income - expense };
}

function groupExpenseByCategory(rows: any[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    const cat = String(r.category || "Lainnya");
    map.set(cat, (map.get(cat) || 0) + Number(r.amount || 0));
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function getTodayWIB() {
  const nowUtc = new Date();
  const wib = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 0, 0, 0))
    .toISOString()
    .slice(0, 10);
}

function defaultLimitByPlan(planType: string) {
  if (planType === "lifetime") return 50;
  if (planType === "monthly") return 20;
  return 0;
}

async function getQuotaState(adminClient: any, userId: string) {
  const usageDate = getTodayWIB();

  const { data: planRow } = await adminClient
    .from("user_plans")
    .select("plan_type, ai_daily_limit")
    .eq("user_id", userId)
    .maybeSingle();

  const planType = String(planRow?.plan_type || "none");
  const limit =
    typeof planRow?.ai_daily_limit === "number"
      ? Number(planRow.ai_daily_limit)
      : defaultLimitByPlan(planType);

  const { data: usageRow } = await adminClient
    .from("ai_usage")
    .select("requests_count")
    .eq("user_id", userId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  const used = Number(usageRow?.requests_count || 0);
  const remaining = Math.max(0, limit - used);
  return { usageDate, planType, limit, used, remaining, canUse: remaining > 0 };
}

async function incrementQuota(adminClient: any, userId: string, usageDate: string, nextCount: number) {
  const { error } = await adminClient.from("ai_usage").upsert(
    { user_id: userId, usage_date: usageDate, requests_count: nextCount, updated_at: new Date().toISOString() },
    { onConflict: "user_id,usage_date" },
  );
  if (error) {
    console.error("incrementQuota error:", error);
  }
}

function buildSystemPrompt(summary: any, prefs: any = null) {
  const hasData = summary.kpi.income > 0 || summary.kpi.expense > 0;
  const tone = String(prefs?.tone || "friendly");
  const goal = String(prefs?.primary_goal || "keuangan stabil");
  const facts = Array.isArray(prefs?.learned_facts) ? prefs.learned_facts.join("; ") : "";

  const jsonTail = `
Setelah jawaban teks, jika memungkinkan sertakan di AKHIR baris JSON terpisah dengan format:
<<<ACTIONS>>>{"suggested_actions":[{"type":"increase_budget|reallocate|ask_deeper|view_category|set_goal","label":"string","payload":{}}],"quick_replies":["string"]}<<<END>>>
Jika tidak ada aksi, kirim quick_replies saja.`;

  if (!hasData) {
    return `Kamu adalah Monevisor, sahabat keuangan AI Monefyi. User tidak punya data transaksi di periode ini.
Tone: ${tone}. Tujuan user: ${goal}.
Tugasmu:
1. Katakan dengan jujur bahwa data kosong/kurang untuk dianalisa.
2. Berikan 3-5 poin saran praktis cara mulai mencatat (foto struk, catat manual, atau set budget).
3. Jangan basa-basi panjang. Maksimal 10 kalimat.
${jsonTail}`;
  }

  return `Kamu adalah Monevisor, sahabat keuangan AI Monefyi. Cerdas, empatik, actionable.
Tone: ${tone}. Tujuan user: ${goal}.
Fakta tentang user: ${facts || "belum ada"}.
Data Ringkasan (${summary.periodLabel}):
- Kas: Income ${summary.kpi.income}, Expense ${summary.kpi.expense}, Net ${summary.kpi.net}.
- Top Spender: ${summary.topCategories.map((x: any) => `${x.category}: ${x.amount}`).join(", ")}.
- Anomali: ${summary.topLarge.map((x: any) => `${x.merchant||x.category} (${x.amount})`).join(" | ")}.
- Budget: Target ${summary.budgetIncome}, Terencana ${summary.budgetTotal}, Sisa ${summary.budgetRemaining}.

Tugasmu:
1. Jawab pertanyaan user secara spesifik berdasarkan data.
2. Jika relevan, beri 1-3 langkah konkret.
3. Hindari basa-basi panjang. Maksimal 12 kalimat. Jujur dan tajam.
${jsonTail}`;
}

function parseCoachReply(raw: string) {
  const text = String(raw || "").trim();
  const match = text.match(/<<<ACTIONS>>>([\s\S]*?)<<<END>>>/);
  if (!match) {
    return { reply: text, suggested_actions: [], quick_replies: [] };
  }
  const reply = text.replace(match[0], "").trim();
  try {
    const meta = JSON.parse(match[1]);
    return {
      reply,
      suggested_actions: Array.isArray(meta.suggested_actions) ? meta.suggested_actions.slice(0, 5) : [],
      quick_replies: Array.isArray(meta.quick_replies) ? meta.quick_replies.slice(0, 5) : [],
    };
  } catch {
    return { reply: text, suggested_actions: [], quick_replies: [] };
  }
}

// Helper to detect month in user message
function detectRequestedMonth(message: string): string | null {
  const m = message.toLowerCase();
  const months: Record<string, string> = {
    "januari": "01", "februari": "02", "maret": "03", "april": "04", "mei": "05", "juni": "06",
    "juli": "07", "agustus": "08", "september": "09", "oktober": "10", "november": "11", "desember": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "jun": "06", "jul": "07", "agu": "08", "sep": "09", "okt": "10", "nov": "11", "des": "12"
  };
  for (const [name, val] of Object.entries(months)) {
    if (m.includes(name)) return val;
  }
  return null;
}

async function callGemini({ apiKey, systemPrompt, userPrompt }: { apiKey: string; systemPrompt: string; userPrompt: string; }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 2048,
          topP: 0.8,
          topK: 40
        },
      }),
    },
  );

  const txt = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${txt.slice(0, 400)}`);
  const obj = JSON.parse(txt);
  const out = obj?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return String(out).trim();
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, ...jsonHeaders } });

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }), { status: 500, headers: { ...corsHeaders, ...jsonHeaders } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, ...jsonHeaders } });

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, ...jsonHeaders } });
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const question = String(body?.message || "").trim();
    if (!question) return new Response(JSON.stringify({ error: "message is required" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
    const threadId = String(body?.thread_id || body?.threadId || "default");
    const clientContext = body?.context || {};

    // Load prefs + recent history (best-effort; tables may not exist yet)
    let prefs: any = null;
    let conversationHistory: { role: string; content: string }[] = [];
    try {
      const { data: prefRow } = await supa
        .from("monevisor_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      prefs = prefRow;
    } catch (_) { /* optional */ }
    try {
      const { data: history } = await supa
        .from("monevisor_messages")
        .select("role, content, metadata")
        .eq("user_id", user.id)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false })
        .limit(10);
      conversationHistory = (history || []).reverse().map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      }));
    } catch (_) { /* optional */ }

    const q = await getQuotaState(supaAdmin, user.id);
    if (!q.canUse) {
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: "DAILY_QUOTA_EXCEEDED",
          reply: "Kuota AI hari ini sudah habis. Coba lagi besok ya.",
          quota: { limit: q.limit, usedToday: q.used, remaining: q.remaining, planType: q.planType },
        }),
        { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    // Determine period: allow optional start/end from client (ISO date)
    // SMART FEATURE: Detect if user is asking about a specific month
    const reqMonth = detectRequestedMonth(question);
    const now = new Date();
    let startISO = String(body?.start || toISODate(startOfMonth(now)));
    let endISO = String(body?.end || toISODate(endOfMonth(now)));

    if (reqMonth) {
      const year = now.getFullYear();
      const d = new Date(`${year}-${reqMonth}-01`);
      startISO = toISODate(startOfMonth(d));
      endISO = toISODate(endOfMonth(d));
    }

    // Fetch transactions in range (limit raw): for summary only
    const { data: txRows, error: txErr } = await supa
      .from("transactions")
      .select("date,type,amount,category,merchant,notes")
      .gte("date", startISO)
      .lte("date", endISO)
      .order("date", { ascending: false })
      .limit(250);

    if (txErr) throw txErr;
    const rows = txRows || [];

    const kpi = sumByType(rows);
    const cats = groupExpenseByCategory(rows);

    const topCategories = cats.slice(0, 5).map((c) => ({
      category: c.category,
      amount: Math.round(c.amount),
    }));

    const topLarge = rows
      .filter((r) => r.type === "expense")
      .slice()
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5)
      .map((r) => ({ date: r.date, category: r.category, amount: Math.round(Number(r.amount || 0)), merchant: r.merchant }));

    const lastTx = rows.slice(0, 5).map((r) => ({ date: r.date, type: r.type, category: r.category, amount: Math.round(Number(r.amount || 0)) }));

    // Budget month based on end date month
    const budgetMonth = String(body?.budgetMonth || endISO.slice(0, 7));
    const { data: bRow } = await supa
      .from("budgets")
      .select("income,categories")
      .eq("month", budgetMonth)
      .maybeSingle();

    const budgetIncome = Math.round(Number(bRow?.income || 0));
    const budgetCategories = (bRow?.categories && typeof bRow.categories === "object") ? bRow.categories : {};
    const budgetTotal = Object.values(budgetCategories).reduce((a: number, v: any) => {
      if (v && typeof v === 'object' && v.amount) return a + Math.round(Number(v.amount));
      return a + Math.round(Number(v || 0));
    }, 0);

    // Actual expense in that month
    const monthStart = `${budgetMonth}-01`;
    const monthEnd = toISODate(endOfMonth(new Date(`${budgetMonth}-01`)));
    
    // --- SMART FALLBACK LOGIC ---
    let finalRows = rows;
    let finalKpi = kpi;
    let usedFallback = false;

    if (rows.length === 0) {
      // Try fallback to previous 30 days if current period is empty
      const fallbackStart = toISODate(new Date(now.getTime() - (30 * 24 * 3600 * 1000)));
      const { data: fallbackRows } = await supa
        .from("transactions")
        .select("date,type,amount,category,merchant,notes")
        .gte("date", fallbackStart)
        .lte("date", endISO)
        .order("date", { ascending: false })
        .limit(100);
      
      if (fallbackRows && fallbackRows.length > 0) {
        finalRows = fallbackRows;
        finalKpi = sumByType(fallbackRows);
        usedFallback = true;
      }
    }

    const summary = {
      periodLabel: usedFallback ? `30 hari terakhir (fallback)` : `${startISO}–${endISO}`,
      kpi: { income: Math.round(finalKpi.income), expense: Math.round(finalKpi.expense), net: Math.round(finalKpi.net) },
      topCategories: groupExpenseByCategory(finalRows).slice(0, 5).map(c => ({ category: c.category, amount: Math.round(c.amount) })),
      topLarge: finalRows.filter(r => r.type === "expense").sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5).map(r => ({ category: r.category, amount: Math.round(r.amount), merchant: r.merchant })),
      lastTx: finalRows.slice(0, 5).map(r => ({ type: r.type, category: r.category, amount: Math.round(r.amount) })),
      budgetMonth,
      budgetIncome,
      budgetTotal,
      budgetRemaining: budgetIncome > 0 ? (budgetIncome - budgetTotal) : 0,
    };

    const useUserKey = pickEnv("USE_USER_GEMINI_KEY", "false").toLowerCase() === "true";
    let apiKey = "";
    if (useUserKey) {
      const { data: prof } = await supa.from("profiles").select("gemini_key").eq("id", user.id).maybeSingle();
      apiKey = String(prof?.gemini_key || "").trim();
    } else {
      apiKey = pickEnv("GEMINI_API_KEY", "");
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ reply: "AI belum aktif. Admin belum mengatur API Key AI di server." }), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
    }

    const systemPrompt = buildSystemPrompt({
      ...summary,
      kpi: {
        income: `Rp ${new Intl.NumberFormat("id-ID").format(summary.kpi.income)}`,
        expense: `Rp ${new Intl.NumberFormat("id-ID").format(summary.kpi.expense)}`,
        net: `Rp ${new Intl.NumberFormat("id-ID").format(summary.kpi.net)}`,
      },
      topCategories: summary.topCategories.map((x: any) => ({ ...x, amount: `Rp ${new Intl.NumberFormat("id-ID").format(x.amount)}` })),
      topLarge: summary.topLarge.map((x: any) => ({ ...x, amount: `Rp ${new Intl.NumberFormat("id-ID").format(x.amount)}` })),
      lastTx: summary.lastTx.map((x: any) => ({ ...x, amount: `Rp ${new Intl.NumberFormat("id-ID").format(x.amount)}` })),
      budgetIncome: `Rp ${new Intl.NumberFormat("id-ID").format(summary.budgetIncome)}`,
      budgetTotal: `Rp ${new Intl.NumberFormat("id-ID").format(summary.budgetTotal)}`,
      budgetRemaining: `Rp ${new Intl.NumberFormat("id-ID").format(summary.budgetRemaining)}`,
    }, prefs);

    const historyBlock = conversationHistory.length
      ? `\n\nRiwayat chat (terbaru):\n${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}`
      : "";
    const contextBlock = clientContext && Object.keys(clientContext).length
      ? `\n\nKonteks klien: ${JSON.stringify(clientContext).slice(0, 800)}`
      : "";
    const userPrompt = `${question}${historyBlock}${contextBlock}`;

    let rawReply = "";
    try {
      rawReply = await callGemini({ apiKey, systemPrompt, userPrompt });
    } catch (err) {
      const msg = String(err.message || err).toLowerCase();
      if (msg.includes("429") || msg.includes("quota")) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error_code: "GEMINI_QUOTA_EXCEEDED", 
          reply: "Kuota AI (Gemini) sedang penuh. Coba lagi dalam beberapa menit atau hubungi admin untuk upgrade key." 
        }), { status: 200, headers: { ...corsHeaders, ...jsonHeaders } });
      }
      throw err;
    }

    const parsed = parseCoachReply(rawReply);
    const reply = parsed.reply || rawReply;
    const suggested_actions = parsed.suggested_actions;
    const quick_replies = parsed.quick_replies.length
      ? parsed.quick_replies
      : ["Jelaskan lebih detail", "Apa langkah berikutnya?", "Tidak sekarang"];

    // Persist messages (best-effort)
    try {
      await supa.from("monevisor_messages").insert([
        {
          user_id: user.id,
          thread_id: threadId,
          role: "user",
          content: question,
          metadata: { context: clientContext },
        },
        {
          user_id: user.id,
          thread_id: threadId,
          role: "assistant",
          content: reply,
          metadata: { suggested_actions, quick_replies },
          model: "gemini-1.5-flash",
        },
      ]);
    } catch (persistErr) {
      console.warn("monevisor_messages persist skipped:", persistErr);
    }

    // Count only successful AI responses.
    await incrementQuota(supaAdmin, user.id, q.usageDate, q.used + 1);

    return new Response(JSON.stringify({ 
      ok: true, 
      reply,
      suggested_actions,
      quick_replies,
      thread_id: threadId,
      meta: { period: { start: startISO, end: endISO }, budgetMonth },
      quota: { limit: q.limit, usedToday: q.used + 1, remaining: Math.max(0, q.limit - (q.used + 1)), planType: q.planType },
    }), {
      status: 200,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  } catch (e) {
    console.error("Coach Error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { 
      status: 500, 
      headers: { ...corsHeaders, ...jsonHeaders } 
    });
  }
});
