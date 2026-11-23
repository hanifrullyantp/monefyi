import { describe, expect, it } from 'vitest';
import {
  schedulePlanProgress,
  weightedActualProgress,
  computeProgressSummary,
  buildSCurveFromWorkItems,
} from './progressMetrics';
import type { Project } from '../store/appStore';
import type { WorkItem } from '../services/workItemService';

const project: Project = {
  id: 'p1',
  tenant_id: 'org',
  name: 'Test',
  code: 'PRJ',
  client_name: 'Klien',
  type: 'construction',
  status: 'active',
  start_date: '2026-01-01',
  end_date: '2026-06-01',
  total_budget_planned: 100_000_000,
  currency: 'IDR',
  progress_percentage: 50,
  health_status: 'on_track',
  planned_progress: 50,
  spent_amount: 0,
  total_received: 0,
  created_at: '',
  updated_at: '',
};

describe('progressMetrics', () => {
  it('schedulePlanProgress returns 0 at start and 100 at end', () => {
    expect(schedulePlanProgress('2026-01-01', '2026-06-01', new Date('2026-01-01'))).toBe(0);
    expect(schedulePlanProgress('2026-01-01', '2026-06-01', new Date('2026-06-01'))).toBe(100);
  });

  it('weightedActualProgress uses weights', () => {
    expect(weightedActualProgress([
      { progress_pct: 100, weight: 70 },
      { progress_pct: 0, weight: 30 },
    ])).toBe(70);
  });

  it('computeProgressSummary counts completed and overdue', () => {
    const items: WorkItem[] = [
      {
        id: '1', project_id: 'p1', name: 'A', planned_start: '2026-01-01', planned_end: '2026-02-01',
        progress_pct: 100, weight: 50, status: 'completed', sort_order: 0,
      },
      {
        id: '2', project_id: 'p1', name: 'B', planned_start: '2026-01-01', planned_end: '2026-01-15',
        progress_pct: 20, weight: 50, status: 'in_progress', sort_order: 1,
      },
    ];
    const s = computeProgressSummary(project, items);
    expect(s.completed).toBe(1);
    expect(s.total).toBe(2);
    expect(s.actual).toBe(60);
  });

  it('buildSCurveFromWorkItems returns cumulative points', () => {
    const items: WorkItem[] = [
      {
        id: '1', project_id: 'p1', name: 'P1', planned_start: '2026-01-01', planned_end: '2026-03-01',
        progress_pct: 50, weight: 50, status: 'in_progress', sort_order: 0,
      },
      {
        id: '2', project_id: 'p1', name: 'P2', planned_start: '2026-03-01', planned_end: '2026-06-01',
        progress_pct: 0, weight: 50, status: 'pending', sort_order: 1,
      },
    ];
    const curve = buildSCurveFromWorkItems(project, items);
    expect(curve.length).toBe(2);
    expect(curve[1].actual).toBeGreaterThanOrEqual(curve[0].actual);
  });
});
