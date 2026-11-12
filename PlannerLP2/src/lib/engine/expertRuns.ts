import { getServiceClient } from "@/lib/engine/engineDb";
import type { Blocker } from "@/lib/engine/expertStatus";

/**
 * Pencatat siklus kerja Expert. Semua fungsi gagal-diam (tidak boleh menjatuhkan tick
 * hanya karena pencatatan gagal), tetapi mengembalikan false agar pemanggil tahu.
 */

export type RunPhase = "observe" | "diagnose" | "decide" | "act" | "verify" | "done";

export const BLOCKER = {
  NO_META_DATA: (fix = "Periksa token Meta dan ad account di Pengaturan."): Blocker => ({
    code: "NO_META_DATA",
    message: "Tidak ada data kampanye dari Meta (token kedaluwarsa, izin kurang, atau akun kosong).",
    fix,
  }),
  KILL_SWITCH_ON: (): Blocker => ({
    code: "KILL_SWITCH_ON",
    message: "Kill switch aktif. Saya hanya menganalisa, tidak mengeksekusi.",
    fix: "Matikan kill switch di Pengaturan bila Anda ingin saya bertindak.",
  }),
  BUDGET_UNIT_UNVERIFIED: (): Blocker => ({
    code: "BUDGET_UNIT_UNVERIFIED",
    message: "Satuan budget IDR belum diverifikasi, jadi eksekusi otomatis ditahan.",
    fix: "Buka /api/engine/budget-check?campaignId=... lalu cocokkan dengan Ads Manager, kemudian centang verifikasi.",
  }),
  AUTONOMY_OFF: (): Blocker => ({
    code: "AUTONOMY_OFF",
    message: "Mode otonom dimatikan. Semua rencana menunggu persetujuan.",
    fix: "Aktifkan mode otonom di Pengaturan Otonomi.",
  }),
  CRON_NOT_AUTHORIZED: (): Blocker => ({
    code: "CRON_NOT_AUTHORIZED",
    message: "Siklus dipicu tanpa kredensial scheduler, jadi eksekusi otomatis ditahan.",
    fix: "Pastikan ENGINE_CRON_SECRET dan CRON_SECRET sudah diset di environment server.",
  }),
};

export async function startRun(trigger: string): Promise<number | null> {
  try {
    const sb = getServiceClient();
    const { data } = await sb
      .from("engine_runs")
      .insert({ trigger, outcome: "running", phase: "observe" })
      .select("id")
      .single();
    await sb.from("engine_heartbeat").upsert({
      id: "expert",
      last_tick_at: new Date().toISOString(),
      current_phase: "observe",
      current_activity: "Mengambil data kampanye dari Meta.",
      updated_at: new Date().toISOString(),
    });
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function setPhase(runId: number | null, phase: RunPhase, activity: string): Promise<void> {
  try {
    const sb = getServiceClient();
    if (runId) await sb.from("engine_runs").update({ phase }).eq("id", runId);
    await sb
      .from("engine_heartbeat")
      .update({ current_phase: phase, current_activity: activity, updated_at: new Date().toISOString() })
      .eq("id", "expert");
  } catch {
    // pencatatan tidak boleh menghentikan kerja
  }
}

export async function finishRun(input: {
  runId: number | null;
  startedAt: number;
  outcome: "ok" | "partial" | "blocked" | "error";
  blockers: Blocker[];
  stats: Record<string, unknown>;
  intervalMin: number;
}): Promise<void> {
  try {
    const sb = getServiceClient();
    const now = Date.now();
    if (input.runId) {
      await sb
        .from("engine_runs")
        .update({
          finished_at: new Date(now).toISOString(),
          phase: "done",
          outcome: input.outcome,
          blockers: input.blockers,
          stats: input.stats,
          duration_ms: now - input.startedAt,
        })
        .eq("id", input.runId);
    }
    const failed = input.outcome === "error";
    const { data: hb } = await sb.from("engine_heartbeat").select("consecutive_failures").eq("id", "expert").maybeSingle();
    await sb.from("engine_heartbeat").upsert({
      id: "expert",
      last_tick_at: new Date(now).toISOString(),
      ...(failed ? {} : { last_ok_at: new Date(now).toISOString() }),
      current_phase: "done",
      current_activity: null,
      next_run_at: new Date(now + input.intervalMin * 60_000).toISOString(),
      consecutive_failures: failed ? (hb?.consecutive_failures ?? 0) + 1 : 0,
      updated_at: new Date(now).toISOString(),
    });
  } catch {
    // diabaikan
  }
}

