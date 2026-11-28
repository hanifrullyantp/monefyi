import { toRupiah } from './journal';

export const RAP_LEARNING_CATEGORIES = [
  'material',
  'labor',
  'equipment',
  'overhead',
  'other',
] as const;

export type RapLearningCategory = (typeof RAP_LEARNING_CATEGORIES)[number];

export type CategoryAmountMap = Record<RapLearningCategory, number>;

export type CompletedProjectHistoryRecord = {
  projectId: string;
  projectName?: string;
  projectType: string;
  status: 'completed' | 'finance_closed' | 'active' | 'draft';
  volume: number;
  volumeUnit: string;
  plannedByCategory: Partial<CategoryAmountMap>;
  actualByCategory: Partial<CategoryAmountMap>;
};

export type NormalizedProjectLearningPoint = {
  projectId: string;
  projectType: string;
  volume: number;
  volumeUnit: string;
  actualPerUnit: CategoryAmountMap;
  ratioActualOverPlanned: CategoryAmountMap;
};

export type RapRangeEstimate = {
  category: RapLearningCategory;
  low: number;
  mid: number;
  high: number;
  unitRateMid: number;
  historicalCalibrationRatio: number;
};

export type RapDraftProposal = {
  projectType: string;
  volume: number;
  volumeUnit: string;
  sampleSize: number;
  source: 'historical' | 'estimator_catalog_fallback';
  provenance: string;
  requiresOwnerApproval: true;
  lines: RapRangeEstimate[];
  totalLow: number;
  totalMid: number;
  totalHigh: number;
};

export type RapCompletionFeedback = {
  projectId: string;
  totalPlanned: number;
  totalActual: number;
  totalVarianceAmount: number;
  totalVariancePct: number;
  varianceByCategory: CategoryAmountMap;
  variancePctByCategory: CategoryAmountMap;
  overrunCategories: RapLearningCategory[];
  learnedRecord: CompletedProjectHistoryRecord;
};

export type RapMapeCase = {
  id: string;
  projectType: string;
  volume: number;
  volumeUnit: string;
  actualByCategory: Partial<CategoryAmountMap>;
};

export type RapMapeEvaluation = {
  sampleCount: number;
  mapeByCategory: CategoryAmountMap;
  overallMapePct: number;
};

const DEFAULT_CATALOG_RATES: CategoryAmountMap = {
  material: 2_200_000,
  labor: 950_000,
  equipment: 180_000,
  overhead: 170_000,
  other: 100_000,
};

function zeroMap(): CategoryAmountMap {
  return { material: 0, labor: 0, equipment: 0, overhead: 0, other: 0 };
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function normKey(s: string): string {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Mengompilasi dataset pembelajaran hanya dari proyek selesai (`completed`/`finance_closed`)
 * dan menormalkan biaya per satuan volume (`m2`, `unit`, dll.).
 */
export function buildRapLearningDataset(
  records: CompletedProjectHistoryRecord[],
): NormalizedProjectLearningPoint[] {
  const out: NormalizedProjectLearningPoint[] = [];
  for (const rec of records) {
    if (rec.status !== 'completed' && rec.status !== 'finance_closed') continue;
    if (!Number.isFinite(rec.volume) || rec.volume <= 0) continue;

    const actualPerUnit = zeroMap();
    const ratioActualOverPlanned = zeroMap();
    for (const cat of RAP_LEARNING_CATEGORIES) {
      const act = Math.max(0, Number(rec.actualByCategory[cat]) || 0);
      const plan = Math.max(0, Number(rec.plannedByCategory[cat]) || 0);
      actualPerUnit[cat] = act / rec.volume;
      ratioActualOverPlanned[cat] = plan > 0 ? act / plan : 1;
    }

    out.push({
      projectId: rec.projectId,
      projectType: normKey(rec.projectType),
      volume: rec.volume,
      volumeUnit: normKey(rec.volumeUnit || 'm2'),
      actualPerUnit,
      ratioActualOverPlanned,
    });
  }
  return out;
}

/**
 * Menghasilkan draf RAP rentang (`low`/`mid`/`high`) dari riwayat proyek serupa.
 * Jika sampel N < 3, otomatis memakai fallback katalog Estimator.
 * Selalu mengembalikan `requiresOwnerApproval: true`.
 */
export function generateRapDraftFromHistory(input: {
  projectType: string;
  volume: number;
  volumeUnit?: string;
  history: CompletedProjectHistoryRecord[];
  estimatorCatalogRates?: Partial<CategoryAmountMap>;
  excludeProjectId?: string;
}): RapDraftProposal {
  const volume = Math.max(1, Number(input.volume) || 1);
  const volumeUnit = normKey(input.volumeUnit || 'm2');
  const typeKey = normKey(input.projectType);
  const dataset = buildRapLearningDataset(input.history).filter(
    (p) =>
      p.projectId !== input.excludeProjectId &&
      p.projectType === typeKey &&
      p.volumeUnit === volumeUnit,
  );

  const sampleSize = dataset.length;
  const catalogRates: CategoryAmountMap = {
    ...DEFAULT_CATALOG_RATES,
    ...input.estimatorCatalogRates,
  };

  if (sampleSize >= 3) {
    const lines: RapRangeEstimate[] = RAP_LEARNING_CATEGORIES.map((category) => {
      const unitRates = dataset
        .map((d) => d.actualPerUnit[category])
        .sort((a, b) => a - b);
      const ratios = dataset
        .map((d) => d.ratioActualOverPlanned[category])
        .filter((r) => r > 0);
      const avgRatio = ratios.length
        ? ratios.reduce((s, r) => s + r, 0) / ratios.length
        : 1;

      const midRate = quantile(unitRates, 0.5);
      const lowRate = Math.min(midRate * 0.92, quantile(unitRates, 0.25));
      const highRate = Math.max(midRate * 1.1, quantile(unitRates, 0.75));

      return {
        category,
        low: toRupiah(lowRate * volume),
        mid: toRupiah(midRate * volume),
        high: toRupiah(highRate * volume),
        unitRateMid: toRupiah(midRate),
        historicalCalibrationRatio: Math.round(avgRatio * 1000) / 1000,
      };
    });

    return {
      projectType: input.projectType,
      volume,
      volumeUnit,
      sampleSize,
      source: 'historical',
      provenance: `Berdasarkan ${sampleSize} proyek serupa`,
      requiresOwnerApproval: true,
      lines,
      totalLow: toRupiah(lines.reduce((s, l) => s + l.low, 0)),
      totalMid: toRupiah(lines.reduce((s, l) => s + l.mid, 0)),
      totalHigh: toRupiah(lines.reduce((s, l) => s + l.high, 0)),
    };
  }

  const lines: RapRangeEstimate[] = RAP_LEARNING_CATEGORIES.map((category) => {
    const catalogRate = Math.max(0, Number(catalogRates[category]) || 0);
    const histRates = dataset.map((d) => d.actualPerUnit[category]).filter((v) => v > 0);
    const midRate = histRates.length
      ? catalogRate * 0.6 + (histRates.reduce((s, v) => s + v, 0) / histRates.length) * 0.4
      : catalogRate;
    return {
      category,
      low: toRupiah(midRate * 0.9 * volume),
      mid: toRupiah(midRate * volume),
      high: toRupiah(midRate * 1.15 * volume),
      unitRateMid: toRupiah(midRate),
      historicalCalibrationRatio: 1,
    };
  });

  const provenance =
    sampleSize > 0
      ? `Katalog Estimator + ${sampleSize} proyek historis (sampel N < 3)`
      : 'Katalog Estimator (sampel historis N < 3)';

  return {
    projectType: input.projectType,
    volume,
    volumeUnit,
    sampleSize,
    source: 'estimator_catalog_fallback',
    provenance,
    requiresOwnerApproval: true,
    lines,
    totalLow: toRupiah(lines.reduce((s, l) => s + l.low, 0)),
    totalMid: toRupiah(lines.reduce((s, l) => s + l.mid, 0)),
    totalHigh: toRupiah(lines.reduce((s, l) => s + l.high, 0)),
  };
}

/**
 * Feedback loop saat proyek ditutup: menghitung selisih RAP vs realisasi per kategori
 * dan membentuk titik pembelajaran historis baru.
 */
export function computeRapCompletionFeedback(input: {
  projectId: string;
  projectType: string;
  volume: number;
  volumeUnit?: string;
  plannedByCategory: Partial<CategoryAmountMap>;
  actualByCategory: Partial<CategoryAmountMap>;
}): RapCompletionFeedback {
  const varianceByCategory = zeroMap();
  const variancePctByCategory = zeroMap();
  const overrunCategories: RapLearningCategory[] = [];
  let totalPlanned = 0;
  let totalActual = 0;

  for (const cat of RAP_LEARNING_CATEGORIES) {
    const plan = toRupiah(Math.max(0, Number(input.plannedByCategory[cat]) || 0));
    const act = toRupiah(Math.max(0, Number(input.actualByCategory[cat]) || 0));
    const diff = toRupiah(act - plan);
    varianceByCategory[cat] = diff;
    variancePctByCategory[cat] = plan > 0 ? Math.round((diff / plan) * 1000) / 10 : 0;
    if (act > plan) overrunCategories.push(cat);
    totalPlanned += plan;
    totalActual += act;
  }

  const totalVarianceAmount = toRupiah(totalActual - totalPlanned);
  const totalVariancePct =
    totalPlanned > 0 ? Math.round((totalVarianceAmount / totalPlanned) * 1000) / 10 : 0;

  return {
    projectId: input.projectId,
    totalPlanned,
    totalActual,
    totalVarianceAmount,
    totalVariancePct,
    varianceByCategory,
    variancePctByCategory,
    overrunCategories,
    learnedRecord: {
      projectId: input.projectId,
      projectType: input.projectType,
      status: 'finance_closed',
      volume: Math.max(1, Number(input.volume) || 1),
      volumeUnit: input.volumeUnit || 'm2',
      plannedByCategory: input.plannedByCategory,
      actualByCategory: input.actualByCategory,
    },
  };
}

/**
 * Mengukur MAPE (Mean Absolute Percentage Error) per kategori & total terhadap proyek holdout.
 */
export function evaluateRapPredictionMape(input: {
  history: CompletedProjectHistoryRecord[];
  holdouts: RapMapeCase[];
  estimatorCatalogRates?: Partial<CategoryAmountMap>;
}): RapMapeEvaluation {
  const sumPctByCategory = zeroMap();
  const countByCategory = zeroMap();
  let sumTotalPct = 0;
  let validTotalCount = 0;

  for (const h of input.holdouts) {
    const draft = generateRapDraftFromHistory({
      projectType: h.projectType,
      volume: h.volume,
      volumeUnit: h.volumeUnit,
      history: input.history,
      estimatorCatalogRates: input.estimatorCatalogRates,
      excludeProjectId: h.id,
    });

    let actualSum = 0;
    let predSum = 0;
    for (const line of draft.lines) {
      const actual = Number(h.actualByCategory[line.category]) || 0;
      if (actual > 0) {
        const ape = (Math.abs(line.mid - actual) / actual) * 100;
        sumPctByCategory[line.category] += ape;
        countByCategory[line.category] += 1;
        actualSum += actual;
        predSum += line.mid;
      }
    }
    if (actualSum > 0) {
      sumTotalPct += (Math.abs(predSum - actualSum) / actualSum) * 100;
      validTotalCount += 1;
    }
  }

  const mapeByCategory = zeroMap();
  for (const cat of RAP_LEARNING_CATEGORIES) {
    mapeByCategory[cat] =
      countByCategory[cat] > 0
        ? Math.round((sumPctByCategory[cat] / countByCategory[cat]) * 100) / 100
        : 0;
  }

  return {
    sampleCount: input.holdouts.length,
    mapeByCategory,
    overallMapePct:
      validTotalCount > 0 ? Math.round((sumTotalPct / validTotalCount) * 100) / 100 : 0,
  };
}

