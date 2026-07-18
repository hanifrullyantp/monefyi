import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  callGeminiGenerate,
  recordGeminiUsage,
  resolveGeminiForUser,
} from "../_shared/gemini.ts";
import {
  errorResponse,
  handleCorsPreflightRequest,
  jsonResponse,
} from "../_shared/cors.ts";

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function sumByType(rows: { type?: string; amount?: number }[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    const amt = Number(r.amount || 0);
    if (r.type === "income") income += amt;
    if (r.type === "expense") expense += amt;
  }
  return { income, expense, net: income - expense };
}

function groupExpenseByCategory(rows: { type?: string; category?: string; amount?: number }[]) {
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

function greetingFor(lang: string, trend: string, savingRate: number) {
  const hour = new Date().getUTCHours() + 7; // rough WIB
  const h = ((hour % 24) + 24) % 24;
  let salam = lang === "en" ? "Hello" : "Halo";
  if (h < 11) salam = lang === "en" ? "Good morning" : "Selamat pagi";
  else if (h < 15) salam = lang === "en" ? "Good afternoon" : "Selamat siang";
  else if (h < 18) salam = lang === "en" ? "Good afternoon" : "Selamat sore";
  else salam = lang === "en" ? "Good evening" : "Selamat malam";

  if (trend === "up" && savingRate > 0.15) {
    return lang === "en"
      ? `${salam}! Good news — your finances look healthier.`
      : `${salam}! Kabar baik nih, keuangan kamu makin sehat!`;
  }
  if (trend === "down") {
    return lang === "en"
      ? `${salam}. A few things need a closer look together.`
      : `${salam}. Ada beberapa hal yang perlu kita review bareng.`;
  }
  return lang === "en"
    ? `${salam}! Let's check your money story.`
    : `${salam}! Yuk cek kondisi keuanganmu.`;
}

function buildFallbackInsights(
  txs: { type?: string; category?: string; amount?: number; merchant?: string }[],
  periodLabel: string,
  lang: string,
  budgets: any[] = [],
  previous: { income?: number; expense?: number; savings?: number; saving_rate?: number } = {},
) {
  const s = sumByType(txs);
  const cats = groupExpenseByCategory(txs);
  const savingRate = s.income > 0 ? (s.income - s.expense) / s.income : 0;
  let healthScore = 50;
  if (s.income > 0) {
    healthScore = Math.round(Math.max(0, Math.min(100, 40 + savingRate * 60 - (s.expense > s.income ? 25 : 0))));
  }
  const overBudgets = (budgets || []).filter((b) => Number(b.percent_used || 0) > 100);
  healthScore = Math.max(0, Math.min(100, healthScore - overBudgets.length * 5));

  const prevRate = Number(previous?.saving_rate || 0);
  let healthTrend: "up" | "down" | "stable" = "stable";
  if (savingRate > prevRate + 0.05) healthTrend = "up";
  else if (savingRate < prevRate - 0.05) healthTrend = "down";

  const healthLabel = healthScore >= 75 ? "good" : healthScore >= 50 ? "fair" : "poor";
  const summary =
    lang === "en"
      ? `Period ${periodLabel}: income ${s.income}, expense ${s.expense}, net ${s.net}.`
      : `Periode ${periodLabel}: pemasukan ${s.income}, pengeluaran ${s.expense}, net ${s.net}.`;

  const storyParts: string[] = [];
  if (savingRate > 0.15) {
    storyParts.push(lang === "en" ? "Your finances look healthy this period" : "Kamu punya keuangan yang sehat bulan ini");
  } else if (savingRate > 0) {
    storyParts.push(lang === "en" ? "You managed to save, with room to optimize" : "Kamu berhasil menabung, meski masih bisa dioptimalkan");
  } else {
    storyParts.push(lang === "en" ? "Spending exceeds income this period" : "Pengeluaran kamu lebih besar dari income bulan ini");
  }
  if (overBudgets.length) {
    storyParts.push(
      lang === "en"
        ? `${overBudgets.length} categories are over budget`
        : `ada ${overBudgets.length} kategori yang over budget`,
    );
  }
  if (healthTrend === "up") storyParts.push(lang === "en" ? "and you're improving vs last month" : "dan kondisimu membaik dari bulan lalu");
  else if (healthTrend === "down") storyParts.push(lang === "en" ? "but there's a dip vs last month" : "tapi ada penurunan dari bulan lalu");

  const insights: any[] = [];
  if (savingRate > 0.2) {
    insights.push({
      id: "high-savings",
      type: "achievement",
      icon: "trophy",
      title: lang === "en" ? "Strong savings" : "Tabungan Kamu Excellent!",
      body: lang === "en"
        ? `You saved ${Math.round(savingRate * 100)}% of income. Keep it up!`
        : `Kamu berhasil hemat ${Math.round(savingRate * 100)}% dari income. Terus pertahankan!`,
      severity: "low",
    });
  }
  for (const b of overBudgets.slice(0, 3)) {
    const suggested = Math.ceil((Number(b.spent || 0) * 1.1) / 10000) * 10000;
    insights.push({
      id: `over-${b.id || b.category}`,
      type: "warning",
      icon: "alert",
      title: `${b.category} Over Budget`,
      body: lang === "en"
        ? `Already at ${b.percent_used}% of plan.`
        : `Sudah terpakai ${b.percent_used}% dari plan.`,
      severity: "high",
      action: {
        type: "increase_budget",
        label: lang === "en" ? "Raise budget" : `Naikkan ke Rp ${suggested.toLocaleString("id-ID")}`,
        payload: { budget_id: b.id, category: b.category, new_amount: suggested },
      },
    });
  }
  if (cats[0] && s.expense > 0) {
    insights.push({
      id: "top-category",
      type: "pattern",
      icon: "trending_up",
      title: lang === "en" ? `Top spend: ${cats[0].category}` : `Pengeluaran Terbesar: ${cats[0].category}`,
      body: lang === "en"
        ? `${cats[0].amount} (${Math.round((cats[0].amount / s.expense) * 100)}% of expenses).`
        : `Rp ${cats[0].amount.toLocaleString("id-ID")} atau ${Math.round((cats[0].amount / s.expense) * 100)}% dari total.`,
      severity: "low",
      action: {
        type: "view_category",
        label: lang === "en" ? "Review" : "Review Detail",
        payload: { category: cats[0].category },
      },
    });
  }

  const tips =
    lang === "en"
      ? ["Review top spending categories.", "Set a weekly spending limit.", "Track all income sources."]
      : ["Review kategori pengeluaran terbesar.", "Pasang limit mingguan.", "Catat semua sumber pemasukan."];

  const bullets = cats.slice(0, 5).map((c) =>
    lang === "en"
      ? `${c.category}: ${c.amount} (${s.expense ? Math.round((c.amount / s.expense) * 100) : 0}% of expenses)`
      : `${c.category}: ${c.amount} (${s.expense ? Math.round((c.amount / s.expense) * 100) : 0}% pengeluaran)`
  );

  const budgetRecommendations = (budgets.length ? budgets : cats.slice(0, 5).map((c) => ({
    id: c.category,
    category: c.category,
    priority: "penting",
    amount: Math.round(c.amount * 0.9),
    spent: c.amount,
    percent_used: 100,
  }))).filter((b: any) => Number(b.percent_used || 0) > 100 || Number(b.percent_used || 0) < 30)
    .slice(0, 5)
    .map((b: any) => {
      const current = Number(b.amount || 0);
      const spent = Number(b.spent || 0);
      const suggested = Number(b.percent_used || 0) > 100
        ? Math.ceil((spent * 1.1) / 10000) * 10000
        : Math.ceil((Math.max(spent, current * 0.7) * 1.05) / 10000) * 10000;
      return {
        category: b.category,
        priority: b.priority || "penting",
        current,
        suggested,
        planned: suggested,
        reason: Number(b.percent_used || 0) > 100
          ? (lang === "en" ? "Over budget — consider raising" : "Over budget, disarankan naikkan")
          : (lang === "en" ? "Under-utilized — can lower" : "Under-utilized, bisa diturunkan"),
        impact: Number(b.percent_used || 0) > 100
          ? (lang === "en" ? "Avoid further overrun" : "Hindari over lagi")
          : (lang === "en" ? `Free up ${Math.max(0, current - suggested)}` : `Hemat Rp ${Math.max(0, current - suggested).toLocaleString("id-ID")}`),
        action: {
          type: Number(b.percent_used || 0) > 100 ? "increase_budget" : "decrease_budget",
          payload: { budget_id: b.id, category: b.category, new_amount: suggested },
        },
      };
    });

  const suggested_questions = [
    overBudgets[0]
      ? (lang === "en" ? `Why is ${overBudgets[0].category} over budget?` : `Kenapa ${overBudgets[0].category} bisa over budget?`)
      : null,
    lang === "en" ? "Which category spends the most?" : "Kategori mana yang paling boros?",
    lang === "en" ? "How can I save more?" : "Gimana caranya nabung lebih banyak?",
  ].filter(Boolean);

  return {
    // Legacy fields (backward compatible)
    summary,
    healthScore,
    healthLabel,
    bullets,
    budgetRecommendations,
    alerts: s.expense > s.income
      ? [lang === "en" ? "Expenses exceed income this period." : "Pengeluaran melebihi pemasukan periode ini."]
      : [],
    tips,
    metrics: { income: s.income, expense: s.expense, net: s.net, saving_rate: savingRate },
    source: "heuristic_fallback",
    // Enhanced fields
    greeting: greetingFor(lang, healthTrend, savingRate),
    story: storyParts.join(", ") + ".",
    healthTrend,
    healthMessage: healthScore >= 75
      ? (lang === "en" ? "Looking solid — keep the habit." : "Kondisi baik, terus dijaga.")
      : (lang === "en" ? "Room to improve with a few focused moves." : "Masih bisa lebih baik dengan beberapa langkah fokus."),
    insights,
    suggested_questions,
    disclaimer: lang === "en"
      ? "Educational insights only — not licensed financial advice."
      : "Informasi edukatif — bukan nasihat keuangan berlisensi.",
  };
}

function normalizeEnhanced(parsed: any, fallback: any) {
  const insights = Array.isArray(parsed.insights) && parsed.insights.length
    ? parsed.insights.slice(0, 8)
    : fallback.insights;
  const bullets = Array.isArray(parsed.bullets) && parsed.bullets.length
    ? parsed.bullets.slice(0, 8)
    : (insights.map((i: any) => i.title + ": " + i.body).slice(0, 8) || fallback.bullets);

  return {
    summary: String(parsed.summary || parsed.story || fallback.summary),
    greeting: String(parsed.greeting || fallback.greeting),
    story: String(parsed.story || parsed.summary || fallback.story),
    healthScore: Math.max(0, Math.min(100, Number(parsed.healthScore ?? fallback.healthScore ?? 50))),
    healthLabel: String(parsed.healthLabel || fallback.healthLabel || "fair"),
    healthTrend: String(parsed.healthTrend || fallback.healthTrend || "stable"),
    healthMessage: String(parsed.healthMessage || fallback.healthMessage || ""),
    bullets,
    insights,
    budgetRecommendations: Array.isArray(parsed.budgetRecommendations)
      ? parsed.budgetRecommendations.slice(0, 10)
      : fallback.budgetRecommendations,
    alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 5) : fallback.alerts,
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : fallback.tips,
    suggested_questions: Array.isArray(parsed.suggested_questions)
      ? parsed.suggested_questions.slice(0, 6)
      : fallback.suggested_questions,
    metrics: parsed.metrics || fallback.metrics,
    source: parsed.source || "gemini",
    disclaimer: String(parsed.disclaimer || fallback.disclaimer),
  };
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
    const SERVICE_KEY = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") || "";
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !authHeader) {
      return errorResponse(req, "Unauthorized", 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return errorResponse(req, "Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const start = String(body?.start || body?.startISO || body?.periodStart || "").slice(0, 10);
    const end = String(body?.end || body?.endISO || body?.periodEnd || "").slice(0, 10);
    const lang = String(body?.lang || "id") === "en" ? "en" : "id";
    const periodLabel = String(body?.periodLabel || `${start} – ${end}`);
    const budgets = Array.isArray(body?.budgets) ? body.budgets : [];
    const previous_month_summary = body?.previous_month_summary || {};
    const user_prefs = body?.user_prefs || {};
    const incomeCtx = body?.income || null;

    const { data: txs, error: txErr } = await userClient
      .from("transactions")
      .select("type,amount,category,merchant,date,notes")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: false })
      .limit(400);

    if (txErr) throw txErr;
    const rows = txs || [];

    const adminClient = SERVICE_KEY
      ? createClient(SUPABASE_URL, SERVICE_KEY)
      : userClient;

    let prefs = user_prefs;
    if (!prefs?.primary_goal) {
      try {
        const { data: prefRow } = await userClient
          .from("monevisor_prefs")
          .select("*")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (prefRow) prefs = { ...prefRow, ...user_prefs };
      } catch (_) { /* table may not exist yet */ }
    }

    const fallback = buildFallbackInsights(rows, periodLabel, lang, budgets, previous_month_summary);
    if (incomeCtx?.total != null && Number(incomeCtx.total) > 0) {
      fallback.metrics.income = Number(incomeCtx.total);
      fallback.metrics.net = fallback.metrics.income - fallback.metrics.expense;
      fallback.metrics.saving_rate = fallback.metrics.income > 0
        ? fallback.metrics.net / fallback.metrics.income
        : 0;
    }

    const gemini = await resolveGeminiForUser(adminClient, userData.user.id);
    if (!gemini.apiKey) {
      return jsonResponse(req, fallback);
    }

    const s = sumByType(rows);
    const cats = groupExpenseByCategory(rows).slice(0, 8);
    const tone = String(prefs?.tone || "friendly");
    const primaryGoal = String(prefs?.primary_goal || (lang === "en" ? "stable finances" : "keuangan stabil"));
    const learnedFacts = Array.isArray(prefs?.learned_facts) ? prefs.learned_facts : [];

    const systemPrompt = lang === "en"
      ? `You are Monevisor, a personal finance companion for Monefyi.
CHARACTER: warm, empathetic, action-first. Tone: ${tone}.
USER GOAL: ${primaryGoal}
KNOWN FACTS: ${learnedFacts.join("; ") || "none"}
Respond ONLY with valid JSON (no markdown). Schema:
{"greeting":"string","story":"string","summary":"string","healthScore":0-100,"healthLabel":"excellent|good|fair|poor","healthTrend":"up|down|stable","healthMessage":"string","bullets":["string"],"insights":[{"id":"string","type":"achievement|warning|tip|pattern|milestone","icon":"string","title":"string","body":"string","severity":"low|medium|high","action":{"type":"reallocate|increase_budget|decrease_budget|create_budget|ask_deeper|view_category|set_goal","label":"string","payload":{}}}],"budgetRecommendations":[{"category":"string","priority":"string","current":number,"suggested":number,"planned":number,"reason":"string","impact":"string","action":{"type":"string","payload":{}}}],"alerts":["string"],"tips":["string"],"suggested_questions":["string"],"disclaimer":"string"}
No specific investment product recommendations. Use only provided data.`
      : `Kamu adalah Monevisor, sahabat keuangan pribadi user Monefyi di Indonesia.
KARAKTER: ramah, empatik, action-first. Tone: ${tone}.
TUJUAN USER: ${primaryGoal}
FAKTA: ${learnedFacts.join("; ") || "tidak ada"}
Balas HANYA JSON valid (tanpa markdown). Schema:
{"greeting":"string","story":"string","summary":"string","healthScore":0-100,"healthLabel":"excellent|good|fair|poor","healthTrend":"up|down|stable","healthMessage":"string","bullets":["string"],"insights":[{"id":"string","type":"achievement|warning|tip|pattern|milestone","icon":"string","title":"string","body":"string","severity":"low|medium|high","action":{"type":"reallocate|increase_budget|decrease_budget|create_budget|ask_deeper|view_category|set_goal","label":"string","payload":{}}}],"budgetRecommendations":[{"category":"string","priority":"string","current":number,"suggested":number,"planned":number,"reason":"string","impact":"string","action":{"type":"string","payload":{}}}],"alerts":["string"],"tips":["string"],"suggested_questions":["string"],"disclaimer":"string"}
Jangan rekomendasi produk investasi spesifik. Hanya berdasarkan data yang dikirim.`;

    const userPrompt = JSON.stringify({
      period: periodLabel,
      totals: s,
      topCategories: cats,
      budgets: budgets.slice(0, 40),
      previous_month_summary,
      income: incomeCtx,
      transactionCount: rows.length,
      lang,
    });

    let parsed: any;
    try {
      const raw = await callGeminiGenerate(gemini.apiKey, systemPrompt, userPrompt, "gemini-2.0-flash");
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
      if (SERVICE_KEY) {
        await recordGeminiUsage(adminClient, userData.user.id, gemini.usageDate, gemini.source, {
          requests_count: gemini.userDailyUsed,
          platform_fallback_count: gemini.platformFallbackUsed,
        });
      }
    } catch (e) {
      console.warn("Gemini insights failed:", e);
      return jsonResponse(req, fallback);
    }

    const out = normalizeEnhanced(parsed, fallback);
    out.metrics = {
      ...s,
      ...(out.metrics || {}),
      saving_rate: s.income > 0 ? (s.income - s.expense) / s.income : null,
    };
    if (incomeCtx?.total != null && Number(incomeCtx.total) > 0) {
      out.metrics.income = Number(incomeCtx.total);
      out.metrics.net = out.metrics.income - Number(out.metrics.expense || s.expense);
      out.metrics.saving_rate = out.metrics.income > 0 ? out.metrics.net / out.metrics.income : null;
    }
    out.source = "gemini";

    return jsonResponse(req, out);
  } catch (e) {
    console.error("monefyi-generate-insights:", e);
    return errorResponse(req, String((e as Error)?.message || e));
  }
});
