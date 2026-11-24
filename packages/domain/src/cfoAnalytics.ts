import {
  analyzeProjectMargin,
  type ProjectMarginInput,
  type ProjectMarginResult,
} from './financialAdvisor';
import { toRupiah } from './journal';
import {
  computeAgingSchedule,
  type AgingItemInput,
  type AgingScheduleResult,
} from './proactiveFinance';
import { computeDeterministicSha256 } from './receiptExtraction';
import { normalizePeriodMonth } from './revenueRecognition';

export const CFO_ANALYTICS_DISCLAIMER = 'Bukan nasihat hukum/pajak berlisensi' as const;

const DEFAULT_SIGNIFICANT_VARIANCE_PCT = 10;

const ID_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export type CfoProvenance = {
  source: string;
  period: string;
  asOfDate: string;
  lockedPeriodMonth: string | null;
  assumptions: string[];
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function formatRupiahLabel(amount: number): string {
  const integer = toRupiah(amount);
  const absFormatted = Math.abs(integer)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return integer < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

function validateYmd(ymd: string, fieldName = 'tanggal'): string {
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
  return raw;
}

function getMonthLastDayYmd(normalizedMonthStart: string): string {
  const year = Number(normalizedMonthStart.slice(0, 4));
  const month = Number(normalizedMonthStart.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${normalizedMonthStart.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

function formatMonthLabelId(monthYm: string): string {
  const year = monthYm.slice(0, 4);
  const monthIdx = Number(monthYm.slice(5, 7)) - 1;
  const monthName = ID_MONTH_NAMES[monthIdx] ?? monthYm.slice(5, 7);
  return `${monthName} ${year}`;
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function canonicalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => canonicalizeValue(item));

  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const val = record[key];
    if (val !== undefined) {
      sorted[key] = canonicalizeValue(val);
    }
  }
  return sorted;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalizeValue(value));
}

// ============================================================================
// 1. Anggaran vs Aktual (Bulanan & Tahunan, Opex & Proyek)
// ============================================================================

export type BudgetGranularity = 'monthly' | 'annual';
export type BudgetVarianceStatus = 'under_budget' | 'on_track' | 'over_budget';

export type BudgetLineItemInput = {
  id: string;
  name: string;
  category?: string | null;
  budget: number;
  actual: number;
  periodMonth?: string | null;
  entryDate?: string | null;
};

export type BudgetVsActualInput = {
  periodLabel: string;
  granularity: BudgetGranularity;
  opexItems: BudgetLineItemInput[];
  projectItems: BudgetLineItemInput[];
  significantThresholdPct?: number;
  asOfDate?: string;
  lockedPeriodMonth?: string | null;
  sourceLabel?: string;
};

export type BudgetLineItemResult = {
  id: string;
  name: string;
  category: string | null;
  group: 'opex' | 'project';
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: BudgetVarianceStatus;
  isSignificantVariance: boolean;
  explanation: string | null;
};

export type BudgetSectionSummary = {
  budget: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: BudgetVarianceStatus;
  isSignificantVariance: boolean;
  explanation: string | null;
};

export type BudgetVsActualResult = {
  periodLabel: string;
  granularity: BudgetGranularity;
  significantThresholdPct: number;
  opexItems: BudgetLineItemResult[];
  projectItems: BudgetLineItemResult[];
  opexSummary: BudgetSectionSummary;
  projectSummary: BudgetSectionSummary;
  overallSummary: BudgetSectionSummary;
  significantVariances: BudgetLineItemResult[];
  assumptions: string[];
  provenance: CfoProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

function evaluateBudgetRow(params: {
  label: string;
  budget: number;
  actual: number;
  periodLabel: string;
  granularity: BudgetGranularity;
  thresholdPct: number;
}): BudgetSectionSummary {
  const budget = toRupiah(params.budget);
  const actual = toRupiah(params.actual);
  const variance = toRupiah(actual - budget);
  const variancePct = budget > 0
    ? round2((variance / budget) * 100)
    : variance > 0
      ? 100
      : variance < 0
        ? -100
        : 0;

  const isSignificantVariance = Math.abs(variancePct) >= params.thresholdPct;
  let status: BudgetVarianceStatus = 'on_track';
  if (variancePct >= params.thresholdPct || (budget === 0 && actual > 0)) {
    status = 'over_budget';
  } else if (variancePct <= -params.thresholdPct) {
    status = 'under_budget';
  }

  const granularityLabel = params.granularity === 'annual' ? 'tahunan' : 'bulanan';
  let explanation: string | null = null;
  if (isSignificantVariance) {
    if (status === 'over_budget') {
      explanation = `${params.label} melebihi anggaran sebesar ${formatRupiahLabel(variance)} (+${variancePct}%) pada periode ${params.periodLabel} (${granularityLabel}); perlu pengendalian biaya.`;
    } else {
      explanation = `${params.label} lebih rendah ${formatRupiahLabel(Math.abs(variance))} (${variancePct}%) dari anggaran pada periode ${params.periodLabel} (${granularityLabel}); pastikan tidak ada biaya tertunda yang belum dicatat.`;
    }
  }

  return {
    budget,
    actual,
    variance,
    variancePct,
    status,
    isSignificantVariance,
    explanation,
  };
}

function normalizeBudgetItems(
  items: BudgetLineItemInput[],
  group: 'opex' | 'project',
  periodLabel: string,
  granularity: BudgetGranularity,
  thresholdPct: number,
): BudgetLineItemResult[] {
  return [...items]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((item) => {
      const id = String(item.id ?? '').trim();
      if (!id) throw new Error(`Item anggaran ${group} wajib memiliki id`);
      const name = String(item.name ?? '').trim() || id;
      const evaluated = evaluateBudgetRow({
        label: name,
        budget: item.budget,
        actual: item.actual,
        periodLabel,
        granularity,
        thresholdPct,
      });
      return {
        id,
        name,
        category: item.category ?? null,
        group,
        ...evaluated,
      };
    });
}

function summarizeBudgetGroup(
  label: string,
  rows: BudgetLineItemResult[],
  periodLabel: string,
  granularity: BudgetGranularity,
  thresholdPct: number,
): BudgetSectionSummary {
  const budget = toRupiah(rows.reduce((sum, r) => sum + r.budget, 0));
  const actual = toRupiah(rows.reduce((sum, r) => sum + r.actual, 0));
  return evaluateBudgetRow({
    label,
    budget,
    actual,
    periodLabel,
    granularity,
    thresholdPct,
  });
}

/**
 * Menghitung perbandingan Anggaran vs Aktual secara deterministik (bulanan/tahunan)
 * untuk pos Opex dan Proyek, termasuk klasifikasi status & penjelasan varians >= 10%.
 */
export function computeBudgetVsActual(input: BudgetVsActualInput): BudgetVsActualResult {
  const periodLabel = String(input.periodLabel ?? '').trim();
  if (!periodLabel) {
    throw new Error('periodLabel wajib diisi');
  }
  if (input.granularity !== 'monthly' && input.granularity !== 'annual') {
    throw new Error(`Granularity tidak valid: ${String(input.granularity)}`);
  }

  const thresholdPct = Number.isFinite(input.significantThresholdPct)
    ? Math.max(0.01, Number(input.significantThresholdPct))
    : DEFAULT_SIGNIFICANT_VARIANCE_PCT;
  const lockedMonth = input.lockedPeriodMonth ? normalizePeriodMonth(input.lockedPeriodMonth) : null;
  const asOfDate = input.asOfDate
    ? validateYmd(input.asOfDate, 'asOfDate')
    : lockedMonth
      ? getMonthLastDayYmd(lockedMonth)
      : '1970-01-01';

  const opexItems = normalizeBudgetItems(
    input.opexItems ?? [],
    'opex',
    periodLabel,
    input.granularity,
    thresholdPct,
  );
  const projectItems = normalizeBudgetItems(
    input.projectItems ?? [],
    'project',
    periodLabel,
    input.granularity,
    thresholdPct,
  );

  const opexSummary = summarizeBudgetGroup(
    'Total Beban Operasional (Opex)',
    opexItems,
    periodLabel,
    input.granularity,
    thresholdPct,
  );
  const projectSummary = summarizeBudgetGroup(
    'Total Biaya Proyek',
    projectItems,
    periodLabel,
    input.granularity,
    thresholdPct,
  );
  const overallSummary = summarizeBudgetGroup(
    'Total Anggaran Keseluruhan',
    [...opexItems, ...projectItems],
    periodLabel,
    input.granularity,
    thresholdPct,
  );

  const significantVariances = [...opexItems, ...projectItems]
    .filter((item) => item.isSignificantVariance)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance) || a.id.localeCompare(b.id));

  const assumptions = [
    `Granularitas evaluasi: ${input.granularity === 'annual' ? 'tahunan' : 'bulanan'} (${periodLabel}).`,
    `Varians = Aktual - Anggaran; ambang batas varians signifikan = |variancePct| >= ${thresholdPct}%.`,
    'Bila anggaran = Rp 0 dan aktual > Rp 0, variancePct ditetapkan +100% (over_budget).',
  ];

  return {
    periodLabel,
    granularity: input.granularity,
    significantThresholdPct: thresholdPct,
    opexItems,
    projectItems,
    opexSummary,
    projectSummary,
    overallSummary,
    significantVariances,
    assumptions,
    provenance: {
      source: input.sourceLabel ?? 'buku_besar_anggaran_opex_proyek',
      period: periodLabel,
      asOfDate,
      lockedPeriodMonth: lockedMonth,
      assumptions,
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

// ============================================================================
// 2. KPI CFO Wajib (Deterministik & Anti-NaN / Anti-Infinity)
// ============================================================================

export type ClientRevenueShareInput = {
  clientId: string;
  clientName?: string | null;
  revenue: number;
};

export type CfoKpisInput = {
  periodLabel: string;
  periodDays?: number;
  cashAndBank: number;
  receivables: number;
  payables: number;
  shortTermDebt?: number;
  revenue: number;
  hpp: number;
  opex: number;
  otherExpense?: number;
  netProfit?: number;
  monthlyBurnRate?: number;
  revenueByClient?: ClientRevenueShareInput[];
  billedHours?: number;
  availableHours?: number;
  activeProjectsCount?: number;
  teamProjectCapacity?: number;
  asOfDate?: string;
  lockedPeriodMonth?: string | null;
  sourceLabel?: string;
};

export type CfoKpisResult = {
  periodLabel: string;
  periodDays: number;
  cashAndBank: number;
  shortTermObligations: number;
  netCash: number;
  monthlyBurnRate: number;
  runwayMonths: number | null;
  runwayLabel: string;
  revenue: number;
  hpp: number;
  grossProfit: number;
  opex: number;
  otherExpense: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
  receivables: number;
  payables: number;
  dsoDays: number;
  dpoDays: number;
  receivableToRevenueRatioPct: number;
  clientConcentrationTop1Pct: number;
  clientConcentrationTop3Pct: number;
  teamUtilizationPct: number;
  assumptions: string[];
  provenance: CfoProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

/**
 * Menghitung seluruh KPI CFO wajib secara deterministik dengan nominal integer rupiah
 * dan perlindungan pembagian nol (tanpa NaN/Infinity).
 */
export function computeCfoKpis(input: CfoKpisInput): CfoKpisResult {
  const periodLabel = String(input.periodLabel ?? '').trim();
  if (!periodLabel) throw new Error('periodLabel wajib diisi');

  const periodDays = Math.max(1, Math.trunc(Number(input.periodDays ?? 30) || 30));
  const cashAndBank = toRupiah(input.cashAndBank);
  const receivables = Math.max(0, toRupiah(input.receivables));
  const payables = Math.max(0, toRupiah(input.payables));
  const shortTermDebt = Math.max(0, toRupiah(input.shortTermDebt ?? 0));
  const shortTermObligations = toRupiah(payables + shortTermDebt);
  const netCash = toRupiah(cashAndBank - shortTermObligations);

  const revenue = Math.max(0, toRupiah(input.revenue));
  const hpp = Math.max(0, toRupiah(input.hpp));
  const opex = Math.max(0, toRupiah(input.opex));
  const otherExpense = Math.max(0, toRupiah(input.otherExpense ?? 0));
  const grossProfit = toRupiah(revenue - hpp);
  const netProfit = input.netProfit != null
    ? toRupiah(input.netProfit)
    : toRupiah(revenue - hpp - opex - otherExpense);

  const monthlyBurnRate = input.monthlyBurnRate != null
    ? Math.max(0, toRupiah(input.monthlyBurnRate))
    : toRupiah((opex * 30) / periodDays);

  let runwayMonths: number | null = null;
  let runwayLabel = 'Aman (burn <= 0)';
  if (monthlyBurnRate > 0) {
    runwayMonths = cashAndBank <= 0 ? 0 : round2(cashAndBank / monthlyBurnRate);
    runwayLabel = `${runwayMonths} bulan`;
  }

  const grossMarginPct = revenue > 0 ? round2((grossProfit / revenue) * 100) : 0;
  const netMarginPct = revenue > 0 ? round2((netProfit / revenue) * 100) : 0;
  const dsoDays = revenue > 0 ? round2((receivables / revenue) * periodDays) : 0;
  const dpoDays = hpp > 0 ? round2((payables / Math.max(hpp, 1)) * periodDays) : 0;
  const receivableToRevenueRatioPct = revenue > 0 ? round2((receivables / revenue) * 100) : 0;

  // Konsentrasi klien Top 1 & Top 3
  const clientTotals = new Map<string, number>();
  for (const row of input.revenueByClient ?? []) {
    const id = String(row.clientId ?? '').trim();
    if (!id) continue;
    const rev = Math.max(0, toRupiah(row.revenue));
    clientTotals.set(id, (clientTotals.get(id) ?? 0) + rev);
  }
  const sortedClients = [...clientTotals.entries()]
    .map(([clientId, rev]) => ({ clientId, rev }))
    .sort((a, b) => b.rev - a.rev || a.clientId.localeCompare(b.clientId));
  const clientSum = sortedClients.reduce((sum, c) => sum + c.rev, 0);
  const concentrationDenom = revenue > 0 ? revenue : clientSum;

  const clientConcentrationTop1Pct = concentrationDenom > 0 && sortedClients.length > 0
    ? round2(Math.min(100, (sortedClients[0].rev / concentrationDenom) * 100))
    : 0;
  const top3Sum = sortedClients.slice(0, 3).reduce((sum, c) => sum + c.rev, 0);
  const clientConcentrationTop3Pct = concentrationDenom > 0 && sortedClients.length > 0
    ? round2(Math.min(100, (top3Sum / concentrationDenom) * 100))
    : 0;

  // Utilisasi tim: prioritas jam tertagih vs kapasitas proyek aktif
  let teamUtilizationPct = 0;
  let utilizationBasis = 'Data jam atau kapasitas proyek belum tersedia (ditetapkan 0%).';
  if (input.availableHours != null && input.availableHours > 0) {
    const billed = Math.max(0, Number(input.billedHours ?? 0) || 0);
    teamUtilizationPct = round2((billed / input.availableHours) * 100);
    utilizationBasis = `Utilisasi tim berbasis jam: ${billed}/${input.availableHours} jam tersedia.`;
  } else if (input.teamProjectCapacity != null && input.teamProjectCapacity > 0) {
    const active = Math.max(0, Number(input.activeProjectsCount ?? 0) || 0);
    teamUtilizationPct = round2((active / input.teamProjectCapacity) * 100);
    utilizationBasis = `Utilisasi tim berbasis kapasitas proyek: ${active}/${input.teamProjectCapacity} proyek aktif.`;
  }

  const lockedMonth = input.lockedPeriodMonth ? normalizePeriodMonth(input.lockedPeriodMonth) : null;
  const asOfDate = input.asOfDate
    ? validateYmd(input.asOfDate, 'asOfDate')
    : lockedMonth
      ? getMonthLastDayYmd(lockedMonth)
      : '1970-01-01';

  const assumptions = [
    `netCash = kas & bank (${formatRupiahLabel(cashAndBank)}) - kewajiban jangka pendek (${formatRupiahLabel(shortTermObligations)} = hutang ${formatRupiahLabel(payables)} + pinjaman jangka pendek ${formatRupiahLabel(shortTermDebt)}).`,
    monthlyBurnRate > 0
      ? `runwayMonths = kas & bank / burn opex bulanan (${formatRupiahLabel(monthlyBurnRate)}/bulan).`
      : 'runwayMonths bernilai null dengan label aman karena burn opex bulanan <= Rp 0.',
    `DSO = (piutang / pendapatan) × ${periodDays} hari; DPO = (hutang / max(HPP, 1)) × ${periodDays} hari.`,
    revenue === 0
      ? 'Pendapatan periode = Rp 0; grossMarginPct, netMarginPct, DSO, dan rasio piutang/pendapatan diamankan ke 0.'
      : `Basis periode pendapatan ${periodDays} hari (${periodLabel}).`,
    utilizationBasis,
  ];

  return {
    periodLabel,
    periodDays,
    cashAndBank,
    shortTermObligations,
    netCash,
    monthlyBurnRate,
    runwayMonths,
    runwayLabel,
    revenue,
    hpp,
    grossProfit,
    opex,
    otherExpense,
    netProfit,
    grossMarginPct,
    netMarginPct,
    receivables,
    payables,
    dsoDays,
    dpoDays,
    receivableToRevenueRatioPct,
    clientConcentrationTop1Pct,
    clientConcentrationTop3Pct,
    teamUtilizationPct,
    assumptions,
    provenance: {
      source: input.sourceLabel ?? 'buku_besar_neraca_laba_rugi_proyek',
      period: periodLabel,
      asOfDate,
      lockedPeriodMonth: lockedMonth,
      assumptions,
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

// ============================================================================
// 3. Simulasi Perbandingan Kebijakan Dividen 2 Mode (Per Proyek vs Per Bisnis)
// ============================================================================

export type DividendProjectPoolInput = {
  projectId: string;
  projectName: string;
  received: number;
  spent: number;
  totalPiutang?: number;
  ownerPiutang?: number;
  contractValue?: number;
  alreadyPaidDividend?: number;
  isClosed?: boolean;
};

export type DividendPolicyComparisonInput = {
  periodLabel: string;
  availableCash: number;
  monthlyOpexPlan: number;
  opexReserveMultiplier?: number;
  labaDitahan: number;
  alreadyPaidBusinessDividend?: number;
  requestedDividendAmount?: number;
  projects: DividendProjectPoolInput[];
  asOfDate?: string;
  lockedPeriodMonth?: string | null;
  sourceLabel?: string;
};

export type ProjectDividendPoolDetail = {
  projectId: string;
  projectName: string;
  isClosed: boolean;
  theoreticalPool: number;
  recommendedPayout: number;
};

export type DividendPolicyComparisonResult = {
  periodLabel: string;
  availableCash: number;
  monthlyOpexPlan: number;
  opexReserveMultiplier: number;
  opexReserve: number;
  cashAfterReserve: number;
  perProjectMode: {
    theoreticalTotalPool: number;
    maxDistributable: number;
    recommendedPayout: number;
    cashRemainingAfterPayout: number;
    blockedReason: string | null;
    projects: ProjectDividendPoolDetail[];
  };
  perBusinessMode: {
    labaDitahan: number;
    retainedEarningsAvailable: number;
    maxDistributable: number;
    recommendedPayout: number;
    cashRemainingAfterPayout: number;
    blockedReason: string | null;
  };
  recommendation: {
    recommendedMode: 'per_proyek' | 'per_bisnis' | 'hold';
    recommendedAmount: number;
    liquidityStatus: 'aman' | 'ketat' | 'terbatas';
    reasons: string[];
  };
  assumptions: string[];
  provenance: CfoProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
};

function allocateRupiahProportionally(
  items: { id: string; weight: number }[],
  targetTotal: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) result.set(item.id, 0);
  if (targetTotal <= 0 || items.length === 0) return result;

  const positive = items.filter((item) => item.weight > 0);
  const weightSum = positive.reduce((s, item) => s + item.weight, 0);
  if (weightSum <= 0) return result;

  let allocated = 0;
  const remainders: { id: string; frac: number }[] = [];
  for (const item of positive) {
    const exact = (targetTotal * item.weight) / weightSum;
    const floored = Math.floor(exact);
    result.set(item.id, floored);
    allocated += floored;
    remainders.push({ id: item.id, frac: exact - floored });
  }

  let leftover = targetTotal - allocated;
  remainders.sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id));
  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    const id = remainders[i].id;
    result.set(id, (result.get(id) ?? 0) + 1);
    leftover -= 1;
  }

  return result;
}

/**
 * Membandingkan kebijakan dividen mode PER PROYEK vs PER BISNIS di bawah batasan
 * kas tersedia, cadangan opex (`opexReserveMultiplier * monthlyOpexPlan`), dan saldo laba ditahan.
 * Tidak pernah melanggar batas kas tersedia maupun cadangan opex.
 */
export function simulateDividendPolicyComparison(
  input: DividendPolicyComparisonInput,
): DividendPolicyComparisonResult {
  const periodLabel = String(input.periodLabel ?? '').trim();
  if (!periodLabel) throw new Error('periodLabel wajib diisi');

  const availableCash = Math.max(0, toRupiah(input.availableCash));
  const monthlyOpexPlan = Math.max(0, toRupiah(input.monthlyOpexPlan));
  const multiplier = Number.isFinite(input.opexReserveMultiplier)
    ? Math.max(0, Number(input.opexReserveMultiplier))
    : 1;
  const opexReserve = toRupiah(monthlyOpexPlan * multiplier);
  const cashAfterReserve = toRupiah(Math.max(0, availableCash - opexReserve));

  const labaDitahan = toRupiah(input.labaDitahan);
  const alreadyPaidBusiness = Math.max(0, toRupiah(input.alreadyPaidBusinessDividend ?? 0));
  const retainedEarningsAvailable = toRupiah(Math.max(0, labaDitahan - alreadyPaidBusiness));

  const sortedProjects = [...(input.projects ?? [])].sort((a, b) =>
    String(a.projectId).localeCompare(String(b.projectId)),
  );

  const projectPools = sortedProjects.map((p) => {
    const received = Math.max(0, toRupiah(p.received));
    const spent = Math.max(0, toRupiah(p.spent));
    const contractValue = p.contractValue != null ? Math.max(0, toRupiah(p.contractValue)) : received;
    const totalPiutang = Math.max(0, toRupiah(p.totalPiutang ?? 0));
    const ownerPiutang = Math.max(0, toRupiah(p.ownerPiutang ?? 0));
    const alreadyPaid = Math.max(0, toRupiah(p.alreadyPaidDividend ?? 0));

    const expectedRemaining = Math.max(0, contractValue - received);
    const extraPiutang = Math.max(0, totalPiutang - expectedRemaining);
    const ownerExtra = Math.min(extraPiutang, ownerPiutang);
    const cashPool = received - spent - extraPiutang + ownerExtra;
    const theoreticalPool = Math.max(0, toRupiah(cashPool - alreadyPaid));

    return {
      projectId: String(p.projectId),
      projectName: String(p.projectName || p.projectId),
      isClosed: Boolean(p.isClosed),
      theoreticalPool,
    };
  });

  const theoreticalTotalPool = toRupiah(
    projectPools.reduce((sum, p) => sum + p.theoreticalPool, 0),
  );
  const projectMaxDistributable = toRupiah(Math.min(theoreticalTotalPool, cashAfterReserve));
  const requested = input.requestedDividendAmount != null
    ? Math.max(0, toRupiah(input.requestedDividendAmount))
    : null;

  const projectRecommendedPayout = requested != null
    ? Math.min(requested, projectMaxDistributable)
    : projectMaxDistributable;

  const perProjectAllocations = allocateRupiahProportionally(
    projectPools.map((p) => ({ id: p.projectId, weight: p.theoreticalPool })),
    projectRecommendedPayout,
  );

  const projectDetails: ProjectDividendPoolDetail[] = projectPools.map((p) => ({
    ...p,
    recommendedPayout: perProjectAllocations.get(p.projectId) ?? 0,
  }));

  let projectBlockedReason: string | null = null;
  if (cashAfterReserve <= 0) {
    projectBlockedReason = 'Kas tersedia tidak melebihi cadangan opex wajib.';
  } else if (theoreticalTotalPool <= 0) {
    projectBlockedReason = 'Belum ada pool kas bersih proyek yang dapat dibagikan.';
  } else if (requested != null && requested > projectMaxDistributable) {
    projectBlockedReason = `Permintaan dividen melebihi batas kas aman setelah cadangan opex (${formatRupiahLabel(projectMaxDistributable)}).`;
  }

  // Per Bisnis Mode
  const businessMaxDistributable = toRupiah(Math.min(cashAfterReserve, retainedEarningsAvailable));
  const businessRecommendedPayout = requested != null
    ? Math.min(requested, businessMaxDistributable)
    : businessMaxDistributable;

  let businessBlockedReason: string | null = null;
  if (cashAfterReserve <= 0) {
    businessBlockedReason = 'Kas tersedia tidak melebihi cadangan opex wajib.';
  } else if (retainedEarningsAvailable <= 0) {
    businessBlockedReason = 'Saldo laba ditahan tersedia tidak mencukupi.';
  } else if (requested != null && requested > businessMaxDistributable) {
    businessBlockedReason = `Permintaan dividen melebihi batas kas & laba ditahan (${formatRupiahLabel(businessMaxDistributable)}).`;
  }

  // Rekomendasi berbasis likuiditas
  let liquidityStatus: 'aman' | 'ketat' | 'terbatas' = 'aman';
  if (cashAfterReserve <= 0) {
    liquidityStatus = 'terbatas';
  } else if (cashAfterReserve < opexReserve) {
    liquidityStatus = 'ketat';
  }

  let recommendedMode: 'per_proyek' | 'per_bisnis' | 'hold' = 'hold';
  let recommendedAmount = 0;
  const reasons: string[] = [];

  if (cashAfterReserve <= 0 || (businessMaxDistributable <= 0 && projectMaxDistributable <= 0)) {
    recommendedMode = 'hold';
    recommendedAmount = 0;
    reasons.push(
      `Likuiditas terbatas: kas setelah cadangan opex (${formatRupiahLabel(opexReserve)}) sebesar ${formatRupiahLabel(cashAfterReserve)}; disarankan menahan dividen.`,
    );
  } else if (businessMaxDistributable > 0 && (liquidityStatus === 'ketat' || businessMaxDistributable <= projectMaxDistributable)) {
    recommendedMode = 'per_bisnis';
    recommendedAmount = businessRecommendedPayout;
    reasons.push(
      `Mode per bisnis lebih aman secara likuiditas karena mempertimbangkan laba ditahan (${formatRupiahLabel(retainedEarningsAvailable)}) dan beban opex perusahaan setelah cadangan ${formatRupiahLabel(opexReserve)}.`,
    );
  } else if (projectMaxDistributable > 0 && businessMaxDistributable <= 0) {
    recommendedMode = 'per_proyek';
    recommendedAmount = projectRecommendedPayout;
    reasons.push(
      `Laba ditahan bisnis belum positif, namun pool proyek bersih tersedia (${formatRupiahLabel(projectMaxDistributable)}) dengan tetap menjaga cadangan opex ${formatRupiahLabel(opexReserve)}.`,
    );
  } else {
    recommendedMode = 'per_bisnis';
    recommendedAmount = businessRecommendedPayout;
    reasons.push(
      `Likuiditas ${liquidityStatus}; mode per bisnis menjaga konsistensi ekuitas laba ditahan dan menyisakan kas minimal ${formatRupiahLabel(opexReserve)}.`,
    );
  }

  const lockedMonth = input.lockedPeriodMonth ? normalizePeriodMonth(input.lockedPeriodMonth) : null;
  const asOfDate = input.asOfDate
    ? validateYmd(input.asOfDate, 'asOfDate')
    : lockedMonth
      ? getMonthLastDayYmd(lockedMonth)
      : '1970-01-01';

  const assumptions = [
    `Cadangan opex = ${multiplier} × ${formatRupiahLabel(monthlyOpexPlan)} = ${formatRupiahLabel(opexReserve)}.`,
    `Kas bebas untuk dividen = max(0, kas tersedia ${formatRupiahLabel(availableCash)} - cadangan opex ${formatRupiahLabel(opexReserve)}) = ${formatRupiahLabel(cashAfterReserve)}.`,
    'Kedua mode dibatasi ketat oleh cashAfterReserve sehingga cadangan opex dan kas tersedia tidak pernah dilanggar.',
  ];

  return {
    periodLabel,
    availableCash,
    monthlyOpexPlan,
    opexReserveMultiplier: multiplier,
    opexReserve,
    cashAfterReserve,
    perProjectMode: {
      theoreticalTotalPool,
      maxDistributable: projectMaxDistributable,
      recommendedPayout: projectRecommendedPayout,
      cashRemainingAfterPayout: toRupiah(availableCash - projectRecommendedPayout),
      blockedReason: projectBlockedReason,
      projects: projectDetails,
    },
    perBusinessMode: {
      labaDitahan,
      retainedEarningsAvailable,
      maxDistributable: businessMaxDistributable,
      recommendedPayout: businessRecommendedPayout,
      cashRemainingAfterPayout: toRupiah(availableCash - businessRecommendedPayout),
      blockedReason: businessBlockedReason,
    },
    recommendation: {
      recommendedMode,
      recommendedAmount,
      liquidityStatus,
      reasons,
    },
    assumptions,
    provenance: {
      source: input.sourceLabel ?? 'buku_besar_kas_laba_ditahan_proyek',
      period: periodLabel,
      asOfDate,
      lockedPeriodMonth: lockedMonth,
      assumptions,
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };
}

// ============================================================================
// 4. Laporan Bulanan Bergaya Direksi (1 Halaman Eksekutif + Lampiran + PDF HTML)
// ============================================================================

export type BoardLedgerEntryKind =
  | 'revenue'
  | 'hpp'
  | 'opex'
  | 'other_expense'
  | 'cash_in'
  | 'cash_out';

export type BoardLedgerEntryInput = {
  id: string;
  entryDate: string;
  kind: BoardLedgerEntryKind;
  amount: number;
  category?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  budgetItemId?: string | null;
};

export type BoardDatedAgingItemInput = AgingItemInput & {
  issuedDate?: string | null;
};

export type BoardMonthlyReportInput = {
  orgName: string;
  periodMonth: string;
  periodLabel?: string;
  lockedPeriodMonth?: string | null;
  asOfDate?: string;
  periodDays?: number;
  openingCash: number;
  shortTermDebt?: number;
  monthlyOpexPlan: number;
  opexReserveMultiplier?: number;
  labaDitahan: number;
  alreadyPaidBusinessDividend?: number;
  requestedDividendAmount?: number;
  /** Bila ledgerEntries diberikan, pendapatan/hpp/opex/kas & realisasi disaring ketat sesuai periode */
  ledgerEntries?: BoardLedgerEntryInput[];
  /** Nilai fallback bila ledgerEntries tidak diberikan */
  revenue?: number;
  hpp?: number;
  opex?: number;
  otherExpense?: number;
  cashAndBank?: number;
  revenueByClient?: ClientRevenueShareInput[];
  opexBudgetItems: BudgetLineItemInput[];
  projectBudgetItems: BudgetLineItemInput[];
  receivables: BoardDatedAgingItemInput[];
  payables: BoardDatedAgingItemInput[];
  projectMargins?: ProjectMarginInput[];
  dividendProjects?: DividendProjectPoolInput[];
  billedHours?: number;
  availableHours?: number;
  activeProjectsCount?: number;
  teamProjectCapacity?: number;
  sourceLabel?: string;
};

export type BoardRiskItem = {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  metricValue: string;
};

export type BoardDecisionItem = {
  id: string;
  priority: 'urgent' | 'normal';
  title: string;
  recommendation: string;
  impactSummary: string;
};

export type BoardMonthlyReport = {
  orgName: string;
  periodMonth: string;
  periodLabel: string;
  lockedPeriodMonth: string | null;
  isLockedPeriod: boolean;
  asOfDate: string;
  pageOne: {
    executiveSummary: {
      headline: string;
      summaryPoints: string[];
      revenue: number;
      hpp: number;
      grossProfit: number;
      opex: number;
      otherExpense: number;
      netProfit: number;
      endingCash: number;
    };
    kpis: CfoKpisResult;
    topRisks: BoardRiskItem[];
    decisionsRequired: BoardDecisionItem[];
    dividendPolicySummary: DividendPolicyComparisonResult;
  };
  appendix: {
    budgetVsActual: BudgetVsActualResult;
    projectMargins: ProjectMarginResult[];
    agingSummary: {
      receivables: AgingScheduleResult;
      payables: AgingScheduleResult;
    };
  };
  periodIntegrity: {
    lockedPeriodMonth: string | null;
    cutoffDate: string;
    includedEntryCount: number;
    excludedOutOfPeriodCount: number;
  };
  provenance: CfoProvenance;
  disclaimer: typeof CFO_ANALYTICS_DISCLAIMER;
  deterministicHash: string;
};

function filterDatedBudgetItems(
  items: BudgetLineItemInput[],
  targetYm: string,
): BudgetLineItemInput[] {
  return items.filter((item) => {
    if (item.periodMonth) {
      return normalizePeriodMonth(item.periodMonth).slice(0, 7) === targetYm;
    }
    if (item.entryDate) {
      return validateYmd(item.entryDate, 'budget entryDate').slice(0, 7) === targetYm;
    }
    return true;
  });
}

function buildTopRisks(params: {
  kpis: CfoKpisResult;
  budgetVsActual: BudgetVsActualResult;
  receivablesAging: AgingScheduleResult;
  projectMargins: ProjectMarginResult[];
}): BoardRiskItem[] {
  const risks: BoardRiskItem[] = [];
  const { kpis, budgetVsActual, receivablesAging, projectMargins } = params;

  if (kpis.netCash < 0 || (kpis.runwayMonths !== null && kpis.runwayMonths < 3)) {
    risks.push({
      id: 'risk-liquidity',
      severity: kpis.netCash < 0 ? 'critical' : 'high',
      title: 'Tekanan Likuiditas & Runway Kas',
      detail: `Kas bersih ${formatRupiahLabel(kpis.netCash)} dengan runway ${kpis.runwayLabel}.`,
      metricValue: kpis.runwayLabel,
    });
  }

  if (kpis.netProfit < 0) {
    risks.push({
      id: 'risk-net-loss',
      severity: 'high',
      title: 'Rugi Bersih Periode Berjalan',
      detail: `Laba bersih tercatat ${formatRupiahLabel(kpis.netProfit)} (${kpis.netMarginPct}%).`,
      metricValue: formatRupiahLabel(kpis.netProfit),
    });
  }

  const topOverBudget = budgetVsActual.significantVariances.find(
    (v) => v.status === 'over_budget',
  );
  if (topOverBudget) {
    risks.push({
      id: `risk-budget-${topOverBudget.id}`,
      severity: topOverBudget.variancePct >= 20 ? 'high' : 'medium',
      title: `Over-Budget: ${topOverBudget.name}`,
      detail: topOverBudget.explanation ?? `Melebihi anggaran ${formatRupiahLabel(topOverBudget.variance)}.`,
      metricValue: `+${topOverBudget.variancePct}%`,
    });
  }

  if (receivablesAging.totalOverdue > 0) {
    risks.push({
      id: 'risk-receivable-overdue',
      severity: receivablesAging.buckets.over_90 > 0 ? 'high' : 'medium',
      title: 'Piutang Jatuh Tempo Belum Tertagih',
      detail: `Total piutang lewat jatuh tempo ${formatRupiahLabel(receivablesAging.totalOverdue)} (DSO ${kpis.dsoDays} hari).`,
      metricValue: formatRupiahLabel(receivablesAging.totalOverdue),
    });
  }

  if (kpis.clientConcentrationTop1Pct >= 50) {
    risks.push({
      id: 'risk-client-concentration',
      severity: 'medium',
      title: 'Konsentrasi Pendapatan Klien Tinggi',
      detail: `Klien terbesar menyumbang ${kpis.clientConcentrationTop1Pct}% dari pendapatan periode.`,
      metricValue: `${kpis.clientConcentrationTop1Pct}%`,
    });
  }

  const weakProject = [...projectMargins]
    .sort((a, b) => a.projectedMarginPct - b.projectedMarginPct || a.projectId.localeCompare(b.projectId))
    .find((p) => p.projectedFinalMargin < 0 || p.eac > p.contractValue);
  if (weakProject) {
    risks.push({
      id: `risk-project-${weakProject.projectId}`,
      severity: weakProject.projectedFinalMargin < 0 ? 'high' : 'medium',
      title: `Risiko Margin Proyek: ${weakProject.projectName}`,
      detail: `Proyeksi margin akhir ${formatRupiahLabel(weakProject.projectedFinalMargin)} (${weakProject.projectedMarginPct}%).`,
      metricValue: `${weakProject.projectedMarginPct}%`,
    });
  }

  if (risks.length === 0) {
    risks.push({
      id: 'risk-none-critical',
      severity: 'medium',
      title: 'Tidak Ada Risiko Kritis Terdeteksi',
      detail: 'Likuiditas, anggaran, dan penagihan berada dalam batas kendali normal periode ini.',
      metricValue: 'Terkendali',
    });
  }

  return risks.slice(0, 5);
}

function buildDecisionsRequired(params: {
  dividend: DividendPolicyComparisonResult;
  budgetVsActual: BudgetVsActualResult;
  receivablesAging: AgingScheduleResult;
  projectMargins: ProjectMarginResult[];
}): BoardDecisionItem[] {
  const decisions: BoardDecisionItem[] = [];
  const { dividend, budgetVsActual, receivablesAging, projectMargins } = params;

  decisions.push({
    id: 'decision-dividend-policy',
    priority: dividend.recommendation.recommendedMode === 'hold' ? 'urgent' : 'normal',
    title: 'Penetapan Kebijakan Dividen Periode',
    recommendation:
      dividend.recommendation.recommendedMode === 'hold'
        ? 'Tahan pembagian dividen untuk menjaga cadangan opex wajib.'
        : `Gunakan mode ${dividend.recommendation.recommendedMode === 'per_bisnis' ? 'Per Bisnis' : 'Per Proyek'} dengan batas maksimal ${formatRupiahLabel(dividend.recommendation.recommendedAmount)}.`,
    impactSummary: `Menyisakan cadangan opex minimal ${formatRupiahLabel(dividend.opexReserve)} dari kas ${formatRupiahLabel(dividend.availableCash)}.`,
  });

  const overBudgetItems = budgetVsActual.significantVariances.filter(
    (v) => v.status === 'over_budget',
  );
  if (overBudgetItems.length > 0) {
    decisions.push({
      id: 'decision-budget-control',
      priority: 'urgent',
      title: `Persetujuan Koreksi Anggaran (${overBudgetItems.length} pos over-budget)`,
      recommendation: `Tinjau ulang pengeluaran ${overBudgetItems[0].name} dan lakukan pembekuan pos non-kritis.`,
      impactSummary: `Total deviasi anggaran keseluruhan: ${formatRupiahLabel(budgetVsActual.overallSummary.variance)}.`,
    });
  }

  if (receivablesAging.totalOverdue > 0) {
    const topOverdueParty = receivablesAging.byParty.find((p) => p.totalOverdue > 0);
    decisions.push({
      id: 'decision-collection-escalation',
      priority: receivablesAging.buckets.over_90 > 0 ? 'urgent' : 'normal',
      title: 'Eskalasi Penagihan Piutang Jatuh Tempo',
      recommendation: topOverdueParty
        ? `Prioritaskan penagihan ke ${topOverdueParty.partyName} (${formatRupiahLabel(topOverdueParty.totalOverdue)} jatuh tempo).`
        : `Aktifkan pengingat penagihan piutang jatuh tempo.`,
      impactSummary: `Potensi tambahan kas masuk hingga ${formatRupiahLabel(receivablesAging.totalOverdue)}.`,
    });
  }

  const overEacProject = projectMargins.find((p) => p.eac > p.totalRap);
  if (overEacProject) {
    decisions.push({
      id: `decision-project-eac-${overEacProject.projectId}`,
      priority: 'normal',
      title: `Review RAP Proyek ${overEacProject.projectName}`,
      recommendation: `Evaluasi variasi biaya terbesar pada ${overEacProject.topVarianceDrivers[0]?.category ?? 'RAP proyek'}.`,
      impactSummary: `Proyeksi EAC ${formatRupiahLabel(overEacProject.eac)} vs RAP ${formatRupiahLabel(overEacProject.totalRap)}.`,
    });
  }

  return decisions.slice(0, 5);
}

/**
 * Menyusun laporan bulanan bergaya direksi (1 halaman eksekutif + lampiran)
 * dengan isolasi periode terkunci dan hash SHA-256 deterministik 100%.
 */
export function buildBoardMonthlyReport(input: BoardMonthlyReportInput): BoardMonthlyReport {
  const orgName = String(input.orgName ?? '').trim();
  if (!orgName) throw new Error('orgName wajib diisi');

  const normalizedPeriodMonth = normalizePeriodMonth(input.periodMonth);
  const lockedMonthNormalized = input.lockedPeriodMonth
    ? normalizePeriodMonth(input.lockedPeriodMonth)
    : null;
  const effectiveMonthStart = lockedMonthNormalized ?? normalizedPeriodMonth;
  const effectiveMonthYm = effectiveMonthStart.slice(0, 7);
  const cutoffDate = getMonthLastDayYmd(effectiveMonthStart);

  const rawAsOfDate = input.asOfDate ? validateYmd(input.asOfDate, 'asOfDate') : cutoffDate;
  const effectiveAsOfDate = lockedMonthNormalized && rawAsOfDate > cutoffDate
    ? cutoffDate
    : rawAsOfDate;

  const periodLabel = String(input.periodLabel ?? '').trim() || formatMonthLabelId(effectiveMonthYm);
  const periodDays = Math.max(1, Math.trunc(Number(input.periodDays ?? 30) || 30));

  // Isolasi transaksi buku besar berdasarkan periode target/terkunci
  let includedEntryCount = 0;
  let excludedOutOfPeriodCount = 0;

  let revenue = Math.max(0, toRupiah(input.revenue ?? 0));
  let hpp = Math.max(0, toRupiah(input.hpp ?? 0));
  let opex = Math.max(0, toRupiah(input.opex ?? 0));
  let otherExpense = Math.max(0, toRupiah(input.otherExpense ?? 0));
  let endingCash = toRupiah(input.cashAndBank ?? input.openingCash);
  let revenueByClient: ClientRevenueShareInput[] = input.revenueByClient ?? [];

  const budgetActualOverrides = new Map<string, number>();

  if (Array.isArray(input.ledgerEntries)) {
    revenue = 0;
    hpp = 0;
    opex = 0;
    otherExpense = 0;
    let cashInPeriod = 0;
    let cashOutPeriod = 0;
    let hasExplicitCashMovements = false;
    const clientRevMap = new Map<string, { clientId: string; clientName: string; revenue: number }>();

    const sortedEntries = [...input.ledgerEntries].sort((a, b) =>
      String(a.entryDate).localeCompare(String(b.entryDate)) || String(a.id).localeCompare(String(b.id)),
    );

    for (const entry of sortedEntries) {
      const entryDate = validateYmd(entry.entryDate, 'entryDate');
      const entryYm = entryDate.slice(0, 7);

      // Isolasi periode terkunci: tolak seluruh transaksi periode lain (terutama bulan berikutnya)
      if (entryYm !== effectiveMonthYm) {
        excludedOutOfPeriodCount += 1;
        continue;
      }

      includedEntryCount += 1;
      const amount = Math.max(0, toRupiah(entry.amount));

      if (entry.budgetItemId) {
        budgetActualOverrides.set(
          entry.budgetItemId,
          (budgetActualOverrides.get(entry.budgetItemId) ?? 0) + amount,
        );
      }

      switch (entry.kind) {
        case 'revenue': {
          revenue += amount;
          const cid = String(entry.clientId ?? '').trim();
          if (cid) {
            const prev = clientRevMap.get(cid);
            clientRevMap.set(cid, {
              clientId: cid,
              clientName: String(entry.clientName ?? prev?.clientName ?? cid),
              revenue: (prev?.revenue ?? 0) + amount,
            });
          }
          break;
        }
        case 'hpp':
          hpp += amount;
          break;
        case 'opex':
          opex += amount;
          break;
        case 'other_expense':
          otherExpense += amount;
          break;
        case 'cash_in':
          hasExplicitCashMovements = true;
          cashInPeriod += amount;
          break;
        case 'cash_out':
          hasExplicitCashMovements = true;
          cashOutPeriod += amount;
          break;
      }
    }

    revenue = toRupiah(revenue);
    hpp = toRupiah(hpp);
    opex = toRupiah(opex);
    otherExpense = toRupiah(otherExpense);
    if (clientRevMap.size > 0) {
      revenueByClient = [...clientRevMap.values()];
    }

    const openingCash = toRupiah(input.openingCash);
    endingCash = hasExplicitCashMovements
      ? toRupiah(openingCash + cashInPeriod - cashOutPeriod)
      : toRupiah(openingCash + revenue - hpp - opex - otherExpense);
  }

  // Filter piutang/hutang agar item yang diterbitkan setelah cutoff periode terkunci tidak bocor
  const filteredReceivables: AgingItemInput[] = (input.receivables ?? [])
    .filter((item) => {
      if (!item.issuedDate) return true;
      const issued = validateYmd(item.issuedDate, 'receivable.issuedDate');
      if (issued > cutoffDate) {
        excludedOutOfPeriodCount += 1;
        return false;
      }
      return true;
    })
    .map((item) => ({ ...item, kind: 'receivable' as const }));

  const filteredPayables: AgingItemInput[] = (input.payables ?? [])
    .filter((item) => {
      if (!item.issuedDate) return true;
      const issued = validateYmd(item.issuedDate, 'payable.issuedDate');
      if (issued > cutoffDate) {
        excludedOutOfPeriodCount += 1;
        return false;
      }
      return true;
    })
    .map((item) => ({ ...item, kind: 'payable' as const }));

  const receivablesAging = computeAgingSchedule(filteredReceivables, effectiveAsOfDate, {
    kind: 'receivable',
  });
  const payablesAging = computeAgingSchedule(filteredPayables, effectiveAsOfDate, {
    kind: 'payable',
  });

  // Susun item anggaran dengan isolasi periode & override aktual dari ledgerEntries bila ada
  const applyBudgetOverrides = (items: BudgetLineItemInput[]): BudgetLineItemInput[] =>
    filterDatedBudgetItems(items, effectiveMonthYm).map((item) => ({
      ...item,
      actual: budgetActualOverrides.has(item.id)
        ? budgetActualOverrides.get(item.id)!
        : item.actual,
    }));

  const budgetVsActual = computeBudgetVsActual({
    periodLabel,
    granularity: 'monthly',
    opexItems: applyBudgetOverrides(input.opexBudgetItems ?? []),
    projectItems: applyBudgetOverrides(input.projectBudgetItems ?? []),
    asOfDate: effectiveAsOfDate,
    lockedPeriodMonth: lockedMonthNormalized,
    sourceLabel: input.sourceLabel ?? 'buku_besar_bulanan_terkunci',
  });

  const kpis = computeCfoKpis({
    periodLabel,
    periodDays,
    cashAndBank: endingCash,
    receivables: receivablesAging.totalOutstanding,
    payables: payablesAging.totalOutstanding,
    shortTermDebt: input.shortTermDebt,
    revenue,
    hpp,
    opex,
    otherExpense,
    monthlyBurnRate: opex > 0 ? opex : input.monthlyOpexPlan,
    revenueByClient,
    billedHours: input.billedHours,
    availableHours: input.availableHours,
    activeProjectsCount: input.activeProjectsCount,
    teamProjectCapacity: input.teamProjectCapacity,
    asOfDate: effectiveAsOfDate,
    lockedPeriodMonth: lockedMonthNormalized,
    sourceLabel: input.sourceLabel ?? 'buku_besar_bulanan_direksi',
  });

  const projectMargins = [...(input.projectMargins ?? [])]
    .sort((a, b) => String(a.projectId).localeCompare(String(b.projectId)))
    .map((proj) =>
      analyzeProjectMargin({
        ...proj,
        asOfDate: proj.asOfDate && proj.asOfDate <= cutoffDate ? proj.asOfDate : effectiveAsOfDate,
      }),
    );

  const dividendPolicySummary = simulateDividendPolicyComparison({
    periodLabel,
    availableCash: endingCash,
    monthlyOpexPlan: input.monthlyOpexPlan,
    opexReserveMultiplier: input.opexReserveMultiplier,
    labaDitahan: input.labaDitahan,
    alreadyPaidBusinessDividend: input.alreadyPaidBusinessDividend,
    requestedDividendAmount: input.requestedDividendAmount,
    projects: input.dividendProjects ?? [],
    asOfDate: effectiveAsOfDate,
    lockedPeriodMonth: lockedMonthNormalized,
    sourceLabel: input.sourceLabel ?? 'simulasi_dividen_direksi',
  });

  const topRisks = buildTopRisks({
    kpis,
    budgetVsActual,
    receivablesAging,
    projectMargins,
  });

  const decisionsRequired = buildDecisionsRequired({
    dividend: dividendPolicySummary,
    budgetVsActual,
    receivablesAging,
    projectMargins,
  });

  const headline = kpis.netProfit >= 0
    ? `${orgName} mencatat pendapatan ${formatRupiahLabel(kpis.revenue)} dengan laba bersih ${formatRupiahLabel(kpis.netProfit)} (${kpis.netMarginPct}%) dan kas akhir ${formatRupiahLabel(endingCash)}.`
    : `${orgName} mencatat defisit bersih ${formatRupiahLabel(kpis.netProfit)} dari pendapatan ${formatRupiahLabel(kpis.revenue)} dengan kas akhir ${formatRupiahLabel(endingCash)}.`;

  const summaryPoints = [
    `Margin Kotor ${kpis.grossMarginPct}% (${formatRupiahLabel(kpis.grossProfit)}) | Margin Bersih ${kpis.netMarginPct}% (${formatRupiahLabel(kpis.netProfit)}).`,
    `Kas & Bank ${formatRupiahLabel(kpis.cashAndBank)} | Kas Bersih ${formatRupiahLabel(kpis.netCash)} | Runway ${kpis.runwayLabel}.`,
    `Anggaran vs Aktual: total realisasi ${formatRupiahLabel(budgetVsActual.overallSummary.actual)} vs pagu ${formatRupiahLabel(budgetVsActual.overallSummary.budget)} (${budgetVsActual.overallSummary.variancePct}%).`,
    `Kebijakan Dividen disarankan: ${dividendPolicySummary.recommendation.recommendedMode === 'hold' ? 'Tahan (Hold)' : `${dividendPolicySummary.recommendation.recommendedMode} (${formatRupiahLabel(dividendPolicySummary.recommendation.recommendedAmount)})`}.`,
  ];

  const assumptions = [
    lockedMonthNormalized
      ? `Isolasi periode terkunci aktif (${effectiveMonthYm}, cutoff ${cutoffDate}): transaksi dan tagihan di luar periode dikecualikan (${excludedOutOfPeriodCount} entri disaring).`
      : `Laporan periode ${effectiveMonthYm} dengan tanggal posisi ${effectiveAsOfDate}.`,
    ...kpis.assumptions,
    ...dividendPolicySummary.assumptions,
  ];

  const reportWithoutHash: Omit<BoardMonthlyReport, 'deterministicHash'> = {
    orgName,
    periodMonth: effectiveMonthYm,
    periodLabel,
    lockedPeriodMonth: lockedMonthNormalized,
    isLockedPeriod: Boolean(lockedMonthNormalized),
    asOfDate: effectiveAsOfDate,
    pageOne: {
      executiveSummary: {
        headline,
        summaryPoints,
        revenue: kpis.revenue,
        hpp: kpis.hpp,
        grossProfit: kpis.grossProfit,
        opex: kpis.opex,
        otherExpense: kpis.otherExpense,
        netProfit: kpis.netProfit,
        endingCash,
      },
      kpis,
      topRisks,
      decisionsRequired,
      dividendPolicySummary,
    },
    appendix: {
      budgetVsActual,
      projectMargins,
      agingSummary: {
        receivables: receivablesAging,
        payables: payablesAging,
      },
    },
    periodIntegrity: {
      lockedPeriodMonth: lockedMonthNormalized,
      cutoffDate,
      includedEntryCount,
      excludedOutOfPeriodCount,
    },
    provenance: {
      source: input.sourceLabel ?? 'laporan_direksi_buku_besar',
      period: `${periodLabel} (${effectiveMonthYm})`,
      asOfDate: effectiveAsOfDate,
      lockedPeriodMonth: lockedMonthNormalized,
      assumptions,
      disclaimer: CFO_ANALYTICS_DISCLAIMER,
    },
    disclaimer: CFO_ANALYTICS_DISCLAIMER,
  };

  const deterministicHash = computeDeterministicSha256(canonicalStringify(reportWithoutHash));

  return {
    ...reportWithoutHash,
    deterministicHash,
  };
}

function renderBudgetRowsHtml(items: BudgetLineItemResult[], groupTitle: string): string {
  if (items.length === 0) {
    return `<tr><td colspan="6"><em>Tidak ada item ${escapeHtml(groupTitle)}.</em></td></tr>`;
  }
  return items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="num">${escapeHtml(formatRupiahLabel(item.budget))}</td>
        <td class="num">${escapeHtml(formatRupiahLabel(item.actual))}</td>
        <td class="num">${escapeHtml(formatRupiahLabel(item.variance))}</td>
        <td class="num">${item.variancePct}%</td>
        <td>${escapeHtml(item.status)}${item.explanation ? ` — ${escapeHtml(item.explanation)}` : ''}</td>
      </tr>`,
    )
    .join('\n');
}

function renderAgingTableHtml(title: string, aging: AgingScheduleResult): string {
  return `<div class="card">
    <h3>${escapeHtml(title)} (Total: ${escapeHtml(formatRupiahLabel(aging.totalOutstanding))} | Lewat Jatuh Tempo: ${escapeHtml(formatRupiahLabel(aging.totalOverdue))})</h3>
    <table>
      <thead>
        <tr><th>Lancar (Current)</th><th>1–30 Hari</th><th>31–60 Hari</th><th>61–90 Hari</th><th>&gt; 90 Hari</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="num">${escapeHtml(formatRupiahLabel(aging.buckets.current))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(aging.buckets.days_1_30))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(aging.buckets.days_31_60))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(aging.buckets.days_61_90))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(aging.buckets.over_90))}</td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

/**
 * Menghasilkan HTML cetak 1 halaman eksekutif + lampiran deterministik siap ekspor PDF.
 * Bebas `new Date()`, random ID, atau state eksternal sehingga output 100% identik untuk input identik.
 */
export function renderBoardReportPdfHtml(report: BoardMonthlyReport): string {
  const { executiveSummary, kpis, topRisks, decisionsRequired, dividendPolicySummary } = report.pageOne;
  const { budgetVsActual, projectMargins, agingSummary } = report.appendix;

  const lockBadge = report.isLockedPeriod
    ? `Periode Terkunci (${report.lockedPeriodMonth})`
    : 'Periode Berjalan';

  const kpiRows: [string, string][] = [
    ['Kas & Bank', formatRupiahLabel(kpis.cashAndBank)],
    ['Kas Bersih (Net Cash)', formatRupiahLabel(kpis.netCash)],
    ['Runway Kas', kpis.runwayLabel],
    ['Margin Kotor (Gross Margin)', `${kpis.grossMarginPct}%`],
    ['Margin Bersih (Net Margin)', `${kpis.netMarginPct}%`],
    ['DSO (Hari Penagihan Piutang)', `${kpis.dsoDays} hari`],
    ['DPO (Hari Pembayaran Hutang)', `${kpis.dpoDays} hari`],
    ['Rasio Piutang / Pendapatan', `${kpis.receivableToRevenueRatioPct}%`],
    ['Konsentrasi Klien Top 1 / Top 3', `${kpis.clientConcentrationTop1Pct}% / ${kpis.clientConcentrationTop3Pct}%`],
    ['Utilisasi Tim', `${kpis.teamUtilizationPct}%`],
  ];

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan Direksi — ${escapeHtml(report.orgName)} — ${escapeHtml(report.periodLabel)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 10pt; line-height: 1.4; margin: 0; }
    .page-one { page-break-after: always; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 16pt; font-weight: 700; margin: 0; }
    .subtitle { font-size: 10pt; color: #475569; margin: 2px 0; }
    .meta { font-size: 8.5pt; color: #64748b; }
    h2 { font-size: 11.5pt; color: #059669; margin: 12px 0 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    h3 { font-size: 10pt; color: #1e293b; margin: 8px 0 4px; }
    .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 9pt; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; }
    .num { text-align: right; white-space: nowrap; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border: 1px solid #e2e8f0; padding: 8px; border-radius: 4px; margin-bottom: 8px; }
    .footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 8pt; color: #475569; }
    ul { margin: 4px 0; padding-left: 18px; }
  </style>
</head>
<body>
  <section class="page-one" data-section="executive-page-one">
    <div class="header">
      <div class="title">Laporan Bulanan Direksi — ${escapeHtml(report.orgName)}</div>
      <div class="subtitle">Periode: ${escapeHtml(report.periodLabel)} (${escapeHtml(report.periodMonth)}) | ${escapeHtml(lockBadge)}</div>
      <div class="meta">Tanggal Posisi: ${escapeHtml(report.asOfDate)} | Sumber: ${escapeHtml(report.provenance.source)} | SHA-256: <code>${escapeHtml(report.deterministicHash)}</code></div>
    </div>

    <h2>1. Ringkasan Eksekutif</h2>
    <div class="summary-box">
      <p><strong>${escapeHtml(executiveSummary.headline)}</strong></p>
      <ul>
        ${executiveSummary.summaryPoints.map((pt) => `<li>${escapeHtml(pt)}</li>`).join('\n        ')}
      </ul>
      <table>
        <tbody>
          <tr><td>Pendapatan</td><td class="num"><strong>${escapeHtml(formatRupiahLabel(executiveSummary.revenue))}</strong></td><td>HPP</td><td class="num">${escapeHtml(formatRupiahLabel(executiveSummary.hpp))}</td></tr>
          <tr><td>Laba Kotor</td><td class="num"><strong>${escapeHtml(formatRupiahLabel(executiveSummary.grossProfit))}</strong></td><td>Beban Operasional</td><td class="num">${escapeHtml(formatRupiahLabel(executiveSummary.opex))}</td></tr>
          <tr><td>Laba Bersih</td><td class="num"><strong>${escapeHtml(formatRupiahLabel(executiveSummary.netProfit))}</strong></td><td>Kas Akhir</td><td class="num"><strong>${escapeHtml(formatRupiahLabel(executiveSummary.endingCash))}</strong></td></tr>
        </tbody>
      </table>
    </div>

    <h2>2. Indikator Kinerja Utama (KPI CFO)</h2>
    <table>
      <thead><tr><th>Metrik KPI</th><th class="num">Nilai</th></tr></thead>
      <tbody>
        ${kpiRows.map(([label, val]) => `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(val)}</td></tr>`).join('\n        ')}
      </tbody>
    </table>

    <div class="grid-2">
      <div class="card">
        <h3>3. Risiko Utama</h3>
        <ul>
          ${topRisks.map((r) => `<li><strong>[${escapeHtml(r.severity.toUpperCase())}] ${escapeHtml(r.title)}</strong> (${escapeHtml(r.metricValue)}): ${escapeHtml(r.detail)}</li>`).join('\n          ')}
        </ul>
      </div>
      <div class="card">
        <h3>4. Keputusan Diperlukan</h3>
        <ul>
          ${decisionsRequired.map((d) => `<li><strong>[${escapeHtml(d.priority.toUpperCase())}] ${escapeHtml(d.title)}</strong>: ${escapeHtml(d.recommendation)} (${escapeHtml(d.impactSummary)})</li>`).join('\n          ')}
        </ul>
      </div>
    </div>

    <h2>5. Ringkasan Kebijakan Dividen (2 Mode)</h2>
    <table>
      <thead>
        <tr><th>Mode Kebijakan</th><th class="num">Maksimal Dibagikan</th><th class="num">Rekomendasi</th><th class="num">Sisa Kas Setelah Dividen</th><th>Catatan</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Per Proyek</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perProjectMode.maxDistributable))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perProjectMode.recommendedPayout))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perProjectMode.cashRemainingAfterPayout))}</td>
          <td>${escapeHtml(dividendPolicySummary.perProjectMode.blockedReason ?? 'Memenuhi cadangan opex')}</td>
        </tr>
        <tr>
          <td>Per Bisnis</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perBusinessMode.maxDistributable))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perBusinessMode.recommendedPayout))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(dividendPolicySummary.perBusinessMode.cashRemainingAfterPayout))}</td>
          <td>${escapeHtml(dividendPolicySummary.perBusinessMode.blockedReason ?? 'Memenuhi laba ditahan & cadangan opex')}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">
      Rekomendasi Likuiditas: <strong>${escapeHtml(dividendPolicySummary.recommendation.recommendedMode)}</strong> (${escapeHtml(formatRupiahLabel(dividendPolicySummary.recommendation.recommendedAmount))}) | Cadangan Opex Wajib: ${escapeHtml(formatRupiahLabel(dividendPolicySummary.opexReserve))}.<br />
      Disclaimer: ${escapeHtml(report.disclaimer)}.
    </div>
  </section>

  <section class="appendix" data-section="board-appendix">
    <div class="header">
      <div class="title">Lampiran Laporan Direksi — ${escapeHtml(report.orgName)}</div>
      <div class="subtitle">Periode: ${escapeHtml(report.periodLabel)} (${escapeHtml(report.periodMonth)}) | Integritas Cutoff: ${escapeHtml(report.periodIntegrity.cutoffDate)}</div>
    </div>

    <h2>Lampiran A. Anggaran vs Aktual (Opex &amp; Proyek)</h2>
    <table>
      <thead>
        <tr><th>Pos Anggaran</th><th class="num">Anggaran</th><th class="num">Aktual</th><th class="num">Varians</th><th class="num">Varians %</th><th>Status &amp; Penjelasan</th></tr>
      </thead>
      <tbody>
        <tr><td colspan="6"><strong>Beban Operasional (Opex)</strong></td></tr>
        ${renderBudgetRowsHtml(budgetVsActual.opexItems, 'Opex')}
        <tr><td colspan="6"><strong>Biaya Proyek</strong></td></tr>
        ${renderBudgetRowsHtml(budgetVsActual.projectItems, 'Proyek')}
        <tr>
          <td><strong>Total Keseluruhan</strong></td>
          <td class="num"><strong>${escapeHtml(formatRupiahLabel(budgetVsActual.overallSummary.budget))}</strong></td>
          <td class="num"><strong>${escapeHtml(formatRupiahLabel(budgetVsActual.overallSummary.actual))}</strong></td>
          <td class="num"><strong>${escapeHtml(formatRupiahLabel(budgetVsActual.overallSummary.variance))}</strong></td>
          <td class="num"><strong>${budgetVsActual.overallSummary.variancePct}%</strong></td>
          <td><strong>${escapeHtml(budgetVsActual.overallSummary.status)}</strong></td>
        </tr>
      </tbody>
    </table>

    <h2>Lampiran B. Margin &amp; EAC Proyek</h2>
    <table>
      <thead>
        <tr><th>Proyek</th><th class="num">Kontrak</th><th class="num">RAP</th><th class="num">Aktual</th><th class="num">EAC</th><th class="num">Proyeksi Margin</th></tr>
      </thead>
      <tbody>
        ${projectMargins.length === 0
          ? '<tr><td colspan="6"><em>Tidak ada data proyek pada periode ini.</em></td></tr>'
          : projectMargins
              .map(
                (p) => `<tr>
          <td>${escapeHtml(p.projectName)} (${p.progressPct}%)</td>
          <td class="num">${escapeHtml(formatRupiahLabel(p.contractValue))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(p.totalRap))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(p.actualTotal))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(p.eac))}</td>
          <td class="num">${escapeHtml(formatRupiahLabel(p.projectedFinalMargin))} (${p.projectedMarginPct}%)</td>
        </tr>`,
              )
              .join('\n        ')}
      </tbody>
    </table>

    <h2>Lampiran C. Ringkasan Umur Piutang &amp; Hutang (Aging)</h2>
    ${renderAgingTableHtml('Umur Piutang (Receivables)', agingSummary.receivables)}
    ${renderAgingTableHtml('Umur Hutang (Payables)', agingSummary.payables)}

    <div class="footer">
      Integritas Periode: ${report.periodIntegrity.includedEntryCount} entri periode disertakan, ${report.periodIntegrity.excludedOutOfPeriodCount} entri luar periode disaring.<br />
      Hash Deterministik (SHA-256): <code>${escapeHtml(report.deterministicHash)}</code> | Disclaimer: ${escapeHtml(report.disclaimer)}.
    </div>
  </section>
</body>
</html>`;
}
