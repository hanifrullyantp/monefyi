/**
 * Recommendation engine for the Monefyi Assistant.
 *
 * Produces "what to do next" suggestions:
 *  - cost: RAP items not yet (fully) realized -> suggest recording the purchase.
 *  - progress: next unfinished work item (by sort_order) -> suggest a progress update.
 *  - history: most frequently used commands (grouped by normalized signature).
 *
 * Each recommendation carries a ready-to-parse `command` string so clicking it
 * flows through the normal pipeline into the editable confirm form.
 */

import type { RapItem } from '../services/rapService';
import type { WorkItem } from '../services/workItemService';
import type { CommandLog } from '../store/appStore';
import { buildSlots } from './commandNormalize';

export type RecommendationType = 'cost' | 'progress' | 'history';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  label: string;
  command: string;
  detail?: string;
}

/** RAP items whose realized quantity is below planned -> purchase suggestions. */
export function costRecommendations(
  rapItems: RapItem[],
  costByRap: Record<string, { qty: number; amount: number }>,
  limit = 4,
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const item of rapItems) {
    const planned = Number(item.quantity) || 0;
    if (planned <= 0) continue;

    const realized = costByRap[item.id]?.qty || 0;
    const remaining = planned - realized;
    if (remaining <= 0) continue;

    const unit = item.unit || '';
    const price = Number(item.unit_price) || 0;
    const qtyStr = Number.isInteger(remaining) ? String(remaining) : remaining.toFixed(1);

    const command = price > 0
      ? `catat ${item.name} ${qtyStr} ${unit} ${price}`.trim()
      : `catat ${item.name} ${qtyStr} ${unit}`.trim();

    recs.push({
      id: `cost-${item.id}`,
      type: 'cost',
      label: `Catat belanja ${item.name}`,
      command,
      detail: `Sisa RAP: ${qtyStr} ${unit}`.trim(),
    });

    if (recs.length >= limit) break;
  }

  return recs;
}

/** Next unfinished work items (by sort_order) -> progress update suggestions. */
export function progressRecommendations(
  workItems: WorkItem[],
  limit = 3,
): Recommendation[] {
  const pending = [...workItems]
    .filter(wi => (Number(wi.progress_pct) || 0) < 100 && wi.status !== 'completed')
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  return pending.slice(0, limit).map(wi => {
    const current = Number(wi.progress_pct) || 0;
    return {
      id: `progress-${wi.id}`,
      type: 'progress' as const,
      label: `Update progress ${wi.name}`,
      command: `update progress ${wi.name} `,
      detail: current > 0 ? `Sekarang ${current}%` : 'Belum dimulai',
    };
  });
}

/** Most frequent commands from history, grouped by normalized signature. */
export function historyRecommendations(
  logs: CommandLog[],
  limit = 4,
): Recommendation[] {
  const groups = new Map<string, { sample: string; count: number }>();

  for (const log of logs) {
    if (!log.input?.trim()) continue;
    const sig = buildSlots(log.input).signature || log.input.toLowerCase();
    const g = groups.get(sig);
    if (g) g.count += 1;
    else groups.set(sig, { sample: log.input, count: 1 });
  }

  return [...groups.values()]
    .filter(g => g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((g, i) => ({
      id: `history-${i}`,
      type: 'history' as const,
      label: g.sample,
      command: g.sample,
      detail: `${g.count}x dipakai`,
    }));
}

/** Combine next-action recommendations (cost + progress) for a project. */
export function buildNextActions(params: {
  rapItems: RapItem[];
  costByRap: Record<string, { qty: number; amount: number }>;
  workItems: WorkItem[];
}): Recommendation[] {
  return [
    ...costRecommendations(params.rapItems, params.costByRap),
    ...progressRecommendations(params.workItems),
  ];
}
