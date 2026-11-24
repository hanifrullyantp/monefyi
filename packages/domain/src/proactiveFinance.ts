import { toRupiah } from './journal';
import { normalizePeriodMonth } from './revenueRecognition';

const MS_PER_DAY = 86_400_000;
const DEFAULT_CASH_LOW_RATIO = 0.15;
const DEFAULT_CASH_LOW_MIN_RUPIAH = 5_000_000;
const DEFAULT_OVER_BUDGET_WARN_RATIO = 0.9;

function parseYmdUtcMs(ymd: string, fieldName = 'tanggal'): number {
  const raw = String(ymd ?? '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Format ${fieldName} tidak valid (harus YYYY-MM-DD): ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const probe = new Date(utc);
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() + 1 !== month
    || probe.getUTCDate() !== day
  ) {
    throw new Error(`Tanggal ${fieldName} tidak valid: ${ymd}`);
  }
  return utc;
}

function diffDaysUtc(fromYmd: string, toYmd: string, fromLabel = 'dueDate', toLabel = 'asOfDate'): number {
  const fromMs = parseYmdUtcMs(fromYmd, fromLabel);
  const toMs = parseYmdUtcMs(toYmd, toLabel);
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10_000) / 10_000;
}

function formatRupiahLabel(amount: number): string {
  const integer = toRupiah(amount);
  const absFormatted = Math.abs(integer)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return integer < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

// ============================================================================
// 1. Aging Piutang / Hutang (5 Bucket)
// ============================================================================

export type AgingKind = 'receivable' | 'payable';

export type AgingBucketKey =
  | 'current'
  | 'days_1_30'
  | 'days_31_60'
  | 'days_61_90'
  | 'over_90';

export const AGING_BUCKET_KEYS: readonly AgingBucketKey[] = [
  'current',
  'days_1_30',
  'days_31_60',
  'days_61_90',
  'over_90',
] as const;

export type AgingBucketTotals = Record<AgingBucketKey, number>;

export type AgingItemInput = {
  id: string;
  kind?: AgingKind;
  partyId: string;
  partyName: string;
  projectId?: string | null;
  dueDate: string;
  outstandingAmount: number;
};

export type AgingClassifiedItem = {
  id: string;
  kind: AgingKind;
  partyId: string;
  partyName: string;
  projectId: string | null;
  dueDate: string;
  outstandingAmount: number;
  daysOverdue: number;
  bucket: AgingBucketKey;
};

export type AgingPartySummary = {
  partyId: string;
  partyName: string;
  itemCount: number;
  buckets: AgingBucketTotals;
  bucketCounts: AgingBucketTotals;
  totalOutstanding: number;
  totalOverdue: number;
  maxDaysOverdue: number;
};

export type AgingScheduleResult = {
  kind: AgingKind;
  asOfDate: string;
  items: AgingClassifiedItem[];
  buckets: AgingBucketTotals;
  bucketCounts: AgingBucketTotals;
  totalOutstanding: number;
  totalOverdue: number;
  byParty: AgingPartySummary[];
  provenance: {
    asOfDate: string;
    itemCount: number;
    kind: AgingKind;
  };
};

function emptyBuckets(): AgingBucketTotals {
  return {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    over_90: 0,
  };
}

function classifyAgingBucket(daysOverdue: number): AgingBucketKey {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return 'days_1_30';
  if (daysOverdue <= 60) return 'days_31_60';
  if (daysOverdue <= 90) return 'days_61_90';
  return 'over_90';
}

function resolveAgingKind(items: AgingItemInput[], explicitKind?: AgingKind): AgingKind {
  const itemKinds = new Set<AgingKind>();
  for (const item of items) {
    if (item.kind) {
      if (item.kind !== 'receivable' && item.kind !== 'payable') {
        throw new Error(`Jenis aging tidak valid: ${String(item.kind)}`);
      }
      itemKinds.add(item.kind);
    }
  }

  if (explicitKind) {
    if (explicitKind !== 'receivable' && explicitKind !== 'payable') {
      throw new Error(`Jenis aging tidak valid: ${String(explicitKind)}`);
    }
    for (const k of itemKinds) {
      if (k !== explicitKind) {
        throw new Error(`Item dengan kind '${k}' tidak cocok dengan opsi '${explicitKind}'`);
      }
    }
    return explicitKind;
  }

  if (itemKinds.size > 1) {
    throw new Error('Campuran kind receivable dan payable tidak boleh digabung dalam satu jadwal aging');
  }
  if (itemKinds.size === 1) {
    return [...itemKinds][0];
  }
  return 'receivable';
}

/**
 * Menghitung jadwal umur piutang atau hutang dalam 5 bucket deterministik
 * dengan seluruh nominal berformat integer rupiah.
 */
export function computeAgingSchedule(
  items: AgingItemInput[],
  asOfDate: string,
  options?: { kind?: AgingKind },
): AgingScheduleResult {
  parseYmdUtcMs(asOfDate, 'asOfDate');
  const kind = resolveAgingKind(items, options?.kind);

  const buckets = emptyBuckets();
  const bucketCounts = emptyBuckets();
  const classifiedItems: AgingClassifiedItem[] = [];
  const partyMap = new Map<string, AgingPartySummary>();

  let totalOutstanding = 0;
  let totalOverdue = 0;

  for (const raw of items) {
    const amount = toRupiah(raw.outstandingAmount);
    if (amount <= 0) continue;

    const partyId = String(raw.partyId ?? '').trim();
    const partyName = String(raw.partyName ?? '').trim() || partyId;
    if (!partyId) {
      throw new Error(`Item aging '${raw.id}' wajib memiliki partyId`);
    }

    const daysOverdue = diffDaysUtc(raw.dueDate, asOfDate, 'dueDate', 'asOfDate');
    const bucket = classifyAgingBucket(daysOverdue);
    const positiveOverdueDays = Math.max(0, daysOverdue);

    const classified: AgingClassifiedItem = {
      id: String(raw.id),
      kind,
      partyId,
      partyName,
      projectId: raw.projectId ?? null,
      dueDate: raw.dueDate,
      outstandingAmount: amount,
      daysOverdue,
      bucket,
    };
    classifiedItems.push(classified);

    buckets[bucket] += amount;
    bucketCounts[bucket] += 1;
    totalOutstanding += amount;
    if (bucket !== 'current') {
      totalOverdue += amount;
    }

    let party = partyMap.get(partyId);
    if (!party) {
      party = {
        partyId,
        partyName,
        itemCount: 0,
        buckets: emptyBuckets(),
        bucketCounts: emptyBuckets(),
        totalOutstanding: 0,
        totalOverdue: 0,
        maxDaysOverdue: 0,
      };
      partyMap.set(partyId, party);
    }

    party.itemCount += 1;
    party.buckets[bucket] += amount;
    party.bucketCounts[bucket] += 1;
    party.totalOutstanding += amount;
    if (bucket !== 'current') {
      party.totalOverdue += amount;
    }
    if (positiveOverdueDays > party.maxDaysOverdue) {
      party.maxDaysOverdue = positiveOverdueDays;
    }
  }

  const byParty = [...partyMap.values()].sort(
    (a, b) => b.totalOutstanding - a.totalOutstanding || a.partyId.localeCompare(b.partyId),
  );

  return {
    kind,
    asOfDate,
    items: classifiedItems,
    buckets,
    bucketCounts,
    totalOutstanding,
    totalOverdue,
    byParty,
    provenance: {
      asOfDate,
      itemCount: classifiedItems.length,
      kind,
    },
  };
}

// ============================================================================
// 2. Skor Risiko Penagihan Klien
// ============================================================================

export type ClientRiskBand = 'low' | 'medium' | 'high' | 'critical';

export type ClientPaymentHistoryItem = {
  invoiceId: string;
  dueDate: string;
  paidDate?: string | null;
  amount: number;
};

export type ClientCollectionRiskInput = {
  partyId: string;
  partyName: string;
  paymentHistory: ClientPaymentHistoryItem[];
  currentOpenReceivables: number;
  asOfDate: string;
};

export type ClientCollectionRiskResult = {
  partyId: string;
  partyName: string;
  latePaymentRate: number;
  avgDaysLate: number;
  maxDaysOverdue: number;
  overdueRatio: number;
  score: number;
  riskBand: ClientRiskBand;
  reasons: string[];
  provenance: {
    asOfDate: string;
    partyId: string;
    historyCount: number;
    observedDueCount: number;
    openHistoryCount: number;
    currentOpenReceivables: number;
    overdueAmount: number;
    scoringModel: 'deterministic_collection_risk_v1';
  };
};

/**
 * Menghitung skor risiko penagihan klien (0..100) secara deterministik
 * dari histori ketepatan bayar, rata-rata hari telat, tunggakan terlama, dan rasio overdue.
 */
export function scoreClientCollectionRisk(
  input: ClientCollectionRiskInput,
): ClientCollectionRiskResult {
  parseYmdUtcMs(input.asOfDate, 'asOfDate');
  const partyId = String(input.partyId ?? '').trim();
  if (!partyId) {
    throw new Error('partyId wajib diisi untuk penilaian risiko klien');
  }
  const partyName = String(input.partyName ?? '').trim() || partyId;
  const currentOpenReceivables = Math.max(0, toRupiah(input.currentOpenReceivables));
  const history = input.paymentHistory ?? [];

  let observedDueCount = 0;
  let lateCount = 0;
  let totalDaysLate = 0;
  let maxOpenDaysOverdue = 0;
  let openHistoryCount = 0;
  let openHistoryAmount = 0;
  let overdueHistoryAmount = 0;

  for (const item of history) {
    const amount = Math.max(0, toRupiah(item.amount));
    const paidDate = item.paidDate ? String(item.paidDate).trim() : '';

    if (paidDate) {
      const daysLate = Math.max(0, diffDaysUtc(item.dueDate, paidDate, 'dueDate', 'paidDate'));
      observedDueCount += 1;
      totalDaysLate += daysLate;
      if (daysLate > 0) {
        lateCount += 1;
      }
      continue;
    }

    openHistoryCount += 1;
    openHistoryAmount += amount;
    const openDaysOverdue = Math.max(0, diffDaysUtc(item.dueDate, input.asOfDate, 'dueDate', 'asOfDate'));
    if (openDaysOverdue > 0) {
      observedDueCount += 1;
      lateCount += 1;
      totalDaysLate += openDaysOverdue;
      overdueHistoryAmount += amount;
      if (openDaysOverdue > maxOpenDaysOverdue) {
        maxOpenDaysOverdue = openDaysOverdue;
      }
    }
  }

  const latePaymentRate = observedDueCount > 0 ? round4(lateCount / observedDueCount) : 0;
  const avgDaysLate = observedDueCount > 0 ? round2(totalDaysLate / observedDueCount) : 0;
  const maxDaysOverdue = maxOpenDaysOverdue;

  const totalExposure = Math.max(currentOpenReceivables, openHistoryAmount);
  const overdueAmount = totalExposure > 0 ? Math.min(totalExposure, overdueHistoryAmount) : 0;
  const overdueRatio = totalExposure > 0 ? round4(overdueAmount / totalExposure) : 0;

  const ratePoints = latePaymentRate * 35;
  const avgLatePoints = Math.min(25, (avgDaysLate / 60) * 25);
  const maxOverduePoints = Math.min(25, (maxDaysOverdue / 90) * 25);
  const overdueRatioPoints = Math.min(15, overdueRatio * 15);

  const score = Math.min(
    100,
    Math.max(0, Math.round(ratePoints + avgLatePoints + maxOverduePoints + overdueRatioPoints)),
  );

  let riskBand: ClientRiskBand = 'low';
  if (score >= 75) riskBand = 'critical';
  else if (score >= 50) riskBand = 'high';
  else if (score >= 25) riskBand = 'medium';

  const reasons: string[] = [];
  if (latePaymentRate >= 0.5) {
    reasons.push(
      `Tingkat keterlambatan tinggi (${Math.round(latePaymentRate * 100)}% invoice melewati jatuh tempo)`,
    );
  } else if (latePaymentRate > 0) {
    reasons.push(
      `Terdapat riwayat keterlambatan pembayaran (${Math.round(latePaymentRate * 100)}% invoice)`,
    );
  }

  if (avgDaysLate >= 15) {
    reasons.push(`Rata-rata keterlambatan pembayaran ${avgDaysLate} hari`);
  }

  if (maxDaysOverdue > 60) {
    reasons.push(`Piutang terbuka menunggak hingga ${maxDaysOverdue} hari (> 60 hari)`);
  } else if (maxDaysOverdue > 0) {
    reasons.push(`Terdapat piutang terbuka melewati jatuh tempo (${maxDaysOverdue} hari)`);
  }

  if (overdueRatio >= 0.5) {
    reasons.push(
      `Rasio piutang overdue tinggi (${Math.round(overdueRatio * 100)}% dari eksposur terbuka)`,
    );
  } else if (overdueRatio > 0) {
    reasons.push(
      `Sebagian piutang terbuka sudah jatuh tempo (${Math.round(overdueRatio * 100)}%)`,
    );
  }

  if (reasons.length === 0) {
    reasons.push('Riwayat pembayaran tepat waktu tanpa tunggakan jatuh tempo');
  }

  return {
    partyId,
    partyName,
    latePaymentRate,
    avgDaysLate,
    maxDaysOverdue,
    overdueRatio,
    score,
    riskBand,
    reasons,
    provenance: {
      asOfDate: input.asOfDate,
      partyId,
      historyCount: history.length,
      observedDueCount,
      openHistoryCount,
      currentOpenReceivables,
      overdueAmount,
      scoringModel: 'deterministic_collection_risk_v1',
    },
  };
}

// ============================================================================
// 3. Peringatan Proaktif Proyek & Kas
// ============================================================================

export type ProjectProactiveAlertCode =
  | 'project_over_budget'
  | 'project_cash_low'
  | 'dp_received_zero_progress';

export type ProjectProactiveAlertSeverity = 'warning' | 'critical';

export type ProjectAlertInput = {
  projectId: string;
  projectName: string;
  status?: 'active' | 'completed' | 'cancelled' | 'on_hold' | string;
  rapBudget: number;
  realizedCost: number;
  projectCashBalance?: number | null;
  dpReceivedBalance?: number | null;
  progressPct?: number | null;
  cashLowRatioThreshold?: number;
  cashLowMinRupiah?: number;
  overBudgetWarnRatio?: number;
};

export type ProjectProactiveAlert = {
  projectId: string;
  projectName: string;
  code: ProjectProactiveAlertCode;
  severity: ProjectProactiveAlertSeverity;
  title: string;
  detail: string;
  metrics: Record<string, number>;
};

export type ProjectProactiveAlertsResult = {
  alerts: ProjectProactiveAlert[];
  summary: {
    totalProjects: number;
    projectsWithAlerts: number;
    totalAlerts: number;
    criticalCount: number;
    warningCount: number;
  };
  provenance: {
    asOfDate: string;
    projectCount: number;
    evaluator: 'deterministic_project_alerts_v1';
  };
};

function isProjectActive(status?: string): boolean {
  const norm = String(status ?? 'active').trim().toLowerCase();
  return norm !== 'completed' && norm !== 'closed' && norm !== 'cancelled';
}

function isProjectCancelled(status?: string): boolean {
  const norm = String(status ?? 'active').trim().toLowerCase();
  return norm === 'cancelled';
}

/**
 * Mengevaluasi peringatan proaktif deterministik per proyek:
 * over-budget RAP, kas proyek menipis, dan DP masuk saat progres masih 0%.
 */
export function evaluateProjectProactiveAlerts(
  projects: ProjectAlertInput[],
  asOfDate: string,
): ProjectProactiveAlertsResult {
  parseYmdUtcMs(asOfDate, 'asOfDate');
  const alerts: ProjectProactiveAlert[] = [];
  const alertedProjects = new Set<string>();

  for (const project of projects) {
    const projectId = String(project.projectId ?? '').trim();
    const projectName = String(project.projectName ?? '').trim() || projectId;
    const rapBudget = Math.max(0, toRupiah(project.rapBudget));
    const realizedCost = Math.max(0, toRupiah(project.realizedCost));
    const active = isProjectActive(project.status);
    const cancelled = isProjectCancelled(project.status);

    // 1) Over-budget atau mendekati (>= 90% RAP)
    const warnRatio = project.overBudgetWarnRatio ?? DEFAULT_OVER_BUDGET_WARN_RATIO;
    if (rapBudget > 0) {
      const utilizationRatio = realizedCost / rapBudget;
      const utilizationPct = round2(utilizationRatio * 100);
      if (realizedCost > rapBudget) {
        const overAmount = realizedCost - rapBudget;
        alerts.push({
          projectId,
          projectName,
          code: 'project_over_budget',
          severity: 'critical',
          title: 'Biaya proyek melampaui RAP',
          detail: `Realisasi biaya ${formatRupiahLabel(realizedCost)} melebihi RAP ${formatRupiahLabel(rapBudget)} sebesar ${formatRupiahLabel(overAmount)} (${utilizationPct}%).`,
          metrics: {
            rapBudget,
            realizedCost,
            overAmount,
            utilizationPct,
          },
        });
        alertedProjects.add(projectId);
      } else if (utilizationRatio >= warnRatio) {
        const remainingRap = rapBudget - realizedCost;
        alerts.push({
          projectId,
          projectName,
          code: 'project_over_budget',
          severity: 'warning',
          title: 'Biaya proyek mendekati batas RAP',
          detail: `Realisasi biaya mencapai ${utilizationPct}% dari RAP (${formatRupiahLabel(realizedCost)} / ${formatRupiahLabel(rapBudget)}), sisa RAP ${formatRupiahLabel(remainingRap)}.`,
          metrics: {
            rapBudget,
            realizedCost,
            remainingRap,
            utilizationPct,
          },
        });
        alertedProjects.add(projectId);
      }
    } else if (realizedCost > 0) {
      alerts.push({
        projectId,
        projectName,
        code: 'project_over_budget',
        severity: 'critical',
        title: 'Biaya proyek muncul tanpa anggaran RAP',
        detail: `Terdapat realisasi biaya ${formatRupiahLabel(realizedCost)} pada proyek dengan RAP Rp 0.`,
        metrics: {
          rapBudget: 0,
          realizedCost,
          overAmount: realizedCost,
        },
      });
      alertedProjects.add(projectId);
    }

    // 2) Kas proyek menipis saat proyek masih aktif
    if (active && project.projectCashBalance != null) {
      const cashBalance = toRupiah(project.projectCashBalance);
      const remainingRap = Math.max(0, rapBudget - realizedCost);
      const ratioThreshold = project.cashLowRatioThreshold ?? DEFAULT_CASH_LOW_RATIO;
      const minRupiah = Math.max(0, toRupiah(project.cashLowMinRupiah ?? DEFAULT_CASH_LOW_MIN_RUPIAH));
      const ratioThresholdAmount = toRupiah(remainingRap * ratioThreshold);
      const effectiveThreshold = Math.max(ratioThresholdAmount, minRupiah);

      if (cashBalance < ratioThresholdAmount || cashBalance < minRupiah) {
        alerts.push({
          projectId,
          projectName,
          code: 'project_cash_low',
          severity: cashBalance <= 0 ? 'critical' : 'warning',
          title: 'Kas proyek menipis',
          detail: `Kas proyek ${formatRupiahLabel(cashBalance)} berada di bawah ambang aman ${formatRupiahLabel(effectiveThreshold)} (15% sisa RAP = ${formatRupiahLabel(ratioThresholdAmount)}, batas minimum = ${formatRupiahLabel(minRupiah)}).`,
          metrics: {
            projectCashBalance: cashBalance,
            remainingRap,
            ratioThresholdAmount,
            minRupiah,
            effectiveThreshold,
          },
        });
        alertedProjects.add(projectId);
      }
    }

    // 3) Saldo uang muka klien > 0 tetapi progres lapangan masih 0%
    if (!cancelled) {
      const dpBalance = Math.max(0, toRupiah(project.dpReceivedBalance ?? 0));
      const progressPct = Number.isFinite(Number(project.progressPct))
        ? Number(project.progressPct)
        : 0;

      if (dpBalance > 0 && progressPct === 0) {
        alerts.push({
          projectId,
          projectName,
          code: 'dp_received_zero_progress',
          severity: 'warning',
          title: 'DP diterima tetapi progres proyek masih 0%',
          detail: `Saldo uang muka klien sebesar ${formatRupiahLabel(dpBalance)} sudah masuk, namun progres lapangan tercatat 0%. Periksa jadwal kerja atau perbarui progres untuk pengakuan pendapatan.`,
          metrics: {
            dpReceivedBalance: dpBalance,
            progressPct: 0,
          },
        });
        alertedProjects.add(projectId);
      }
    }
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return {
    alerts,
    summary: {
      totalProjects: projects.length,
      projectsWithAlerts: alertedProjects.size,
      totalAlerts: alerts.length,
      criticalCount,
      warningCount,
    },
    provenance: {
      asOfDate,
      projectCount: projects.length,
      evaluator: 'deterministic_project_alerts_v1',
    },
  };
}

// ============================================================================
// 4. Checklist Tutup Bulan Otomatis (6 Butir Wajib)
// ============================================================================

export type MonthCloseCheckCode =
  | 'receipts_complete'
  | 'bank_reconciled'
  | 'accruals_reviewed'
  | 'depreciation_posted'
  | 'opex_vs_plan_reviewed'
  | 'zero_needs_review';

export type MonthCloseCheckStatus = 'pass' | 'warn' | 'block';

export type MonthCloseChecklistItem = {
  code: MonthCloseCheckCode;
  label: string;
  status: MonthCloseCheckStatus;
  detail: string;
  blockingCount: number;
};

export type MonthCloseWalletStatus = {
  walletId: string;
  walletName: string;
  status: 'reconciled' | 'needs_review' | 'unreconciled' | string;
  unexplainedDifference: number;
};

export type MonthCloseChecklistInput = {
  periodMonth: string;
  asOfDate?: string;
  receipts: {
    requiredCount: number;
    attachedCount: number;
    missingReceiptEntryIds?: string[];
  };
  bankWallets: MonthCloseWalletStatus[];
  accruals: {
    reviewed: boolean;
    pendingAccrualCount?: number;
    unrecognizedEligibleDpCount?: number;
  };
  depreciation: {
    activeAssetCount: number;
    postedAssetCount: number;
    postedJournalCount?: number;
  };
  opexVsPlan: {
    planAmount: number;
    realizedAmount: number;
    reviewed?: boolean;
  };
  needsReviewCount: number;
};

export type MonthCloseChecklistResult = {
  periodMonth: string;
  readyToClose: boolean;
  items: MonthCloseChecklistItem[];
  opexVariance: {
    planAmount: number;
    realizedAmount: number;
    varianceAmount: number;
    variancePct: number | null;
  };
  summary: {
    totalChecks: 6;
    passCount: number;
    warnCount: number;
    blockCount: number;
    totalBlockingCount: number;
  };
  provenance: {
    periodMonth: string;
    periodStart: string;
    asOfDate: string | null;
    checklistVersion: 'deterministic_month_close_v1';
    sourceCounts: {
      receiptRequiredCount: number;
      receiptAttachedCount: number;
      walletCount: number;
      activeAssetCount: number;
      postedAssetCount: number;
      needsReviewCount: number;
    };
  };
};

/**
 * Mengevaluasi 6 butir wajib tutup bulan secara deterministik dari data buku besar.
 * `readyToClose` bernilai `true` hanya apabila 0 butir berstatus `'block'`.
 */
export function evaluateMonthCloseChecklist(
  input: MonthCloseChecklistInput,
): MonthCloseChecklistResult {
  const periodStart = normalizePeriodMonth(input.periodMonth);
  const periodYm = periodStart.slice(0, 7);
  if (input.asOfDate) {
    parseYmdUtcMs(input.asOfDate, 'asOfDate');
  }

  const items: MonthCloseChecklistItem[] = [];

  // 1. receipts_complete
  const requiredReceipts = Math.max(0, Math.floor(input.receipts.requiredCount));
  const attachedReceipts = Math.max(0, Math.floor(input.receipts.attachedCount));
  const missingReceiptIdsCount = input.receipts.missingReceiptEntryIds?.length ?? 0;
  const missingReceipts = Math.max(missingReceiptIdsCount, Math.max(0, requiredReceipts - attachedReceipts));

  if (requiredReceipts === 0 && missingReceipts === 0) {
    items.push({
      code: 'receipts_complete',
      label: 'Kelengkapan bukti & lampiran nota',
      status: 'pass',
      detail: 'Tidak ada transaksi wajib lampiran nota pada periode ini.',
      blockingCount: 0,
    });
  } else if (missingReceipts === 0) {
    items.push({
      code: 'receipts_complete',
      label: 'Kelengkapan bukti & lampiran nota',
      status: 'pass',
      detail: `Seluruh ${requiredReceipts} transaksi wajib bukti telah memiliki lampiran nota.`,
      blockingCount: 0,
    });
  } else {
    items.push({
      code: 'receipts_complete',
      label: 'Kelengkapan bukti & lampiran nota',
      status: 'block',
      detail: `${missingReceipts} dari ${requiredReceipts} transaksi wajib bukti belum memiliki lampiran nota.`,
      blockingCount: missingReceipts,
    });
  }

  // 2. bank_reconciled
  const wallets = input.bankWallets ?? [];
  if (wallets.length === 0) {
    items.push({
      code: 'bank_reconciled',
      label: 'Rekonsiliasi dompet kas & mutasi bank',
      status: 'warn',
      detail: 'Belum ada data rekonsiliasi dompet kas/bank yang dicatat pada periode ini.',
      blockingCount: 0,
    });
  } else {
    const problematicWallets = wallets.filter(
      (w) => String(w.status).trim().toLowerCase() !== 'reconciled'
        || toRupiah(w.unexplainedDifference) !== 0,
    );
    if (problematicWallets.length === 0) {
      items.push({
        code: 'bank_reconciled',
        label: 'Rekonsiliasi dompet kas & mutasi bank',
        status: 'pass',
        detail: `Seluruh ${wallets.length} dompet kas/bank berstatus reconciled dengan selisih tak terjelaskan Rp 0.`,
        blockingCount: 0,
      });
    } else {
      const names = problematicWallets.map((w) => w.walletName || w.walletId).join(', ');
      items.push({
        code: 'bank_reconciled',
        label: 'Rekonsiliasi dompet kas & mutasi bank',
        status: 'block',
        detail: `${problematicWallets.length} dompet kas/bank belum reconciled atau masih memiliki selisih (${names}).`,
        blockingCount: problematicWallets.length,
      });
    }
  }

  // 3. accruals_reviewed
  const pendingAccruals = Math.max(0, Math.floor(input.accruals.pendingAccrualCount ?? 0));
  const pendingDpRecognition = Math.max(0, Math.floor(input.accruals.unrecognizedEligibleDpCount ?? 0));
  const accrualTotalPending = pendingAccruals + pendingDpRecognition;

  if (!input.accruals.reviewed || accrualTotalPending > 0) {
    const blockingCount = Math.max(input.accruals.reviewed ? 0 : 1, accrualTotalPending);
    items.push({
      code: 'accruals_reviewed',
      label: 'Peninjauan akrual hutang/piutang & pengakuan DP',
      status: 'block',
      detail: !input.accruals.reviewed
        ? 'Akrual hutang/piutang dan pengakuan pendapatan DP periode belum ditinjau.'
        : `Masih terdapat ${accrualTotalPending} item akrual/pengakuan DP yang belum diselesaikan.`,
      blockingCount,
    });
  } else {
    items.push({
      code: 'accruals_reviewed',
      label: 'Peninjauan akrual hutang/piutang & pengakuan DP',
      status: 'pass',
      detail: 'Akrual hutang/piutang dan jadwal pengakuan pendapatan DP periode telah ditinjau.',
      blockingCount: 0,
    });
  }

  // 4. depreciation_posted
  const activeAssets = Math.max(0, Math.floor(input.depreciation.activeAssetCount));
  const postedAssets = Math.max(0, Math.floor(input.depreciation.postedAssetCount));
  const postedJournals = input.depreciation.postedJournalCount == null
    ? postedAssets
    : Math.max(0, Math.floor(input.depreciation.postedJournalCount));

  if (activeAssets === 0) {
    items.push({
      code: 'depreciation_posted',
      label: 'Posting penyusutan aset tetap bulanan',
      status: 'pass',
      detail: 'Tidak ada aset tetap aktif yang memerlukan penyusutan pada periode ini.',
      blockingCount: 0,
    });
  } else if (postedAssets >= activeAssets && postedJournals > 0) {
    items.push({
      code: 'depreciation_posted',
      label: 'Posting penyusutan aset tetap bulanan',
      status: 'pass',
      detail: `Penyusutan untuk seluruh ${activeAssets} aset tetap aktif telah diposting ke buku besar.`,
      blockingCount: 0,
    });
  } else {
    const unpostedCount = Math.max(1, activeAssets - postedAssets);
    items.push({
      code: 'depreciation_posted',
      label: 'Posting penyusutan aset tetap bulanan',
      status: 'block',
      detail: `${unpostedCount} dari ${activeAssets} aset tetap aktif belum diposting penyusutannya.`,
      blockingCount: unpostedCount,
    });
  }

  // 5. opex_vs_plan_reviewed
  const planAmount = Math.max(0, toRupiah(input.opexVsPlan.planAmount));
  const realizedAmount = Math.max(0, toRupiah(input.opexVsPlan.realizedAmount));
  const varianceAmount = realizedAmount - planAmount;
  const variancePct = planAmount > 0 ? round2((varianceAmount / planAmount) * 100) : null;

  if (input.opexVsPlan.reviewed === false) {
    items.push({
      code: 'opex_vs_plan_reviewed',
      label: 'Tinjauan realisasi opex vs rencana bulanan',
      status: 'block',
      detail: `Varians opex (${formatRupiahLabel(realizedAmount)} vs rencana ${formatRupiahLabel(planAmount)}) belum ditinjau.`,
      blockingCount: 1,
    });
  } else if (planAmount === 0) {
    items.push({
      code: 'opex_vs_plan_reviewed',
      label: 'Tinjauan realisasi opex vs rencana bulanan',
      status: 'warn',
      detail: `Rencana opex bulanan belum diisi (realisasi ${formatRupiahLabel(realizedAmount)}, varians ${formatRupiahLabel(varianceAmount)}).`,
      blockingCount: 0,
    });
  } else {
    const signLabel = varianceAmount > 0 ? `lebih tinggi ${formatRupiahLabel(varianceAmount)}` : `hemat ${formatRupiahLabel(Math.abs(varianceAmount))}`;
    items.push({
      code: 'opex_vs_plan_reviewed',
      label: 'Tinjauan realisasi opex vs rencana bulanan',
      status: 'pass',
      detail: `Realisasi opex ${formatRupiahLabel(realizedAmount)} vs rencana ${formatRupiahLabel(planAmount)} (${signLabel}, ${variancePct}%).`,
      blockingCount: 0,
    });
  }

  // 6. zero_needs_review
  const needsReviewCount = Math.max(0, Math.floor(input.needsReviewCount));
  if (needsReviewCount === 0) {
    items.push({
      code: 'zero_needs_review',
      label: 'Nol baris jurnal berstatus needs_review',
      status: 'pass',
      detail: 'Seluruh baris jurnal pada periode ini sudah terverifikasi (0 needs_review).',
      blockingCount: 0,
    });
  } else {
    items.push({
      code: 'zero_needs_review',
      label: 'Nol baris jurnal berstatus needs_review',
      status: 'block',
      detail: `Masih terdapat ${needsReviewCount} baris jurnal berstatus needs_review = true pada periode ${periodYm}.`,
      blockingCount: needsReviewCount,
    });
  }

  const passCount = items.filter((i) => i.status === 'pass').length;
  const warnCount = items.filter((i) => i.status === 'warn').length;
  const blockCount = items.filter((i) => i.status === 'block').length;
  const totalBlockingCount = items.reduce((acc, i) => acc + i.blockingCount, 0);

  return {
    periodMonth: periodYm,
    readyToClose: blockCount === 0,
    items,
    opexVariance: {
      planAmount,
      realizedAmount,
      varianceAmount,
      variancePct,
    },
    summary: {
      totalChecks: 6,
      passCount,
      warnCount,
      blockCount,
      totalBlockingCount,
    },
    provenance: {
      periodMonth: periodYm,
      periodStart,
      asOfDate: input.asOfDate ?? null,
      checklistVersion: 'deterministic_month_close_v1',
      sourceCounts: {
        receiptRequiredCount: requiredReceipts,
        receiptAttachedCount: attachedReceipts,
        walletCount: wallets.length,
        activeAssetCount: activeAssets,
        postedAssetCount: postedAssets,
        needsReviewCount,
      },
    },
  };
}
