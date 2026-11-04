import type { Project } from '../store/appStore';
import type { WorkItem } from '../services/workItemService';
import {
  daysUntil,
  schedulePlanProgress,
  weightedActualProgress,
} from '../../../packages/domain/src/progress';

export { schedulePlanProgress, weightedActualProgress };

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
  const daysLeft = daysUntil(project.end_date);
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
