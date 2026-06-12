import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  resolveGeminiForUser,
  recordGeminiUsage,
} from "../_shared/gemini.ts";
import {
  buildProviders,
  parseWithAI,
  type AIUsageLog,
} from "../_shared/ai-providers.ts";

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

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Kamu adalah parser perintah untuk aplikasi manajemen proyek konstruksi "Monefyi Planner".
Bahasa utama pengguna: Bahasa Indonesia informal.

INTENT yang valid:
record_cost | record_cost_batch | update_progress | check_budget | check_progress | open_project | add_worker_log | open_report | ask_recommendation | add_rap_item | add_work_item | general_query

OUTPUT: JSON murni tanpa markdown.
{
  "intent": "<intent>",
  "params": { ... },
  "confidence": 0.0-1.0,
  "explanation": "penjelasan singkat"
}

Normalisasi angka:
- "rb" / "ribu" → ×1000
- "jt" / "juta" → ×1000000
- "kemarin" → tanggal kemarin

Format WhatsApp batch (duit keluar):
Jum'at, 5/6/2026
Duit keluar :
- 63.500 belanja ferum ... (indra)
- 850.000 gaji Gustam : 510K kerjaan rangka cc, 340K kerjaan aloevera (Indra)
→ intent record_cost_batch, params.items[] = [{ date:"2026-06-05", total:63500, item:"...", supplier:"indra" }, ...]
Pecah baris dengan beberapa "NK" setelah ":" menjadi beberapa item.`;

function buildUserPrompt(
  input: string,
  context: {
    projects?: Array<{ id: string; name: string; status?: string }>;
    work_items?: Array<{ id: string; name: string; progress?: number }>;
    current_project?: string | null;
    rap_items?: Array<{ name: string }>;
    recent_commands?: string[];
    learned_examples?: Array<{ input: string; intent: string; params: unknown }>;
  } | null,
): string {
  const ctx = context ?? {};
  const projects = (ctx.projects ?? []).slice(0, 5).map(p => p.name).join(", ") || "N/A";
  const items = (ctx.work_items ?? []).slice(0, 5).map(i => i.name).join(", ") || "N/A";
  const rap = (ctx.rap_items ?? []).slice(0, 5).map(i => i.name).join(", ") || "N/A";
  const recent = ctx.recent_commands?.[0] ?? "N/A";

  // Org-specific learned corrections (few-shot) — improves accuracy for local terms.
  const examples = (ctx.learned_examples ?? []).slice(0, 8);
  const examplesBlock = examples.length
    ? "\n\nContoh koreksi tim (pelajari pola ini):\n" +
      examples
        .map(e => `- "${e.input}" => {"intent":"${e.intent}","params":${JSON.stringify(e.params)}}`)
        .join("\n")
    : "";

  return `Input: "${input}"

Context:
- Proyek aktif: ${projects}
- Item pekerjaan: ${items}
- Proyek dibuka: ${ctx.current_project ?? "tidak ada"}
- RAP: ${rap}
- Perintah terakhir: ${recent}${examplesBlock}

Parse ke JSON.`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "No auth" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { input, context } = await req.json() as {
      input: string;
      context: Record<string, unknown> | null;
    };
    if (!input) return json({ error: "No input" }, 400);

    // Resolve Gemini key (user-owned key takes priority; falls back to platform quota).
    const gemini = await resolveGeminiForUser(sb, authData.user.id);

    // Build ordered provider list — only include providers with available keys.
    const providers = buildProviders({ geminiKey: gemini.apiKey });

    // Nothing available at all.
    if (providers.length === 0) {
      const quotaExhausted =
        gemini.source === "none" &&
        gemini.platformFallbackUsed >= gemini.platformFallbackLimit;

      return json({
        intent: "record_cost",
        params: {},
        confidence: 0.35,
        explanation: quotaExhausted
          ? "Kuota AI platform hari ini habis. Isi form manual di bawah atau tambahkan Gemini API key di Pengaturan → Akun."
          : "AI belum dikonfigurasi. Isi form manual di bawah atau set Gemini API key di Pengaturan → Akun.",
        message: quotaExhausted
          ? "Kuota AI platform hari ini habis."
          : "AI belum dikonfigurasi.",
        quota: quotaExhausted
          ? {
            platform_fallback_used: gemini.platformFallbackUsed,
            platform_fallback_limit: gemini.platformFallbackLimit,
          }
          : undefined,
      });
    }

    // Per-call logging to ai_usage_logs.
    const userId = authData.user.id;
    const logUsage = async (log: AIUsageLog) => {
      await sb.from("ai_usage_logs").insert({
        user_id: userId,
        provider: log.provider,
        model: log.model,
        success: log.success,
        response_time_ms: log.response_time_ms,
        confidence: log.confidence ?? null,
        prompt_tokens: log.prompt_tokens ?? null,
        completion_tokens: log.completion_tokens ?? null,
        cost_usd: log.cost_usd ?? null,
        error_message: log.error_message ?? null,
        created_at: new Date().toISOString(),
      });
    };

    // Run multi-provider fallback.
    let parsed;
    let errors: Array<{ provider: string; error: string; time_ms: number }> = [];

    try {
      ({ parsed, errors } = await parseWithAI({
        providers,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(input, context as Parameters<typeof buildUserPrompt>[1]),
        onLog: logUsage,
      }));
    } catch {
      // All providers exhausted — return graceful fallback.
      return json({
        intent: "record_cost",
        params: {},
        confidence: 0.35,
        explanation: "Parsing AI gagal sementara — silakan isi form manual di bawah lalu catat.",
        message: "Parsing gagal sementara. Silakan isi form manual.",
        _meta: { all_providers_failed: true },
      });
    }

    // Keep Gemini quota accounting when Gemini was the successful provider.
    if (parsed.provider_id === "gemini") {
      await recordGeminiUsage(
        sb,
        userId,
        gemini.usageDate,
        gemini.source,
        {
          requests_count: gemini.userDailyUsed,
          platform_fallback_count: gemini.platformFallbackUsed,
        },
      );
    }

    return json({
      intent: parsed.intent,
      params: parsed.params,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
      _meta: {
        provider: parsed.provider_id,
        model: parsed.model,
        fallback_errors: errors.length > 0 ? errors : undefined,
        // Gemini-specific quota fields (preserved for client compatibility).
        gemini_source: parsed.provider_id === "gemini" ? gemini.source : undefined,
        platform_fallback_used:
          gemini.platformFallbackUsed +
          (parsed.provider_id === "gemini" && gemini.source === "platform" ? 1 : 0),
        platform_fallback_limit: gemini.platformFallbackLimit,
      },
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
