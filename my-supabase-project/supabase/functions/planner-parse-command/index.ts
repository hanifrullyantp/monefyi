import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  resolveGeminiForUser,
  recordGeminiUsage,
  callGeminiGenerate,
} from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_CORS_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return json({ error: "No auth" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(url, service, { auth: { persistSession: false } });
    const { input, context } = await req.json();
    if (!input) return json({ error: "No input" }, 400);

    const gemini = await resolveGeminiForUser(sb, authData.user.id);

    if (!gemini.apiKey) {
      if (gemini.source === "none" && gemini.platformFallbackUsed >= gemini.platformFallbackLimit) {
        return json({
          intent: "unknown",
          params: {},
          confidence: 0,
          message: "Kuota AI platform hari ini habis. Tambahkan Gemini API key di Pengaturan → Akun.",
          quota: {
            platform_fallback_used: gemini.platformFallbackUsed,
            platform_fallback_limit: gemini.platformFallbackLimit,
          },
        });
      }
      return json({
        intent: "unknown",
        params: {},
        confidence: 0,
        message: "AI belum dikonfigurasi. Set Gemini API key di Pengaturan → Akun atau hubungi admin.",
      });
    }

    const systemPrompt = `Kamu adalah parser perintah untuk aplikasi manajemen proyek konstruksi "Monefyi Planner".
Bahasa utama pengguna: Bahasa Indonesia informal.

Konteks saat ini:
- Proyek aktif: ${JSON.stringify(context?.projects || [])}
- Item pekerjaan aktif: ${JSON.stringify(context?.work_items || [])}
- Proyek yang sedang dibuka: ${context?.current_project || "tidak ada"}

Tugas: Parse input pengguna menjadi JSON dengan format:
{
  "intent": "record_cost|update_progress|check_budget|check_progress|open_project|add_worker_log|open_report|ask_recommendation|add_rap_item|add_work_item|general_query",
  "params": { ... },
  "confidence": 0.0-1.0,
  "explanation": "penjelasan singkat"
}

Respond ONLY with valid JSON, no markdown.`;

    const text = await callGeminiGenerate(gemini.apiKey, systemPrompt, "Input pengguna: " + input);

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { intent: "unknown", params: {}, confidence: 0 };
    } catch {
      parsed = { intent: "unknown", params: {}, confidence: 0, raw_ai_response: text };
    }

    await recordGeminiUsage(
      sb,
      authData.user.id,
      gemini.usageDate,
      gemini.source,
      {
        requests_count: gemini.userDailyUsed,
        platform_fallback_count: gemini.platformFallbackUsed,
      },
    );

    return json({
      ...parsed,
      _meta: {
        gemini_source: gemini.source,
        platform_fallback_used: gemini.platformFallbackUsed + (gemini.source === "platform" ? 1 : 0),
        platform_fallback_limit: gemini.platformFallbackLimit,
      },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
