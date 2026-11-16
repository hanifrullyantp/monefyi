const DAY_MS = 86_400_000;
const MAX_PROJECTION_DAYS = 1825; // 5 years cap for stalled projections

export interface AnalisaHealthScoreInput {
  totalRAP: number;
  realisasi: number;
  saldo: number;
  estLaba: number;
  contractValue?: number;
  actualProgress: number;
  progressDeviation: number;
  evm?: {
    cpi: number;
    spi: number;
    ac?: number;
    totalBudget?: number;
  } | null;
}

/**
 * Compute monotonic project health score (0-100).
 * Ensures cash deficit, budget overrun, negative estLaba, and schedule delay
 * apply explicit penalties, and EVM CPI/SPI never boosts score above the
 * deterministic score or inflates when budget/actual cost is zero.
 */
export function computeAnalisaHealthScore(input: AnalisaHealthScoreInput): number {
  const {
    totalRAP,
    realisasi,
    saldo,
    estLaba,
    contractValue = 0,
    actualProgress,
    progressDeviation,
    evm,
  } = input;

  const rapPct = totalRAP > 0 ? (realisasi / totalRAP) * 100 : 0;
  const isCashDeficit = saldo < 0;
  const isOverBudget = totalRAP > 0 && realisasi > totalRAP;
  const isNearBudget = !isOverBudget && totalRAP > 0 && rapPct >= 85 && actualProgress < 100;
  const isBehindSchedule = actualProgress < 100 && progressDeviation < -5;
  const isLoss = estLaba < 0;

  let score = 85;

  if (isCashDeficit) {
    const denom = Math.max(contractValue, totalRAP, realisasi, 1);
    const deficitRatio = Math.min(1, Math.abs(saldo) / denom);
    score -= 25 + Math.round(deficitRatio * 15);
  }

  if (isOverBudget) {
    const overPct = rapPct - 100;
    score -= 15 + Math.min(25, Math.max(1, Math.round(overPct * 0.5)));
  } else if (isNearBudget) {
    score -= 8;
  }

  if (isLoss) {
    const denom = Math.max(contractValue, totalRAP, realisasi, 1);
    const lossRatio = Math.min(1, Math.abs(estLaba) / denom);
    score -= 10 + Math.round(lossRatio * 10);
  }

  if (isBehindSchedule) {
    score -= Math.min(25, Math.round(Math.abs(progressDeviation) * 0.6));
  } else if (actualProgress > 0 && progressDeviation >= 0 && !isCashDeficit && !isOverBudget && !isLoss) {
    score += 5;
  }

  const computedScore = Math.max(0, Math.min(100, score));

  if (!evm) return computedScore;
  const effectiveBudget = evm.totalBudget ?? totalRAP;
  const effectiveAc = evm.ac ?? realisasi;

  // EVM CPI/SPI are undefined when budget or actual cost is 0; keep deterministic score.
  if (totalRAP <= 0 || effectiveBudget <= 0 || effectiveAc <= 0) {
    return computedScore;
  }
  if (!Number.isFinite(evm.cpi) || !Number.isFinite(evm.spi)) {
    return computedScore;
  }

  const evmScore = Math.max(0, Math.min(100, Math.round(((evm.cpi + evm.spi) / 2) * 100)));
  // Cap with computedScore so EVM can never boost a deficit/overbudget project upward.
  return Math.min(computedScore, evmScore);
}

export interface ProjectedEndDateInput {
  startDate: string;
  endDate: string;
  actualProgress: number;
  today?: Date;
}

export interface ProjectedEndDateResult {
  label: string;
  projectedDate: string | null;
  isOverdue: boolean;
  isCompleted: boolean;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalMidnight(iso: string): Date | null {
  const clean = (iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const d = new Date(`${clean}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Compute dynamic projected completion date based on actual progress pace and today's date.
 * Never returns a past endDate as if it were a future completion estimate.
 */
export function computeProjectedEndDate(input: ProjectedEndDateInput): ProjectedEndDateResult {
  const { startDate, endDate, actualProgress, today = new Date() } = input;
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayIso = toIsoDate(todayMidnight);
  const start = parseLocalMidnight(startDate);
  const end = parseLocalMidnight(endDate);
  const endStr = end ? toIsoDate(end) : '';

  if (actualProgress >= 100) {
    return {
      label: 'Selesai',
      projectedDate: endStr || todayIso,
      isOverdue: false,
      isCompleted: true,
    };
  }

  if (!end) {
    return {
      label: actualProgress > 0 ? 'Progres berjalan' : 'Belum ada jadwal',
      projectedDate: null,
      isOverdue: false,
      isCompleted: false,
    };
  }

  if (actualProgress <= 0) {
    if (todayMidnight > end) {
      return {
        label: `Belum ada progres (lewat target ${endStr})`,
        projectedDate: null,
        isOverdue: true,
        isCompleted: false,
      };
    }
    return {
      label: endStr,
      projectedDate: endStr,
      isOverdue: false,
      isCompleted: false,
    };
  }

  if (!start || todayMidnight < start) {
    return {
      label: endStr,
      projectedDate: endStr,
      isOverdue: todayMidnight > end,
      isCompleted: false,
    };
  }

  const elapsedDays = Math.max(1, Math.round((todayMidnight.getTime() - start.getTime()) / DAY_MS));
  const pacePerDay = actualProgress / elapsedDays;
  const remainingPct = Math.max(0, 100 - actualProgress);
  const rawRemainingDays = Math.ceil(remainingPct / pacePerDay);

  if (!Number.isFinite(rawRemainingDays) || rawRemainingDays > MAX_PROJECTION_DAYS) {
    const overdue = todayMidnight > end;
    return {
      label: overdue
        ? `Progres sangat lambat (lewat target ${endStr})`
        : `Progres sangat lambat (target ${endStr})`,
      projectedDate: null,
      isOverdue: true,
      isCompleted: false,
    };
  }

  const remainingDays = Math.max(1, rawRemainingDays);
  const projected = new Date(todayMidnight.getTime() + remainingDays * DAY_MS);
  const projectedIso = toIsoDate(projected);

  return {
    label: projectedIso,
    projectedDate: projectedIso,
    isOverdue: projected > end || todayMidnight > end,
    isCompleted: false,
  };
}

export interface AnalisaFinanceBadgeInput {
  isCashDeficit: boolean;
  isOverBudget: boolean;
  isNearBudget: boolean;
  totalPemasukan: number;
  estLaba: number;
}

export interface AnalisaBadgeConfig {
  color: 'emerald' | 'amber' | 'rose';
  label: string;
}

/**
 * Determine honest finance badge for Tab Analisa.
 * Never returns "Sehat" when totalPemasukan <= 0, estLaba < 0, or cash deficit.
 */
export function getAnalisaFinanceBadge(input: AnalisaFinanceBadgeInput): AnalisaBadgeConfig {
  if (input.isCashDeficit) {
    return { color: 'rose', label: 'Keuangan: Defisit Kas' };
  }
  if (input.isOverBudget) {
    return { color: 'rose', label: 'Keuangan: Over Budget' };
  }
  if (input.estLaba < 0) {
    return { color: 'rose', label: 'Keuangan: Proyeksi Rugi' };
  }
  if (input.totalPemasukan <= 0) {
    return { color: 'amber', label: 'Keuangan: Belum Ada Pemasukan' };
  }
  if (input.isNearBudget) {
    return { color: 'amber', label: 'Keuangan: Mendekati Batas RAP' };
  }
  return { color: 'emerald', label: 'Keuangan: Sehat' };
}

/**
 * Return project-type-aware advice when schedule progress is behind plan.
 */
export function getBehindScheduleAdvice(projectType?: string | null): string {
  const t = (projectType || '').trim().toLowerCase();

  if (/^(it|software|tech|digital|web|aplikasi|sistem)/.test(t)) {
    return 'Beberapa tugas berada di bawah target jadwal rencana. Pertimbangkan penyesuaian ruang lingkup (re-scoping), paralelisasi pekerjaan, atau penambahan kapasitas tim developer.';
  }
  if (/^(event|acara|expo|seminar|konser)/.test(t)) {
    return 'Beberapa persiapan berada di bawah target jadwal rencana. Pertimbangkan percepatan koordinasi vendor, penjadwalan ulang milestone, atau penambahan kru operasional.';
  }
  if (/^(service|jasa|konsultasi|layanan)/.test(t)) {
    return 'Beberapa tugas berada di bawah target jadwal rencana. Pertimbangkan penjadwalan ulang prioritas tugas atau penambahan kapasitas tim pelaksana.';
  }
  if (/^(manufacturing|manufaktur|produksi|interior|furniture)/.test(t)) {
    return 'Beberapa tahapan produksi berada di bawah target jadwal rencana. Pertimbangkan penyesuaian shift kerja, percepatan pengadaan material, atau penambahan kapasitas operator.';
  }
  if (/^(construction|konstruksi|renovasi|bangunan)/.test(t)) {
    return 'Beberapa item pekerjaan berada di bawah target jadwal rencana. Pertimbangkan penyesuaian jadwal kerja, lembur, atau penambahan tenaga lapangan.';
  }

  return 'Beberapa item pekerjaan berada di bawah target jadwal rencana. Pertimbangkan penjadwalan ulang prioritas atau penambahan kapasitas tim pelaksana.';
}
