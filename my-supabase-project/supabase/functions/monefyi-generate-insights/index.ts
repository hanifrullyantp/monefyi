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

function buildFallbackInsights(
  txs: { type?: string; category?: string; amount?: number; merchant?: string }[],
  periodLabel: string,
  lang: string,
) {
  const s = sumByType(txs);
  const cats = groupExpenseByCategory(txs);
  const savingRate = s.income > 0 ? (s.income - s.expense) / s.income : 0;
  let healthScore = 50;
  if (s.income > 0) {
    healthScore = Math.round(Math.max(0, Math.min(100, 40 + savingRate * 60 - (s.expense > s.income ? 25 : 0))));
  }
  const summary =
    lang === "en"
      ? `Period ${periodLabel}: income ${s.income}, expense ${s.expense}, net ${s.net}.`
      : `Periode ${periodLabel}: pemasukan ${s.income}, pengeluaran ${s.expense}, net ${s.net}.`;
  const tips =
    lang === "en"
      ? ["Review top spending categories.", "Set a weekly spending limit.", "Track all income sources."]
      : ["Review kategori pengeluaran terbesar.", "Pasang limit mingguan.", "Catat semua sumber pemasukan."];
  return {
    summary,
    healthScore,
    healthLabel: healthScore >= 75 ? "good" : healthScore >= 50 ? "fair" : "poor",
    bullets: cats.slice(0, 5).map((c) =>
      lang === "en"
        ? `${c.category}: ${c.amount} (${s.expense ? Math.round((c.amount / s.expense) * 100) : 0}% of expenses)`
        : `${c.category}: ${c.amount} (${s.expense ? Math.round((c.amount / s.expense) * 100) : 0}% pengeluaran)`
    ),
    budgetRecommendations: cats.slice(0, 5).map((c) => ({
      category: c.category,
      planned: Math.round(c.amount * 0.9),
    })),
    alerts: s.expense > s.income
      ? [lang === "en" ? "Expenses exceed income this period." : "Pengeluaran melebihi pemasukan periode ini."]
      : [],
    tips,
    metrics: { income: s.income, expense: s.expense, net: s.net, saving_rate: savingRate },
    source: "heuristic_fallback",
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
    const start = String(body?.start || body?.startISO || "").slice(0, 10);
    const end = String(body?.end || body?.endISO || "").slice(0, 10);
    const lang = String(body?.lang || "id") === "en" ? "en" : "id";
    const periodLabel = String(body?.periodLabel || `${start} – ${end}`);

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

    const gemini = await resolveGeminiForUser(adminClient, userData.user.id);
    if (!gemini.apiKey) {
      const fallback = buildFallbackInsights(rows, periodLabel, lang);
      return jsonResponse(req, fallback);
    }

    const s = sumByType(rows);
    const cats = groupExpenseByCategory(rows).slice(0, 8);
    const systemPrompt = lang === "en"
      ? `You are Monevisor, a personal finance advisor. Respond ONLY with valid JSON (no markdown). Schema:
{"summary":"string","healthScore":0-100,"healthLabel":"excellent|good|fair|poor","bullets":["string"],"budgetRecommendations":[{"category":"string","planned":number}],"alerts":["string"],"tips":["string"]}
Be concise, actionable, friendly. Use IDR amounts as numbers without formatting.`
      : `Kamu Monevisor, advisor keuangan pribadi. Balas HANYA JSON valid (tanpa markdown). Schema:
{"summary":"string","healthScore":0-100,"healthLabel":"excellent|good|fair|poor","bullets":["string"],"budgetRecommendations":[{"category":"string","planned":number}],"alerts":["string"],"tips":["string"]}
Singkat, actionable, ramah. Amount IDR sebagai angka tanpa format.`;

    const userPrompt = JSON.stringify({
      period: periodLabel,
      totals: s,
      topCategories: cats,
      transactionCount: rows.length,
      lang,
    });

    let parsed;
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
      parsed = buildFallbackInsights(rows, periodLabel, lang);
      parsed.source = "heuristic_fallback";
    }

    const out = {
      summary: String(parsed.summary || ""),
      healthScore: Math.max(0, Math.min(100, Number(parsed.healthScore || 50))),
      healthLabel: String(parsed.healthLabel || "fair"),
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [],
      budgetRecommendations: Array.isArray(parsed.budgetRecommendations) ? parsed.budgetRecommendations.slice(0, 10) : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 5) : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
      metrics: { ...s, saving_rate: s.income > 0 ? (s.income - s.expense) / s.income : null },
      source: parsed.source || "gemini",
    };

    return jsonResponse(req, out);
  } catch (e) {
    console.error("monefyi-generate-insights:", e);
    return errorResponse(req, String((e as Error)?.message || e));
  }
});
