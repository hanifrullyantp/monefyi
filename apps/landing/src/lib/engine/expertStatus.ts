/**
 * Status hidup Expert. Murni (tanpa I/O): dihitung dari heartbeat dan run terakhir,
 * bukan dari hasil analisa, supaya "aman" tidak bisa berarti "mati".
 */

export interface Blocker {
  code: string;
  message: string;
  fix: string;
}

export interface HeartbeatRow {
  last_tick_at: string | null;
  last_ok_at: string | null;
  current_activity: string | null;
  current_phase: string | null;
  next_run_at: string | null;
  consecutive_failures: number;
}

export interface RunRow {
  started_at: string;
  finished_at: string | null;
  outcome: string | null;
  blockers: Blocker[];
}

export type ExpertState = "working" | "monitoring" | "waiting_user" | "blocked" | "inactive";

export interface ExpertStatus {
  state: ExpertState;
  headline: string;
  detail: string;
  blockers: Blocker[];
  lastTickAt: string | null;
  nextRunAt: string | null;
}

const MIN = 60_000;

function ago(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} jam lalu` : `${Math.floor(h / 24)} hari lalu`;
}

export function computeExpertStatus(input: {
  heartbeat: HeartbeatRow | null;
  lastRun: RunRow | null;
  intervalMin: number;
  pendingApprovals: number;
  preflightBlockers?: Blocker[];
  now?: number;
}): ExpertStatus {
  const now = input.now ?? Date.now();
  const hb = input.heartbeat;
  const lastTick = hb?.last_tick_at ? Date.parse(hb.last_tick_at) : NaN;
  const base = {
    lastTickAt: hb?.last_tick_at ?? null,
    nextRunAt: hb?.next_run_at ?? null,
  };
  const blockers = [...(input.lastRun?.blockers || []), ...(input.preflightBlockers || [])]
    .filter((b, i, arr) => arr.findIndex((x) => x.code === b.code) === i);

  // Sedang berjalan (run belum selesai dan masih baru)
  if (input.lastRun && !input.lastRun.finished_at && now - Date.parse(input.lastRun.started_at) < 10 * MIN) {
    return {
      ...base,
      state: "working",
      headline: "Sedang bekerja",
      detail: hb?.current_activity || "Menganalisa kampanye.",
      blockers: [],
    };
  }

  if (!hb || Number.isNaN(lastTick)) {
    return {
      ...base,
      state: "inactive",
      headline: "Belum pernah berjalan",
      detail: "Belum ada siklus kerja tercatat. Scheduler belum aktif atau belum dipanggil.",
      blockers,
    };
  }

  const stale = now - lastTick > input.intervalMin * 2 * MIN + 5 * MIN;
  if (stale) {
    return {
      ...base,
      state: "inactive",
      headline: "Tidak aktif",
      detail: `Siklus terakhir ${ago(now - lastTick)}, padahal seharusnya tiap ${input.intervalMin} menit. Scheduler kemungkinan berhenti.`,
      blockers,
    };
  }

  if (hb.consecutive_failures > 0 || blockers.length > 0 || input.lastRun?.outcome === "error" || input.lastRun?.outcome === "blocked") {
    return {
      ...base,
      state: "blocked",
      headline: "Terkendala",
      detail: blockers[0]?.message || `Gagal ${hb.consecutive_failures}x berturut-turut.`,
      blockers,
    };
  }

  if (input.pendingApprovals > 0) {
    return {
      ...base,
      state: "waiting_user",
      headline: `Menunggu keputusan Anda (${input.pendingApprovals})`,
      detail: "Ada rencana yang butuh persetujuan sebelum saya jalankan.",
      blockers: [],
    };
  }

  return {
    ...base,
    state: "monitoring",
    headline: "Memantau",
    detail: `Terakhir cek ${ago(now - lastTick)}.`,
    blockers: [],
  };
}

