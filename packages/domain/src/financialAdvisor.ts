import { toRupiah } from './journal';

const MS_PER_DAY = 86_400_000;
const FORECAST_WEEKS = 13;
const DAYS_PER_WEEK = 7;

export const FINANCIAL_ADVISOR_DISCLAIMER = 'Bukan nasihat hukum/pajak berlisensi' as const;

export const PROJECT_MARGIN_CATEGORIES = [
  'material',
  'labor',
  'equipment',
  'overhead',
  'other',
  'uncategorized',
] as const;

export type ProjectMarginCategory = (typeof PROJECT_MARGIN_CATEGORIES)[number];

export type AdvisorProvenance = {
  source: string;
  period: string;
  asOfDate: string;
  assumptions: string[];
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

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

function formatUtcMsToYmd(utcMs: number): string {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function shiftYmdDays(ymd: string, deltaDays: number, fieldName = 'tanggal'): string {
  const baseMs = parseYmdUtcMs(ymd, fieldName);
  return formatUtcMsToYmd(baseMs + Math.trunc(deltaDays) * MS_PER_DAY);
}

function diffDaysUtc(fromYmd: string, toYmd: string, fromLabel = 'fromDate', toLabel = 'toDate'): number {
  const fromMs = parseYmdUtcMs(fromYmd, fromLabel);
  const toMs = parseYmdUtcMs(toYmd, toLabel);
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}

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

// ============================================================================
// 1. Forecast Arus Kas 13 Minggu (3 Skenario: Base / Worst / Best)
// ============================================================================

export type AdvisorReceivableItem = {
  id: string;
  partyId?: string | null;
  partyName?: string | null;
  projectId?: string | null;
  dueDate: string;
  outstandingAmount: number;
  label?: string;
};

export type AdvisorPayableItem = {
  id: string;
  partyId?: string | null;
  partyName?: string | null;
  projectId?: string | null;
  dueDate: string;
  outstandingAmount: number;
  isActiveCriticalProject?: boolean;
  isTaxOrPenalty?: boolean;
  hasPenaltyRisk?: boolean;
  category?: string | null;
  label?: string;
};

export type AdvisorTerminItem = {
  id: string;
  projectId?: string | null;
  projectName?: string | null;
  partyId?: string | null;
  partyName?: string | null;
  dueDate: string;
  amount: number;
};

export type ForecastCashFlowInput = {
  asOfDate: string;
  openingCash: number;
  receivables: AdvisorReceivableItem[];
  payables: AdvisorPayableItem[];
  monthlyOpexPlan: number;
  scheduledProjectTermins: AdvisorTerminItem[];
  sourceLabel?: string;
};

export type ForecastScenarioKey = 'base' | 'worst' | 'best';

export type ForecastWeekRow = {
  weekIndex: number;
  weekStart: string;
  weekEnd: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  endingCash: number;
  receivableInflows: number;
  terminInflows: number;
  payableOutflows: number;
  opexOutflows: number;
};

export type ForecastScenarioResult = {
  scenario: ForecastScenarioKey;
  openingCash: number;
  weeks: ForecastWeekRow[];
  totalInflows: number;
  totalOutflows: number;
  firstNegativeCashDate: string | null;
  minEndingCash: number;
  endingCashWeek13: number;
  assumptions: string[];
};

export type ForecastCashFlow13WeeksResult = {
  asOfDate: string;
  windowStart: string;
  windowEnd: string;
  openingCash: number;
  scenarios: Record<ForecastScenarioKey, ForecastScenarioResult>;
  assumptions: string[];
  provenance: AdvisorProvenance;
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

type ScenarioConfig = {
  key: ForecastScenarioKey;
  receivableDelayDays: number;
  receivableCollectionRate: number;
  terminDelayDays: number;
  terminCollectionRate: number;
  opexMultiplier: number;
  assumptions: string[];
};

const SCENARIO_CONFIGS: Record<ForecastScenarioKey, ScenarioConfig> = {
  base: {
    key: 'base',
    receivableDelayDays: 0,
    receivableCollectionRate: 1,
    terminDelayDays: 0,
    terminCollectionRate: 1,
    opexMultiplier: 1,
    assumptions: [
      'Base: piutang dan termin proyek diterima 100% sesuai jadwal jatuh tempo.',
      'Base: hutang dibayar 100% sesuai tanggal jatuh tempo dan opex rutin 100% dari rencana bulanan (× 3/13 per minggu).',
    ],
  },
  worst: {
    key: 'worst',
    receivableDelayDays: 14,
    receivableCollectionRate: 0.85,
    terminDelayDays: 14,
    terminCollectionRate: 0.85,
    opexMultiplier: 1.1,
    assumptions: [
      'Worst: piutang dan termin terlambat +14 hari serta hanya 85% tertagih di dalam jendela 13 minggu.',
      'Worst: hutang tetap dibayar 100% sesuai jatuh tempo dan opex rutin naik +10% (110%).',
    ],
  },
  best: {
    key: 'best',
    receivableDelayDays: 0,
    receivableCollectionRate: 1,
    terminDelayDays: -7,
    terminCollectionRate: 1,
    opexMultiplier: 0.95,
    assumptions: [
      'Best: piutang diterima 100% tepat waktu dan termin proyek cair 7 hari lebih cepat.',
      'Best: hutang dibayar sesuai jatuh tempo dan opex rutin terefisienkan menjadi 95%.',
    ],
  },
};

function resolveWeekBucket(effectiveDate: string, windowStart: string, windowEnd: string): number | null {
  if (effectiveDate > windowEnd) return null;
  if (effectiveDate <= windowStart) return 1;
  const daysFromStart = diffDaysUtc(windowStart, effectiveDate, 'windowStart', 'effectiveDate');
  const idx = Math.floor(daysFromStart / DAYS_PER_WEEK) + 1;
  return idx >= 1 && idx <= FORECAST_WEEKS ? idx : null;
}

function buildScenarioForecast(
  input: ForecastCashFlowInput,
  windowStart: string,
  windowEnd: string,
  openingCash: number,
  monthlyOpexPlan: number,
  config: ScenarioConfig,
): ForecastScenarioResult {
  const weeklyOpex = toRupiah((monthlyOpexPlan * 3 * config.opexMultiplier) / FORECAST_WEEKS);

  const weeks: ForecastWeekRow[] = [];
  for (let w = 1; w <= FORECAST_WEEKS; w += 1) {
    const weekStart = shiftYmdDays(windowStart, (w - 1) * DAYS_PER_WEEK, 'windowStart');
    const weekEnd = shiftYmdDays(weekStart, DAYS_PER_WEEK - 1, 'weekStart');
    weeks.push({
      weekIndex: w,
      weekStart,
      weekEnd,
      inflows: 0,
      outflows: weeklyOpex,
      netCashFlow: 0,
      endingCash: 0,
      receivableInflows: 0,
      terminInflows: 0,
      payableOutflows: 0,
      opexOutflows: weeklyOpex,
    });
  }

  for (const r of input.receivables) {
    const amount = toRupiah(r.outstandingAmount);
    if (amount <= 0) continue;
    const effectiveDate = shiftYmdDays(r.dueDate, config.receivableDelayDays, 'receivables.dueDate');
    const weekIdx = resolveWeekBucket(effectiveDate, windowStart, windowEnd);
    if (weekIdx === null) continue;
    const collected = toRupiah(amount * config.receivableCollectionRate);
    weeks[weekIdx - 1].receivableInflows += collected;
  }

  for (const t of input.scheduledProjectTermins) {
    const amount = toRupiah(t.amount);
    if (amount <= 0) continue;
    const effectiveDate = shiftYmdDays(t.dueDate, config.terminDelayDays, 'scheduledProjectTermins.dueDate');
    const weekIdx = resolveWeekBucket(effectiveDate, windowStart, windowEnd);
    if (weekIdx === null) continue;
    const collected = toRupiah(amount * config.terminCollectionRate);
    weeks[weekIdx - 1].terminInflows += collected;
  }

  for (const p of input.payables) {
    const amount = toRupiah(p.outstandingAmount);
    if (amount <= 0) continue;
    const weekIdx = resolveWeekBucket(p.dueDate, windowStart, windowEnd);
    if (weekIdx === null) continue;
    weeks[weekIdx - 1].payableOutflows += amount;
  }

  let runningCash = openingCash;
  let totalInflows = 0;
  let totalOutflows = 0;
  let firstNegativeCashDate: string | null = openingCash < 0 ? windowStart : null;
  let minEndingCash = Number.POSITIVE_INFINITY;

  for (const row of weeks) {
    row.inflows = toRupiah(row.receivableInflows + row.terminInflows);
    row.outflows = toRupiah(row.payableOutflows + row.opexOutflows);
    row.netCashFlow = toRupiah(row.inflows - row.outflows);
    runningCash = toRupiah(runningCash + row.netCashFlow);
    row.endingCash = runningCash;

    totalInflows += row.inflows;
    totalOutflows += row.outflows;

    if (row.endingCash < minEndingCash) {
      minEndingCash = row.endingCash;
    }
    if (firstNegativeCashDate === null && row.endingCash < 0) {
      firstNegativeCashDate = row.weekEnd;
    }
  }

  return {
    scenario: config.key,
    openingCash,
    weeks,
    totalInflows: toRupiah(totalInflows),
    totalOutflows: toRupiah(totalOutflows),
    firstNegativeCashDate,
    minEndingCash: Number.isFinite(minEndingCash) ? minEndingCash : openingCash,
    endingCashWeek13: weeks[weeks.length - 1]?.endingCash ?? openingCash,
    assumptions: [...config.assumptions],
  };
}

/**
 * Menghitung proyeksi arus kas 13 minggu (91 hari) secara deterministik dalam 3 skenario
 * (`base`, `worst`, `best`) dengan nominal integer rupiah, provenance, dan disclaimer.
 */
export function forecastCashFlow13Weeks(
  input: ForecastCashFlowInput,
): ForecastCashFlow13WeeksResult {
  parseYmdUtcMs(input.asOfDate, 'asOfDate');
  if (!Number.isFinite(input.openingCash)) {
    throw new Error('openingCash tidak valid');
  }
  if (!Number.isFinite(input.monthlyOpexPlan) || input.monthlyOpexPlan < 0) {
    throw new Error('monthlyOpexPlan harus berupa angka >= 0');
  }

  const openingCash = toRupiah(input.openingCash);
  const monthlyOpexPlan = toRupiah(input.monthlyOpexPlan);
  const windowStart = input.asOfDate;
  const windowEnd = shiftYmdDays(windowStart, FORECAST_WEEKS * DAYS_PER_WEEK - 1, 'asOfDate');

  const base = buildScenarioForecast(input, windowStart, windowEnd, openingCash, monthlyOpexPlan, SCENARIO_CONFIGS.base);
  const worst = buildScenarioForecast(input, windowStart, windowEnd, openingCash, monthlyOpexPlan, SCENARIO_CONFIGS.worst);
  const best = buildScenarioForecast(input, windowStart, windowEnd, openingCash, monthlyOpexPlan, SCENARIO_CONFIGS.best);

  const assumptions = [
    `Horizon proyeksi 13 minggu (${windowStart} s.d. ${windowEnd}); item jatuh tempo sebelum ${windowStart} ditempatkan di minggu ke-1.`,
    `Opex mingguan dasar = round(monthlyOpexPlan × 3 / 13) = ${formatRupiahLabel(toRupiah((monthlyOpexPlan * 3) / FORECAST_WEEKS))}/minggu.`,
    'firstNegativeCashDate dicatat pada tanggal akhir minggu pertama saat endingCash < 0 (atau asOfDate bila openingCash < 0).',
    ...base.assumptions,
    ...worst.assumptions,
    ...best.assumptions,
  ];

  return {
    asOfDate: input.asOfDate,
    windowStart,
    windowEnd,
    openingCash,
    scenarios: { base, worst, best },
    assumptions,
    provenance: {
      source: input.sourceLabel ?? 'buku_besar_piutang_hutang_opex_termin',
      period: `${windowStart}..${windowEnd}`,
      asOfDate: input.asOfDate,
      assumptions,
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    },
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}

// ============================================================================
// 2. Analisis Margin Proyek & EAC (RAP vs Realisasi per 6 Kategori)
// ============================================================================

export type ProjectMarginInput = {
  projectId: string;
  projectName: string;
  contractValue: number;
  progressPct: number;
  rapByCategory: Partial<Record<ProjectMarginCategory, number>>;
  actualByCategory: Partial<Record<ProjectMarginCategory, number>>;
  asOfDate?: string;
  sourceLabel?: string;
};

export type ProjectCategoryVariance = {
  category: ProjectMarginCategory;
  rap: number;
  actual: number;
  variance: number;
  variancePct: number;
};

export type ProjectMarginResult = {
  projectId: string;
  projectName: string;
  contractValue: number;
  progressPct: number;
  totalRap: number;
  actualTotal: number;
  totalVariance: number;
  totalVariancePct: number;
  eac: number;
  eacMethod: 'cpi_performance' | 'baseline_remaining_rap';
  projectedFinalMargin: number;
  projectedMarginPct: number;
  plannedMargin: number;
  plannedMarginPct: number;
  byCategory: ProjectCategoryVariance[];
  topVarianceDrivers: ProjectCategoryVariance[];
  assumptions: string[];
  provenance: AdvisorProvenance;
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

/**
 * Menganalisis margin proyek per 6 kategori biaya RAP vs realisasi, menghitung EAC
 * (proyeksi kinerja biaya bila progres >= 10% atau sisa RAP bila progres < 10%),
 * proyeksi margin akhir, serta penggerak selisih over-budget terbesar.
 */
export function analyzeProjectMargin(input: ProjectMarginInput): ProjectMarginResult {
  const projectId = String(input.projectId ?? '').trim();
  const projectName = String(input.projectName ?? '').trim() || projectId;
  if (!projectId) {
    throw new Error('projectId wajib diisi');
  }
  if (!Number.isFinite(input.contractValue) || input.contractValue < 0) {
    throw new Error('contractValue harus >= 0');
  }
  if (!Number.isFinite(input.progressPct) || input.progressPct < 0 || input.progressPct > 100) {
    throw new Error('progressPct harus berada di rentang 0..100');
  }

  const contractValue = toRupiah(input.contractValue);
  const progressPct = round2(input.progressPct);
  const asOfDate = input.asOfDate ? (parseYmdUtcMs(input.asOfDate, 'asOfDate'), input.asOfDate) : 'as_of_snapshot';

  const byCategory: ProjectCategoryVariance[] = [];
  let totalRap = 0;
  let actualTotal = 0;

  for (const category of PROJECT_MARGIN_CATEGORIES) {
    const rap = toRupiah(Math.max(0, Number(input.rapByCategory?.[category]) || 0));
    const actual = toRupiah(Math.max(0, Number(input.actualByCategory?.[category]) || 0));
    const variance = toRupiah(actual - rap);
    const variancePct = rap > 0 ? round2((variance / rap) * 100) : (actual > 0 ? 100 : 0);

    byCategory.push({
      category,
      rap,
      actual,
      variance,
      variancePct,
    });
    totalRap += rap;
    actualTotal += actual;
  }

  totalRap = toRupiah(totalRap);
  actualTotal = toRupiah(actualTotal);
  const totalVariance = toRupiah(actualTotal - totalRap);
  const totalVariancePct = totalRap > 0 ? round2((totalVariance / totalRap) * 100) : (actualTotal > 0 ? 100 : 0);

  let eac: number;
  let eacMethod: ProjectMarginResult['eacMethod'];
  const assumptions: string[] = [];

  if (progressPct >= 10 && actualTotal > 0) {
    eacMethod = 'cpi_performance';
    eac = toRupiah(actualTotal / (progressPct / 100));
    assumptions.push(
      `Progres ${progressPct}% (>= 10%): EAC dihitung berbasis kinerja biaya aktual (actualTotal / (progressPct / 100)) = ${formatRupiahLabel(eac)}.`,
    );
  } else if (progressPct >= 10 && actualTotal === 0) {
    eacMethod = 'baseline_remaining_rap';
    eac = totalRap;
    assumptions.push(
      `Progres ${progressPct}% (>= 10%) namun realisasi biaya masih Rp 0; EAC memakai baseline total RAP (${formatRupiahLabel(totalRap)}).`,
    );
  } else {
    eacMethod = 'baseline_remaining_rap';
    const remainingRap = Math.max(0, totalRap - actualTotal);
    eac = toRupiah(actualTotal + remainingRap);
    assumptions.push(
      `Progres ${progressPct}% (< 10%): EAC memakai realisasi + sisa RAP baseline (${formatRupiahLabel(actualTotal)} + ${formatRupiahLabel(remainingRap)}).`,
    );
  }

  const projectedFinalMargin = toRupiah(contractValue - eac);
  const projectedMarginPct = contractValue > 0 ? round2((projectedFinalMargin / contractValue) * 100) : 0;
  const plannedMargin = toRupiah(contractValue - totalRap);
  const plannedMarginPct = contractValue > 0 ? round2((plannedMargin / contractValue) * 100) : 0;

  const topVarianceDrivers = byCategory
    .filter((row) => row.variance > 0)
    .sort((a, b) => b.variance - a.variance || b.actual - a.actual || a.category.localeCompare(b.category));

  assumptions.push('Seluruh angka dihitung deterministik per 6 kategori RAP (material, labor, equipment, overhead, other, uncategorized).');

  return {
    projectId,
    projectName,
    contractValue,
    progressPct,
    totalRap,
    actualTotal,
    totalVariance,
    totalVariancePct,
    eac,
    eacMethod,
    projectedFinalMargin,
    projectedMarginPct,
    plannedMargin,
    plannedMarginPct,
    byCategory,
    topVarianceDrivers,
    assumptions,
    provenance: {
      source: input.sourceLabel ?? `rap_dan_realisasi_proyek:${projectId}`,
      period: `progress_${progressPct}pct`,
      asOfDate,
      assumptions,
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    },
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}

// ============================================================================
// 3. Rekomendasi Harga Proyek Berbasis Margin Historis / Fallback Katalog
// ============================================================================

export type SimilarProjectRecord = {
  projectId: string;
  projectName: string;
  contractValue: number;
  actualCost: number;
};

export type ProjectPricingInput = {
  estimatedDirectCost: number;
  similarProjects: SimilarProjectRecord[];
  catalogDefaultMarginPct?: number;
  minSampleSize?: number;
  asOfDate?: string;
  sourceLabel?: string;
};

export type ProjectPricingResult = {
  estimatedDirectCost: number;
  sampleCount: number;
  minSampleSize: number;
  usedFallback: boolean;
  minMarginPct: number;
  medianMarginPct: number;
  maxMarginPct: number;
  lowPrice: number;
  recommendedPrice: number;
  highPrice: number;
  note: string;
  assumptions: string[];
  provenance: AdvisorProvenance;
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

function computeMedian(sortedNumbers: number[]): number {
  const n = sortedNumbers.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sortedNumbers[(n - 1) / 2];
  return round2((sortedNumbers[n / 2 - 1] + sortedNumbers[n / 2]) / 2);
}

function priceFromGrossMargin(cost: number, marginPct: number): number {
  const clamped = Math.min(90, Math.max(0, marginPct));
  return toRupiah(cost / (1 - clamped / 100));
}

/**
 * Merekomendasikan rentang harga penawaran (`lowPrice`, `recommendedPrice`, `highPrice`)
 * dari margin historis proyek serupa (`N >= minSampleSize`) atau fallback margin katalog
 * (`-5% / 0% / +5%`) bila sampel belum memadai.
 */
export function recommendProjectPricing(input: ProjectPricingInput): ProjectPricingResult {
  if (!Number.isFinite(input.estimatedDirectCost) || input.estimatedDirectCost < 0) {
    throw new Error('estimatedDirectCost harus >= 0');
  }
  const estimatedDirectCost = toRupiah(input.estimatedDirectCost);
  const catalogDefaultMarginPct = round2(
    Number.isFinite(input.catalogDefaultMarginPct) ? Number(input.catalogDefaultMarginPct) : 20,
  );
  const minSampleSize = Math.max(1, Math.floor(input.minSampleSize ?? 3));
  const asOfDate = input.asOfDate ? (parseYmdUtcMs(input.asOfDate, 'asOfDate'), input.asOfDate) : 'as_of_snapshot';

  const validProjects = (input.similarProjects ?? []).filter(
    (p) => Number.isFinite(p.contractValue) && p.contractValue > 0 && Number.isFinite(p.actualCost) && p.actualCost >= 0,
  );
  const sampleCount = validProjects.length;
  const assumptions: string[] = [];

  if (sampleCount >= minSampleSize) {
    const margins = validProjects
      .map((p) => {
        const cv = toRupiah(p.contractValue);
        const ac = toRupiah(p.actualCost);
        return round2(((cv - ac) / cv) * 100);
      })
      .sort((a, b) => a - b);

    const minMarginPct = margins[0];
    const medianMarginPct = computeMedian(margins);
    const maxMarginPct = margins[margins.length - 1];

    if (minMarginPct < 0 || maxMarginPct > 90) {
      assumptions.push(
        'Sebagian margin historis berada di luar [0%, 90%]; penetapan harga lantai/atap dibatasi ke [0%, 90%] agar harga penawaran tetap rasional.',
      );
    }

    const lowPrice = priceFromGrossMargin(estimatedDirectCost, minMarginPct);
    const recommendedPrice = priceFromGrossMargin(estimatedDirectCost, medianMarginPct);
    const highPrice = priceFromGrossMargin(estimatedDirectCost, maxMarginPct);

    const note = `Rekomendasi berbasis ${sampleCount} proyek serupa (margin historis min ${minMarginPct}%, median ${medianMarginPct}%, maks ${maxMarginPct}%).`;
    assumptions.push(
      'Rumus harga penawaran: estimatedDirectCost / (1 - marginPct / 100) untuk menjaga konsistensi margin terhadap nilai kontrak.',
      note,
    );

    return {
      estimatedDirectCost,
      sampleCount,
      minSampleSize,
      usedFallback: false,
      minMarginPct,
      medianMarginPct,
      maxMarginPct,
      lowPrice,
      recommendedPrice,
      highPrice,
      note,
      assumptions,
      provenance: {
        source: input.sourceLabel ?? `riwayat_${sampleCount}_proyek_serupa`,
        period: `sample_${sampleCount}_projects`,
        asOfDate,
        assumptions,
        disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
      },
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    };
  }

  const minMarginPct = Math.max(0, round2(catalogDefaultMarginPct - 5));
  const medianMarginPct = Math.min(90, Math.max(0, catalogDefaultMarginPct));
  const maxMarginPct = Math.min(90, round2(catalogDefaultMarginPct + 5));

  const lowPrice = priceFromGrossMargin(estimatedDirectCost, minMarginPct);
  const recommendedPrice = priceFromGrossMargin(estimatedDirectCost, medianMarginPct);
  const highPrice = priceFromGrossMargin(estimatedDirectCost, maxMarginPct);

  const note = `Sampel proyek serupa < ${minSampleSize}; menggunakan margin katalog (${minMarginPct}% / ${medianMarginPct}% / ${maxMarginPct}%).`;
  assumptions.push(
    note,
    'Rumus harga penawaran: estimatedDirectCost / (1 - marginPct / 100) dengan pita katalog -5% / 0% / +5%.',
  );

  return {
    estimatedDirectCost,
    sampleCount,
    minSampleSize,
    usedFallback: true,
    minMarginPct,
    medianMarginPct,
    maxMarginPct,
    lowPrice,
    recommendedPrice,
    highPrice,
    note,
    assumptions,
    provenance: {
      source: input.sourceLabel ?? 'katalog_margin_default',
      period: `fallback_sample_${sampleCount}`,
      asOfDate,
      assumptions,
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    },
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}

// ============================================================================
// 4. Simulasi What-If Deterministik
// ============================================================================

export type AdvisorWhatIfScenario =
  | {
      kind: 'client_delay';
      partyId: string;
      partyName?: string;
      delayDays: number;
    }
  | {
      kind: 'take_new_project';
      projectName: string;
      contractValue: number;
      dpAmount: number;
      dpDate: string;
      estimatedCost: number;
      costStartDate: string;
      durationWeeks: number;
      terminAmount: number;
      terminDate: string;
    }
  | {
      kind: 'pay_payable_early';
      payableId: string;
      partyName?: string;
      amount?: number;
      newPayDate: string;
    };

export type AdvisorWhatIfResult = {
  scenarioKind: AdvisorWhatIfScenario['kind'];
  cashImpactWeek13: number;
  minCashDelta: number;
  beforeFirstNegativeDate: string | null;
  afterFirstNegativeDate: string | null;
  profitImpact: number;
  beforeForecast: ForecastScenarioResult;
  afterForecast: ForecastScenarioResult;
  assumptions: string[];
  provenance: AdvisorProvenance;
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

function distributeIntegerRupiah(totalAmount: number, parts: number): number[] {
  const safeParts = Math.max(1, Math.floor(parts));
  const total = toRupiah(Math.max(0, totalAmount));
  const base = Math.floor(total / safeParts);
  const remainder = total - base * safeParts;
  const out: number[] = [];
  for (let i = 0; i < safeParts; i += 1) {
    out.push(base + (i < remainder ? 1 : 0));
  }
  return out;
}

/**
 * Menjalankan simulasi What-If deterministik terhadap skenario dasar `forecastCashFlow13Weeks`
 * untuk 3 kasus: keterlambatan klien, pengambilan proyek baru, atau percepatan bayar hutang.
 */
export function runAdvisorWhatIf(
  baseForecastInput: ForecastCashFlowInput,
  scenario: AdvisorWhatIfScenario,
): AdvisorWhatIfResult {
  const beforeResult = forecastCashFlow13Weeks(baseForecastInput);
  const beforeForecast = beforeResult.scenarios.base;

  const modifiedInput: ForecastCashFlowInput = {
    ...baseForecastInput,
    receivables: baseForecastInput.receivables.map((r) => ({ ...r })),
    payables: baseForecastInput.payables.map((p) => ({ ...p })),
    scheduledProjectTermins: baseForecastInput.scheduledProjectTermins.map((t) => ({ ...t })),
  };

  const assumptions: string[] = [];
  let profitImpact = 0;

  if (scenario.kind === 'client_delay') {
    const delayDays = Math.trunc(scenario.delayDays);
    let shiftedCount = 0;

    modifiedInput.receivables = modifiedInput.receivables.map((r) => {
      if (r.partyId === scenario.partyId) {
        shiftedCount += 1;
        return {
          ...r,
          dueDate: shiftYmdDays(r.dueDate, delayDays, 'receivables.dueDate'),
        };
      }
      return r;
    });

    modifiedInput.scheduledProjectTermins = modifiedInput.scheduledProjectTermins.map((t) => {
      if (t.partyId === scenario.partyId) {
        shiftedCount += 1;
        return {
          ...t,
          dueDate: shiftYmdDays(t.dueDate, delayDays, 'scheduledProjectTermins.dueDate'),
        };
      }
      return t;
    });

    const partyLabel = scenario.partyName || scenario.partyId;
    assumptions.push(
      `Skenario keterlambatan klien ${partyLabel}: ${shiftedCount} tagihan/termin digeser +${delayDays} hari.`,
      'Keterlambatan penagihan hanya menggeser waktu arus kas masuk dan tidak mengubah laba akrual (profitImpact = 0).',
    );
    profitImpact = 0;
  } else if (scenario.kind === 'take_new_project') {
    parseYmdUtcMs(scenario.dpDate, 'dpDate');
    parseYmdUtcMs(scenario.costStartDate, 'costStartDate');
    parseYmdUtcMs(scenario.terminDate, 'terminDate');

    const contractValue = toRupiah(Math.max(0, scenario.contractValue));
    const dpAmount = toRupiah(Math.max(0, scenario.dpAmount));
    const terminAmount = toRupiah(Math.max(0, scenario.terminAmount));
    const estimatedCost = toRupiah(Math.max(0, scenario.estimatedCost));
    const durationWeeks = Math.max(1, Math.floor(scenario.durationWeeks));

    if (dpAmount > 0) {
      modifiedInput.scheduledProjectTermins.push({
        id: `whatif-dp-${scenario.projectName}`,
        projectName: scenario.projectName,
        dueDate: scenario.dpDate,
        amount: dpAmount,
      });
    }
    if (terminAmount > 0) {
      modifiedInput.scheduledProjectTermins.push({
        id: `whatif-termin-${scenario.projectName}`,
        projectName: scenario.projectName,
        dueDate: scenario.terminDate,
        amount: terminAmount,
      });
    }

    const weeklyCostTranches = distributeIntegerRupiah(estimatedCost, durationWeeks);
    weeklyCostTranches.forEach((tranche, idx) => {
      if (tranche <= 0) return;
      modifiedInput.payables.push({
        id: `whatif-cost-${scenario.projectName}-w${idx + 1}`,
        partyName: `Biaya Proyek ${scenario.projectName}`,
        dueDate: shiftYmdDays(scenario.costStartDate, idx * DAYS_PER_WEEK, 'costStartDate'),
        outstandingAmount: tranche,
        isActiveCriticalProject: true,
      });
    });

    profitImpact = toRupiah(contractValue - estimatedCost);
    assumptions.push(
      `Skenario ambil proyek "${scenario.projectName}": DP ${formatRupiahLabel(dpAmount)} (${scenario.dpDate}) dan termin ${formatRupiahLabel(terminAmount)} (${scenario.terminDate}).`,
      `Estimasi biaya ${formatRupiahLabel(estimatedCost)} dibagi merata ke ${durationWeeks} minggu mulai ${scenario.costStartDate}.`,
      `Dampak laba proyeksi (profitImpact) = contractValue - estimatedCost = ${formatRupiahLabel(profitImpact)}.`,
    );
  } else if (scenario.kind === 'pay_payable_early') {
    parseYmdUtcMs(scenario.newPayDate, 'newPayDate');
    const idx = modifiedInput.payables.findIndex((p) => p.id === scenario.payableId);
    const partyLabel = scenario.partyName || scenario.payableId;

    if (idx >= 0) {
      const target = modifiedInput.payables[idx];
      const originalAmount = toRupiah(Math.max(0, target.outstandingAmount));
      const requestedAmount = scenario.amount !== undefined
        ? toRupiah(Math.max(0, scenario.amount))
        : originalAmount;

      if (requestedAmount > 0 && requestedAmount < originalAmount) {
        const remaining = toRupiah(originalAmount - requestedAmount);
        modifiedInput.payables[idx] = {
          ...target,
          outstandingAmount: remaining,
        };
        modifiedInput.payables.push({
          ...target,
          id: `${target.id}-early`,
          dueDate: scenario.newPayDate,
          outstandingAmount: requestedAmount,
        });
        assumptions.push(
          `Pembayaran dipercepat sebagian (${formatRupiahLabel(requestedAmount)}) untuk hutang ${partyLabel} ke ${scenario.newPayDate}; sisa ${formatRupiahLabel(remaining)} tetap pada ${target.dueDate}.`,
        );
      } else {
        modifiedInput.payables[idx] = {
          ...target,
          dueDate: scenario.newPayDate,
        };
        assumptions.push(
          `Jadwal bayar hutang ${partyLabel} (${formatRupiahLabel(originalAmount)}) digeser dari ${target.dueDate} menjadi ${scenario.newPayDate}.`,
        );
      }
    } else {
      const fallbackAmount = toRupiah(Math.max(0, scenario.amount ?? 0));
      if (fallbackAmount <= 0) {
        throw new Error(`Payable '${scenario.payableId}' tidak ditemukan dan amount tidak valid`);
      }
      modifiedInput.payables.push({
        id: scenario.payableId,
        partyName: partyLabel,
        dueDate: scenario.newPayDate,
        outstandingAmount: fallbackAmount,
      });
      assumptions.push(
        `Payable '${scenario.payableId}' tidak ada di daftar dasar; disimulasikan sebagai pembayaran baru ${formatRupiahLabel(fallbackAmount)} pada ${scenario.newPayDate}.`,
      );
    }

    assumptions.push('Percepatan pembayaran hutang mengubah profil likuiditas mingguan tanpa mengubah laba akrual (profitImpact = 0).');
    profitImpact = 0;
  }

  const afterResult = forecastCashFlow13Weeks(modifiedInput);
  const afterForecast = afterResult.scenarios.base;

  const cashImpactWeek13 = toRupiah(afterForecast.endingCashWeek13 - beforeForecast.endingCashWeek13);
  const minCashDelta = toRupiah(afterForecast.minEndingCash - beforeForecast.minEndingCash);

  return {
    scenarioKind: scenario.kind,
    cashImpactWeek13,
    minCashDelta,
    beforeFirstNegativeDate: beforeForecast.firstNegativeCashDate,
    afterFirstNegativeDate: afterForecast.firstNegativeCashDate,
    profitImpact,
    beforeForecast,
    afterForecast,
    assumptions,
    provenance: {
      source: `simulasi_what_if:${scenario.kind}`,
      period: `${beforeResult.windowStart}..${beforeResult.windowEnd}`,
      asOfDate: beforeResult.asOfDate,
      assumptions,
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    },
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}

// ============================================================================
// 5. Prioritas Pembayaran Hutang Deterministik
// ============================================================================

export type PrioritizedPayableItem = {
  id: string;
  partyId: string | null;
  partyName: string;
  projectId: string | null;
  dueDate: string;
  outstandingAmount: number;
  daysOverdue: number;
  priorityScore: number;
  priorityRank: number;
  reasons: string[];
  action: 'pay_now' | 'defer_or_negotiate';
  recommendationNote: string;
};

export type PrioritizePayablesResult = {
  asOfDate: string;
  availableCash: number;
  orderedPayables: PrioritizedPayableItem[];
  recommendedPayNow: PrioritizedPayableItem[];
  deferOrNegotiate: PrioritizedPayableItem[];
  totalPayables: number;
  totalRecommendedPayNow: number;
  totalDeferred: number;
  remainingCashAfterPriority: number;
  assumptions: string[];
  provenance: AdvisorProvenance;
  disclaimer: typeof FINANCIAL_ADVISOR_DISCLAIMER;
};

function scoreSinglePayable(
  item: AdvisorPayableItem,
  asOfDate: string,
): { score: number; daysOverdue: number; reasons: string[] } {
  const daysOverdue = diffDaysUtc(item.dueDate, asOfDate, 'payables.dueDate', 'asOfDate');
  const daysUntilDue = -daysOverdue;
  const reasons: string[] = [];
  let score = 0;

  if (daysOverdue > 0) {
    // Tier 1: Sudah jatuh tempo (selalu mengungguli item yang belum jatuh tempo)
    score += 1000 + Math.min(500, daysOverdue * 5);
    reasons.push(`Sudah jatuh tempo ${daysOverdue} hari.`);
  } else if (daysUntilDue <= 14) {
    // Tier 2: Segera jatuh tempo (<= 14 hari ke depan)
    score += 500 + (14 - daysUntilDue) * 12;
    reasons.push(`Segera jatuh tempo dalam ${daysUntilDue} hari.`);
  } else if (daysUntilDue <= 30) {
    score += 40 + (30 - daysUntilDue);
    reasons.push(`Jatuh tempo dalam ${daysUntilDue} hari.`);
  } else {
    score += Math.max(0, 30 - Math.floor(daysUntilDue / 5));
    reasons.push(`Jatuh tempo masih ${daysUntilDue} hari lagi.`);
  }

  if (item.isActiveCriticalProject) {
    // Tier 3: Tagihan proyek aktif / kritis
    score += 200;
    reasons.push('Tagihan proyek aktif/kritis agar progres lapangan tidak terhenti.');
  }

  const isTaxOrPenalty = Boolean(
    item.isTaxOrPenalty
    || item.hasPenaltyRisk
    || item.category === 'tax'
    || item.category === 'penalty',
  );
  if (isTaxOrPenalty) {
    // Tier 4: Risiko denda / kewajiban pajak
    score += 100;
    reasons.push('Mengandung kewajiban pajak atau risiko denda keterlambatan.');
  }

  return { score, daysOverdue, reasons };
}

/**
 * Memberi skor prioritas deterministik untuk setiap hutang dengan hierarki tegas:
 * sudah jatuh tempo > segera jatuh tempo > tagihan proyek aktif/kritis > denda/pajak,
 * lalu mengalokasikan `availableCash` tanpa pernah melebihi kas tersedia.
 */
export function prioritizePayables(
  payables: AdvisorPayableItem[],
  availableCash: number,
  asOfDate: string,
): PrioritizePayablesResult {
  parseYmdUtcMs(asOfDate, 'asOfDate');
  if (!Number.isFinite(availableCash)) {
    throw new Error('availableCash tidak valid');
  }

  const safeAvailableCash = toRupiah(Math.max(0, availableCash));
  const scored: Array<{
    raw: AdvisorPayableItem;
    amount: number;
    score: number;
    daysOverdue: number;
    reasons: string[];
  }> = [];

  for (const raw of payables) {
    const amount = toRupiah(raw.outstandingAmount);
    if (amount <= 0) continue;
    parseYmdUtcMs(raw.dueDate, 'payables.dueDate');
    const { score, daysOverdue, reasons } = scoreSinglePayable(raw, asOfDate);
    scored.push({ raw, amount, score, daysOverdue, reasons });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score
      || a.raw.dueDate.localeCompare(b.raw.dueDate)
      || a.raw.id.localeCompare(b.raw.id),
  );

  let remainingCash = safeAvailableCash;
  let totalPayables = 0;
  let totalRecommendedPayNow = 0;
  let totalDeferred = 0;

  const orderedPayables: PrioritizedPayableItem[] = [];
  const recommendedPayNow: PrioritizedPayableItem[] = [];
  const deferOrNegotiate: PrioritizedPayableItem[] = [];

  scored.forEach((entry, index) => {
    totalPayables += entry.amount;
    const canPayNow = remainingCash >= entry.amount && entry.amount > 0;
    const partyName = String(entry.raw.partyName ?? '').trim() || String(entry.raw.partyId ?? entry.raw.id);

    let recommendationNote: string;
    if (canPayNow) {
      remainingCash = toRupiah(remainingCash - entry.amount);
      totalRecommendedPayNow += entry.amount;
      recommendationNote = `Bayar penuh sekarang (${formatRupiahLabel(entry.amount)}).`;
    } else {
      totalDeferred += entry.amount;
      recommendationNote = remainingCash > 0
        ? `Jadwalkan ulang / negosiasi termin: sisa kas ${formatRupiahLabel(remainingCash)} belum mencukupi pelunasan penuh ${formatRupiahLabel(entry.amount)}.`
        : `Tunda sementara / negosiasi perpanjangan jatuh tempo karena kas tersedia telah teralokasi.`;
    }

    const item: PrioritizedPayableItem = {
      id: String(entry.raw.id),
      partyId: entry.raw.partyId ?? null,
      partyName,
      projectId: entry.raw.projectId ?? null,
      dueDate: entry.raw.dueDate,
      outstandingAmount: entry.amount,
      daysOverdue: entry.daysOverdue,
      priorityScore: entry.score,
      priorityRank: index + 1,
      reasons: entry.reasons,
      action: canPayNow ? 'pay_now' : 'defer_or_negotiate',
      recommendationNote,
    };

    orderedPayables.push(item);
    if (canPayNow) {
      recommendedPayNow.push(item);
    } else {
      deferOrNegotiate.push(item);
    }
  });

  const assumptions = [
    'Bobot hierarki prioritas: sudah jatuh tempo (+1000..1500) > segera jatuh tempo <=14 hari (+500..668) > proyek aktif/kritis (+200) > denda/pajak (+100).',
    'Alokasi pembayaran bersifat utuh per faktur agar total recommendedPayNow tidak pernah melebihi availableCash.',
  ];

  return {
    asOfDate,
    availableCash: safeAvailableCash,
    orderedPayables,
    recommendedPayNow,
    deferOrNegotiate,
    totalPayables: toRupiah(totalPayables),
    totalRecommendedPayNow: toRupiah(totalRecommendedPayNow),
    totalDeferred: toRupiah(totalDeferred),
    remainingCashAfterPriority: remainingCash,
    assumptions,
    provenance: {
      source: 'daftar_hutang_dan_saldo_kas',
      period: `as_of_${asOfDate}`,
      asOfDate,
      assumptions,
      disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
    },
    disclaimer: FINANCIAL_ADVISOR_DISCLAIMER,
  };
}
