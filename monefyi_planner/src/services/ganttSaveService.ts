import type { GanttSnapshot } from '../lib/gantt/snapshot';
import type { GanttTask } from '../lib/gantt/types';
import { updateProject as updateProjectApi } from './projectService';
import { updateWorkItem } from './workItemService';
import { persistGanttDependency, removeGanttDependency } from './ganttDependencyService';
import { saveBarColors } from './ganttBarColorService';
import type { WorkItem } from './workItemService';
import { mergeOrgSettingsJson } from './orgService';
import { supabase } from '../lib/supabase';

/**
 * Persist all gantt changes vs baseline snapshot to Supabase.
 */
export async function saveGanttChanges(
  orgId: string,
  current: GanttSnapshot,
  baseline: GanttSnapshot,
  workItems: WorkItem[],
  currency?: string,
): Promise<WorkItem[]> {
  const wiMap = new Map(workItems.map(w => [w.id, { ...w }]));

  for (const task of current.tasks) {
    const base = baseline.tasks.find(t => t.id === task.id);
    if (!base) continue;

    const changed = task.startDate !== base.startDate
      || task.endDate !== base.endDate
      || task.name !== base.name
      || task.progress !== base.progress
      || task.status !== base.status;

    if (!changed) continue;

    if (task.type === 'project') {
      await updateProjectApi(task.id, {
        name: task.name,
        start_date: task.startDate,
        end_date: task.endDate,
        status: task.status as import('../store/appStore').Project['status'],
      }, currency);
    } else {
      await updateWorkItem(task.id, {
        name: task.name,
        planned_start: task.startDate,
        planned_end: task.endDate,
        progress_pct: task.progress,
        status: task.status,
      });
      const wi = wiMap.get(task.id);
      if (wi) {
        wi.name = task.name;
        wi.planned_start = task.startDate;
        wi.planned_end = task.endDate;
        wi.progress_pct = task.progress;
        wi.status = task.status;
      }
    }
  }

  const baseDepIds = new Set(baseline.dependencies.map(d => d.id));
  const curDepIds = new Set(current.dependencies.map(d => d.id));

  for (const dep of current.dependencies) {
    if (!baseDepIds.has(dep.id)) {
      await persistGanttDependency(orgId, dep, current.tasks, [...wiMap.values()]);
      const wi = wiMap.get(dep.toTaskId);
      if (wi && !(wi.dependencies || []).includes(dep.fromTaskId)) {
        wi.dependencies = [...(wi.dependencies || []), dep.fromTaskId];
      }
    }
  }

  for (const dep of baseline.dependencies) {
    if (!curDepIds.has(dep.id)) {
      await removeGanttDependency(orgId, dep, [...wiMap.values()]);
      const wi = wiMap.get(dep.toTaskId);
      if (wi) {
        wi.dependencies = (wi.dependencies || []).filter(id => id !== dep.fromTaskId);
      }
    }
  }

  if (JSON.stringify(current.barColors) !== JSON.stringify(baseline.barColors)) {
    await saveBarColors(orgId, current.barColors);
  }

  if (JSON.stringify(current.projectOrder) !== JSON.stringify(baseline.projectOrder)) {
    await mergeOrgSettingsJson(orgId, { gantt_project_order: current.projectOrder });
  }

  return [...wiMap.values()];
}

export async function loadProjectOrder(orgId: string): Promise<string[] | null> {
  const { data } = await supabase
    .from('planner_organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();
  const settings = (data?.settings as Record<string, unknown>) || {};
  const order = settings.gantt_project_order;
  return Array.isArray(order) ? (order as string[]) : null;
}

export function applyBarColors(tasks: GanttTask[], colors: Record<string, string>): GanttTask[] {
  return tasks.map(t => ({
    ...t,
    barColor: colors[t.id] || undefined,
  }));
}
