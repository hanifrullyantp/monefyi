import { requireEngineAuth } from "@/lib/auth/adminGuard";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pollOpenRouterBatch } from "@/lib/engine/llmRouter";

function getSupabaseServerClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zzwqfmdyncxbolestkqp.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/engine/batch
 * Memeriksa status antrean batch Sonnet 5.5 (OpenRouter Batch API).
 * Jika masih berjalan: mengembalikan status 'processing' beserta waktu mulai.
 * Jika selesai: mengekstrak output Sonnet, menyimpan ke Supabase Cloud, dan mengembalikan data 'ready'.
 */
export async function GET(req: NextRequest) {
  const auth = await requireEngineAuth(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  try {
    const supabase = getSupabaseServerClient();

    // Ambil metadata batch aktif dari database cloud
    const { data: config, error: dbErr } = await supabase
      .from("winning_engine_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (dbErr) {
      return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json({ ok: true, status: "idle", hasData: false });
    }

    const batchJobId = config.batch_job_id;
    const currentStatus = config.batch_status || "idle";
    const apiKey = config.openrouter_api_key || "";

    // Jika belum pernah ada batch job atau status idle
    if (!batchJobId || currentStatus === "idle") {
      return NextResponse.json({
        ok: true,
        status: "idle",
        hasData: Boolean(config.last_pillars),
        executiveBrief: config.last_executive_brief || "",
        pillars: config.last_pillars || [],
        plans: config.last_plans || [],
      });
    }

    // Jika sudah tercatat completed di database
    if (currentStatus === "completed") {
      return NextResponse.json({
        ok: true,
        status: "ready",
        isBatch: true,
        batchId: batchJobId,
        model: config.batch_model || "anthropic/claude-sonnet-5.5:batch",
        startedAt: config.batch_started_at,
        completedAt: config.batch_completed_at,
        executiveBrief: config.last_executive_brief || "",
        pillars: config.last_pillars || [],
        plans: config.last_plans || [],
        overallScore: config.batch_diagnostics_snapshot?.overallScore || 75,
        learnings: config.batch_diagnostics_snapshot?.learnings || [],
      });
    }

    // Jika status masih dalam antrean atau sedang diproses
    if (currentStatus === "in_progress" || currentStatus === "validating") {
      if (!apiKey) {
        return NextResponse.json({
          ok: false,
          status: "failed",
          error: "API Key OpenRouter tidak ditemukan di Supabase Cloud.",
        });
      }

      // Poll ke OpenRouter Batch API
      const pollRes = await pollOpenRouterBatch(batchJobId, apiKey);

      if (pollRes.status === "completed" && pollRes.text) {
        const snapshot = config.batch_diagnostics_snapshot || {};
        const completedAt = new Date().toISOString();

        // Update database cloud menjadi completed dan simpan payload terakhir
        await supabase
          .from("winning_engine_config")
          .update({
            batch_status: "completed",
            batch_completed_at: completedAt,
            last_executive_brief: pollRes.text,
            last_pillars: snapshot.pillars || [],
            last_plans: snapshot.plans || [],
            updated_at: completedAt,
          })
          .eq("id", "default");

        return NextResponse.json({
          ok: true,
          status: "ready",
          isBatch: true,
          batchId: batchJobId,
          model: config.batch_model || "anthropic/claude-sonnet-5.5:batch",
          startedAt: config.batch_started_at,
          completedAt,
          executiveBrief: pollRes.text,
          pillars: snapshot.pillars || [],
          plans: snapshot.plans || [],
          overallScore: snapshot.overallScore || 75,
          learnings: snapshot.learnings || [],
          message: "Analisa Sonnet 5.5 Batch selesai dan siap ditinjau.",
        });
      }

      if (pollRes.status === "failed" || pollRes.status === "expired") {
        await supabase
          .from("winning_engine_config")
          .update({
            batch_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", "default");

        return NextResponse.json({
          ok: false,
          status: "failed",
          error: pollRes.error || "Batch job gagal diproses oleh penyedia AI.",
        });
      }

      // Masih dalam proses
      const startedTime = config.batch_started_at
        ? new Date(config.batch_started_at).getTime()
        : Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedTime) / 1000));

      return NextResponse.json({
        ok: true,
        status: "processing",
        batchStatus: pollRes.status,
        batchId: batchJobId,
        model: config.batch_model || "anthropic/claude-sonnet-5.5:batch",
        startedAt: config.batch_started_at,
        elapsedSeconds,
        message: "Data sedang dalam proses antrean batch Sonnet 5.5 di belakang layar.",
      });
    }

    return NextResponse.json({
      ok: true,
      status: currentStatus,
      batchId: batchJobId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Gagal memproses batch request." },
      { status: 500 }
    );
  }
}

