import {
  recognizeDownPaymentRevenue,
  toRupiah,
  type TemplateLine,
} from './journal';

export type RevenueRecognitionMethod = 'termin' | 'progress_pct';

export type ComputeRecognizableRevenueInput = {
  method?: RevenueRecognitionMethod | string | null;
  contractValue?: number | null;
  dpReceivedTotal: number;
  dpAlreadyRecognized?: number | null;
  progressPct?: number | null;
  completedTerminPct?: number | null;
  explicitTerminAmount?: number | null;
};

export type RevenueRecognitionProvenance = {
  method: RevenueRecognitionMethod;
  contractValue: number;
  dpReceivedTotal: number;
  dpAlreadyRecognized: number;
  appliedPct: number | null;
  explicitTerminAmount: number | null;
  basis: 'progress_pct' | 'completed_termin_pct' | 'explicit_termin';
};

export type ComputeRecognizableRevenueResult = {
  recognizableAmount: number;
  remainingDpLiability: number;
  targetCumulative: number;
  journalLines: TemplateLine[];
  provenance: RevenueRecognitionProvenance;
};

export type ScheduledRecognitionProjectInput = ComputeRecognizableRevenueInput & {
  projectId: string;
  projectName?: string | null;
};

export type ScheduledRecognitionPlanItem = {
  projectId: string;
  projectName: string | null;
  periodMonth: string;
  method: RevenueRecognitionMethod;
  progressPct: number | null;
  amountRupiah: number;
  remainingDpLiability: number;
  targetCumulative: number;
  journalLines: TemplateLine[];
  provenance: RevenueRecognitionProvenance;
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizeRevenueRecognitionMethod(
  method?: RevenueRecognitionMethod | string | null,
): RevenueRecognitionMethod {
  const normalized = String(method || '').trim().toLowerCase();
  return normalized === 'progress_pct' ? 'progress_pct' : 'termin';
}

export function normalizePeriodMonth(periodMonth: string): string {
  const trimmed = String(periodMonth || '').trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed.slice(0, 7)}-01`;
  throw new Error(`Format periodMonth tidak valid: ${periodMonth}`);
}

/**
 * Menghitung nominal pengakuan pendapatan DP (Uang Muka Klien -> Pendapatan Proyek)
 * secara deterministik dalam bilangan bulat rupiah, tanpa pernah melebihi DP diterima.
 */
export function computeRecognizableRevenue(
  input: ComputeRecognizableRevenueInput,
): ComputeRecognizableRevenueResult {
  const method = normalizeRevenueRecognitionMethod(input.method);
  const contractValue = Math.max(0, toRupiah(input.contractValue ?? 0));
  const dpReceived = Math.max(0, toRupiah(input.dpReceivedTotal ?? 0));
  const dpAlreadyRecognized = Math.min(
    dpReceived,
    Math.max(0, toRupiah(input.dpAlreadyRecognized ?? 0)),
  );
  const remainingDp = Math.max(0, dpReceived - dpAlreadyRecognized);

  let targetCumulative = dpAlreadyRecognized;
  let recognizableAmount = 0;
  let appliedPct: number | null = null;
  let explicitAmountUsed: number | null = null;
  let basis: RevenueRecognitionProvenance['basis'] = 'completed_termin_pct';

  if (method === 'progress_pct') {
    const pct = clamp(Number(input.progressPct ?? 0), 0, 100);
    appliedPct = pct;
    basis = 'progress_pct';
    targetCumulative = Math.min(dpReceived, toRupiah((dpReceived * pct) / 100));
    recognizableAmount = Math.min(
      remainingDp,
      Math.max(0, targetCumulative - dpAlreadyRecognized),
    );
  } else if (input.explicitTerminAmount != null) {
    const rawExplicit = Math.max(0, toRupiah(input.explicitTerminAmount));
    explicitAmountUsed = rawExplicit;
    basis = 'explicit_termin';
    recognizableAmount = Math.min(remainingDp, rawExplicit);
    targetCumulative = Math.min(dpReceived, dpAlreadyRecognized + recognizableAmount);
  } else {
    const pct = clamp(Number(input.completedTerminPct ?? 0), 0, 100);
    appliedPct = pct;
    basis = 'completed_termin_pct';
    targetCumulative = Math.min(dpReceived, toRupiah((dpReceived * pct) / 100));
    recognizableAmount = Math.min(
      remainingDp,
      Math.max(0, targetCumulative - dpAlreadyRecognized),
    );
  }

  const remainingDpLiability = Math.max(0, remainingDp - recognizableAmount);
  const journalLines = recognizableAmount > 0 ? recognizeDownPaymentRevenue(recognizableAmount) : [];

  return {
    recognizableAmount,
    remainingDpLiability,
    targetCumulative,
    journalLines,
    provenance: {
      method,
      contractValue,
      dpReceivedTotal: dpReceived,
      dpAlreadyRecognized,
      appliedPct,
      explicitTerminAmount: explicitAmountUsed,
      basis,
    },
  };
}

/**
 * Menyusun rencana pengakuan pendapatan DP terjadwal per proyek untuk satu bulan periode.
 * Proyek dengan recognizableAmount <= 0 dilewati.
 */
export function buildScheduledRecognitionPlan(
  projects: ScheduledRecognitionProjectInput[],
  periodMonth: string,
): ScheduledRecognitionPlanItem[] {
  const normalizedPeriod = normalizePeriodMonth(periodMonth);
  const plan: ScheduledRecognitionPlanItem[] = [];

  for (const project of projects) {
    const result = computeRecognizableRevenue(project);
    if (result.recognizableAmount <= 0) continue;

    plan.push({
      projectId: project.projectId,
      projectName: project.projectName ?? null,
      periodMonth: normalizedPeriod,
      method: result.provenance.method,
      progressPct: result.provenance.appliedPct,
      amountRupiah: result.recognizableAmount,
      remainingDpLiability: result.remainingDpLiability,
      targetCumulative: result.targetCumulative,
      journalLines: result.journalLines,
      provenance: result.provenance,
    });
  }

  return plan;
}
