/**
 * Supervisor: pengawas independen atas Expert. Murni (tanpa I/O), jadi bisa diuji.
 * Dua tugas: (1) menjaga disiplin dan keaktifan, (2) menilai efektivitas keputusan.
 * Supervisor hanya boleh MENGURANGI risiko otomatis (kill switch). Ia tidak pernah menaikkan budget
 * dan tidak mengubah ambang sendiri: penyetelan hanya berupa usulan untuk Anda.
 */
import type { HeartbeatRow } from "@/lib/engine/expertStatus";

export type Severity = "info" | "warn" | "critical";

export interface Finding {
  code: string;
  severity: Severity;
  message: string;
}

export interface SupervisorAction {
  at: string;
  actionType: string;
  ok: boolean;
  liveExecuted: boolean;
  undone: boolean;
  /** membaik | stabil | memburuk | data_belum_cukup | null */
  review: string | null;
  rolledBack: boolean;
}

export interface SupervisorInput {
  now: number;
  heartbeat: HeartbeatRow | null;
  intervalMin: number;
  killSwitch: boolean;
  /** Aksi 7 hari terakhir (tanpa baris undo_*). */
  actions: SupervisorAction[];
  limits?: { maxLiveActionsPer24h: number; maxFailedPer24h: number; maxRollbacksPer24h: number };
}

export interface SupervisorReport {
  score: number | null; // null = data belum cukup untuk menilai efektivitas
  grade: "baik" | "perlu_perhatian" | "buruk" | "belum_cukup_data";
  findings: Finding[];
  /** Aksi yang boleh dilakukan Supervisor sendiri. */
  engageKillSwitch: boolean;
  metrics: {
    live7d: number;
    reviewed: number;
    improved: number;
    stable: number;
    worsened: number;
    hitRatePct: number | null;
    undoRatePct: number | null;
    live24h: number;
    failed24h: number;
    rollbacks24h: number;
  };
  suggestions: string[];
}

const DAY = 86_400_000;
const MIN = 60_000;
const DEFAULT_LIMITS = { maxLiveActionsPer24h: 10, maxFailedPer24h: 3, maxRollbacksPer24h: 2 };
/** Minimal aksi yang sudah dievaluasi sebelum skor efektivitas dianggap bermakna. */
export const MIN_REVIEWED_FOR_SCORE = 3;

export function evaluateSupervisor(input: SupervisorInput): SupervisorReport {
  const limits = { ...DEFAULT_LIMITS, ...(input.limits || {}) };
  const findings: Finding[] = [];
  const suggestions: string[] = [];
  const { now } = input;

  const last = input.heartbeat?.last_tick_at ? Date.parse(input.heartbeat.last_tick_at) : NaN;
  let penalty = 0;

  // --- 1. Keaktifan (hanya peringatan; kill switch tidak membantu bila Expert mati) ---
  if (Number.isNaN(last)) {
    findings.push({ code: "NEVER_RAN", severity: "critical", message: "Expert belum pernah menyelesaikan satu siklus pun." });
    penalty += 40;
  } else if (now - last > input.intervalMin * 2 * MIN + 5 * MIN) {
    const mins = Math.round((now - last) / MIN);
    findings.push({ code: "STALE", severity: "critical", message: `Expert diam ${mins} menit (jadwal tiap ${input.intervalMin} menit).` });
    penalty += 40;
  }
  const fails = input.heartbeat?.consecutive_failures ?? 0;
  if (fails >= 3) {
    findings.push({ code: "REPEATED_FAILURES", severity: "critical", message: `${fails} siklus gagal berturut-turut.` });
    penalty += 25;
  } else if (fails > 0) {
    findings.push({ code: "FAILURE", severity: "warn", message: `${fails} siklus terakhir gagal.` });
    penalty += 10;
  }

  // --- 2. Disiplin 24 jam ---
  const in24 = input.actions.filter((a) => now - Date.parse(a.at) <= DAY);
  const live24h = in24.filter((a) => a.liveExecuted).length;
  const failed24h = in24.filter((a) => !a.ok).length;
  const rollbacks24h = in24.filter((a) => a.rolledBack).length;

  let engageKillSwitch = false;
  if (live24h > limits.maxLiveActionsPer24h) {
    findings.push({ code: "TOO_MANY_ACTIONS", severity: "critical", message: `${live24h} aksi live dalam 24 jam, melewati batas ${limits.maxLiveActionsPer24h}.` });
    engageKillSwitch = true;
  }
  if (failed24h >= limits.maxFailedPer24h) {
    findings.push({ code: "TOO_MANY_FAILED_ACTIONS", severity: "critical", message: `${failed24h} aksi gagal dalam 24 jam.` });
    engageKillSwitch = true;
  }
  if (rollbacks24h >= limits.maxRollbacksPer24h) {
    findings.push({ code: "ROLLBACK_STREAK", severity: "critical", message: `${rollbacks24h} aksi harus di-rollback dalam 24 jam. Keputusan Expert patut dicurigai.` });
    engageKillSwitch = true;
  }
  if (engageKillSwitch && input.killSwitch) engageKillSwitch = false; // sudah aktif
  if (engageKillSwitch) penalty += 30;

  // --- 3. Efektivitas 7 hari ---
  const live7 = input.actions.filter((a) => a.liveExecuted);
  const reviewed = live7.filter((a) => a.review && a.review !== "data_belum_cukup");
  const improved = reviewed.filter((a) => a.review === "membaik").length;
  const stable = reviewed.filter((a) => a.review === "stabil").length;
  const worsened = reviewed.filter((a) => a.review === "memburuk").length;
  const hitRatePct = reviewed.length > 0 ? Math.round(((improved + stable) / reviewed.length) * 100) : null;
  const undone = live7.filter((a) => a.undone && !a.rolledBack).length; // dibatalkan manual oleh Anda
  const undoRatePct = live7.length > 0 ? Math.round((undone / live7.length) * 100) : null;

  const enough = reviewed.length >= MIN_REVIEWED_FOR_SCORE;
  if (!enough) {
    findings.push({ code: "NOT_ENOUGH_DATA", severity: "info", message: `Baru ${reviewed.length} aksi yang sudah dievaluasi, belum cukup untuk menilai efektivitas (minimal ${MIN_REVIEWED_FOR_SCORE}).` });
  } else if (hitRatePct !== null) {
    if (hitRatePct < 50) {
      findings.push({ code: "LOW_HIT_RATE", severity: "warn", message: `Hanya ${hitRatePct}% keputusan yang membaik atau stabil setelah 48 jam.` });
      penalty += 30;
      suggestions.push("Pertimbangkan menaikkan ambang winProbabilityToScale atau minPurchasesToScale. Ini usulan, bukan perubahan otomatis.");
    } else if (hitRatePct < 70) {
      penalty += 10;
    }
    if (worsened / reviewed.length > 0.3) {
      findings.push({ code: "MANY_WORSENED", severity: "warn", message: `${worsened} dari ${reviewed.length} keputusan memburuk.` });
      penalty += 10;
    }
  }
  if (undoRatePct !== null && live7.length >= 3 && undoRatePct >= 30) {
    findings.push({ code: "HIGH_USER_UNDO", severity: "warn", message: `Anda membatalkan ${undoRatePct}% aksi Expert. Mungkin keputusannya tidak sesuai selera risiko Anda.` });
    suggestions.push("Turunkan tingkat otonomi aksi yang sering Anda batalkan menjadi Minta persetujuan.");
    penalty += 10;
  }

  const hasCritical = findings.some((f) => f.severity === "critical");
  const score = enough || hasCritical ? Math.max(0, 100 - penalty) : null;
  const grade: SupervisorReport["grade"] =
    score === null ? "belum_cukup_data" : score >= 80 ? "baik" : score >= 55 ? "perlu_perhatian" : "buruk";

  return {
    score,
    grade,
    findings,
    engageKillSwitch,
    metrics: { live7d: live7.length, reviewed: reviewed.length, improved, stable, worsened, hitRatePct, undoRatePct, live24h, failed24h, rollbacks24h },
    suggestions,
  };
}

