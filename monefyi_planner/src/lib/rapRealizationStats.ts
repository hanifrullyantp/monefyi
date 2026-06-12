import type { RapItem } from '../services/rapService';
import type { RapActualAgg } from '../services/costService';
import type { RapRowStatus } from '../utils/rapTableRows';

export interface RapRealizationStats {
  totalItems: number;
  doneCount: number;
  costsSum: number;
  rapTotal: number;
  realizationPct: number;
  grossProfitEstimate: number;
  projectOmzet: number;
}

export function rapItemStatus(
  item: RapItem,
  actual?: RapActualAgg,
): RapRowStatus {
  const actualQty = actual?.qty ?? 0;
  const plannedQty = Number(item.quantity) || 0;
  const fillPct = plannedQty > 0 ? (actualQty / plannedQty) * 100 : 0;

  if (actualQty === 0) return 'none';
  if (plannedQty > 0 && actualQty >= plannedQty) return 'done';
  if (fillPct > 100) return 'over';
  return 'under';
}

const STATUS_SORT_ORDER: Record<RapRowStatus, number> = {
  none: 0,
  under: 1,
  over: 2,
  done: 3,
};

export function sortByRealizationStatus<T extends { status: RapRowStatus }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
}

export function computeRapRealizationStats(
  rapItems: RapItem[],
  rapActuals: Record<string, RapActualAgg>,
  costsSum: number,
  rapTotal: number,
  projectOmzet: number,
): RapRealizationStats {
  let doneCount = 0;
  for (const item of rapItems) {
    const status = rapItemStatus(item, rapActuals[item.id]);
    if (status === 'done' || status === 'over') doneCount += 1;
  }

  const realizationPct = rapTotal > 0 ? Math.round((costsSum / rapTotal) * 1000) / 10 : 0;

  return {
    totalItems: rapItems.length,
    doneCount,
    costsSum,
    rapTotal,
    realizationPct,
    grossProfitEstimate: projectOmzet - costsSum,
    projectOmzet,
  };
}
