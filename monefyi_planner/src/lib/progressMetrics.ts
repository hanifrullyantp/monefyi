import type { Project } from '../store/appStore';
import type { WorkItem } from '../services/workItemService';

const DAY_MS = 86400000;

/**
 * Progress rencana berdasarkan posisi hari ini di antara start–end (0–100).
 */
export function schedulePlanProgress(start: string, end: string, asOf = new Date()): number {
  const startMs = new Date(`${start.slice(0, 10)}T00:00:00`).getTime();
  const endMs = new Date(`${end.slice(0, 10)}T00:00:00`).getTime();
  const now = asOf.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  if (now <= startMs) return 0;
  if (now >= endMs) return 100;
  return Math.round(((now - startMs) / (endMs - startMs)) * 100);
}

/** Rata-rata tertimbang progress_pct dari work items. */
export function weightedActualProgress(
  items: Array<{ progress_pct?: string | number | null; weight?: string | number | null }>,
): number {
  if (!items.length) return 0;
  let totalWeight = 0;
  let sum = 0;
  for (const wi of items) {
    const w = Number(wi.weight) > 0 ? Number(wi.weight) : 1;
    totalWeight += w;
    sum += (Number(wi.progress_pct) || 0) * w;
  }
  return Math.round(sum / totalWeight);
}

export type ProgressSummary = {
  plan: number;
  actual: number;
  deviation: number;
  spi: number;
  completed: number;
  total: number;
  inProgress: number;
  overdue: number;
  daysLeft: number;
};

export function computeProgressSummary(project: Project, workItems: WorkItem[]): ProgressSummary {
  const plan = schedulePlanProgress(project.start_date, project.end_date);
  const actual = workItems.length
    ? weightedActualProgress(workItems)
    : Math.round(project.progress_percentage || 0);
  const deviation = actual - plan;
  const completed = workItems.filter(w => Number(w.progress_pct) >= 100).length;
  const overdue = workItems.filter(w => {
    const pct = Number(w.progress_pct) || 0;
    if (pct >= 100) return false;
    return schedulePlanProgress(w.planned_start, w.planned_end) >= 100;
  }).length;
  const daysLeft = Math.ceil(
    (new Date(`${project.end_date.slice(0, 10)}T00:00:00`).getTime() - Date.now()) / DAY_MS,
  );
  return {
    plan,
    actual,
    deviation,
    spi: plan > 0 ? Math.round((actual / plan) * 100) / 100 : 1,
    completed,
    total: workItems.length,
    inProgress: workItems.filter(w => {
      const p = Number(w.progress_pct) || 0;
      return p > 0 && p < 100;
    }).length,
    overdue,
    daysLeft,
  };
}

export type SCurvePoint = { label: string; planned: number; actual: number };

/** Kumulatif S-curve dari work items (urut planned_end). */
export function buildSCurveFromWorkItems(project: Project, workItems: WorkItem[]): SCurvePoint[] {
  if (!workItems.length) {
    return [{
      label: 'Sekarang',
      planned: schedulePlanProgress(project.start_date, project.end_date),
      actual: Math.round(project.progress_percentage || 0),
    }];
  }

  const sorted = [...workItems].sort((a, b) =>
    (a.planned_end || a.planned_start).localeCompare(b.planned_end || b.planned_start),
  );
  const totalWeight = sorted.reduce((s, w) => s + (Number(w.weight) > 0 ? Number(w.weight) : 1), 0) || sorted.length;

  let cumPlanned = 0;
  let cumActual = 0;
  return sorted.map(wi => {
    const w = Number(wi.weight) > 0 ? Number(wi.weight) : 1;
    cumPlanned += (schedulePlanProgress(wi.planned_start, wi.planned_end) * w) / totalWeight;
    cumActual += ((Number(wi.progress_pct) || 0) * w) / totalWeight;
    const label = wi.name.length > 14 ? `${wi.name.slice(0, 14)}…` : wi.name;
    return {
      label,
      planned: Math.min(100, Math.round(cumPlanned)),
      actual: Math.min(100, Math.round(cumActual)),
    };
  });
}

export function workItemStatusLabel(wi: WorkItem): 'done' | 'active' | 'overdue' | 'pending' {
  const pct = Number(wi.progress_pct) || 0;
  if (pct >= 100 || wi.status === 'completed') return 'done';
  const plan = schedulePlanProgress(wi.planned_start, wi.planned_end);
  if (plan >= 100) return 'overdue';
  if (pct > 0 || wi.status === 'in_progress') return 'active';
  return 'pending';
}
