import type { GanttSnapshot } from '../lib/gantt/snapshot';
import type { GanttTask } from '../lib/gantt/types';
import { dependencyTypeGanttToDb } from '../lib/gantt/criticalPath';
import { updateProject as updateProjectApi } from './projectService';
import { updateWorkItem, updateProjectProgressFromWorkItems } from './workItemService';
import { persistGanttDependency, removeGanttDependency } from './ganttDependencyService';
import { saveBarColors } from './ganttBarColorService';
import type { WorkItem } from './workItemService';
import { mergeOrgSettingsJson } from './orgService';
import { supabase } from '../lib/supabase';

/**
 * Persist all gantt changes vs baseline snapshot to Supabase.
 */
export interface SaveGanttResult {
  workItems: WorkItem[];
  projectProgress: Record<string, number>;
}

export interface SaveGanttOptions {
  forceOverwrite?: boolean;
}

function getTaskAssignee(task: GanttTask): string | null {
  if (task.assignedMemberId !== undefined) {
    return task.assignedMemberId ?? null;
  }
  return task.assigneeId ?? null;
}

export async function saveGanttChanges(
  orgId: string,
  current: GanttSnapshot,
  baseline: GanttSnapshot,
  workItems: WorkItem[],
  currency?: string,
  options?: SaveGanttOptions,
): Promise<SaveGanttResult> {
  const wiMap = new Map(workItems.map(w => [w.id, { ...w }]));

  for (const task of current.tasks) {
    const base = baseline.tasks.find(t => t.id === task.id);
    if (!base) continue;

    const taskAssignee = getTaskAssignee(task);
    const baseAssignee = getTaskAssignee(base);

    const changed = task.startDate !== base.startDate
      || task.endDate !== base.endDate
      || task.name !== base.name
      || task.progress !== base.progress
      || task.status !== base.status
      || task.priority !== base.priority
      || taskAssignee !== baseAssignee;

    if (!changed) continue;

    if (task.type === 'project') {
      await updateProjectApi(task.id, {
        name: task.name,
        start_date: task.startDate,
        end_date: task.endDate,
        status: task.status as import('../store/appStore').Project['status'],
      }, currency);
    } else {
      const existingWi = wiMap.get(task.id);
      const payload: Partial<WorkItem> = {
        name: task.name,
        planned_start: task.startDate,
        planned_end: task.endDate,
        progress_pct: task.progress,
        status: task.status,
      };
      if (task.priority !== base.priority) {
        payload.priority = task.priority;
      }
      if (taskAssignee !== baseAssignee) {
        payload.assigned_member_id = taskAssignee;
      }

      const expectedUpdatedAt = options?.forceOverwrite
        ? undefined
        : (task.updatedAt ?? existingWi?.updated_at ?? undefined);

      // Rethrows WorkItemConflictError cleanly so UI can present F-19 conflict dialog
      const savedWi = await updateWorkItem(task.id, payload, {
        expectedUpdatedAt,
      });

      if (existingWi) {
        Object.assign(existingWi, savedWi);
      } else {
        wiMap.set(task.id, savedWi);
      }
    }
  }

  const baseDepIds = new Set(baseline.dependencies.map(d => d.id));
  const curDepIds = new Set(current.dependencies.map(d => d.id));

  for (const dep of current.dependencies) {
    if (!baseDepIds.has(dep.id)) {
      await persistGanttDependency(orgId, dep, current.tasks, [...wiMap.values()]);
      const wi = wiMap.get(dep.toTaskId);
      if (wi) {
        if (!(wi.dependencies || []).includes(dep.fromTaskId)) {
          wi.dependencies = [...(wi.dependencies || []), dep.fromTaskId];
        }
        wi.dependency_type = dependencyTypeGanttToDb(dep.type);
        wi.updated_at = new Date().toISOString();
      }
    }
  }

  for (const dep of baseline.dependencies) {
    if (!curDepIds.has(dep.id)) {
      await removeGanttDependency(orgId, dep, [...wiMap.values()]);
      const wi = wiMap.get(dep.toTaskId);
      if (wi) {
        wi.dependencies = (wi.dependencies || []).filter(id => id !== dep.fromTaskId);
        wi.updated_at = new Date().toISOString();
      }
    }
  }

  if (JSON.stringify(current.barColors) !== JSON.stringify(baseline.barColors)) {
    await saveBarColors(orgId, current.barColors);
  }

  if (JSON.stringify(current.projectOrder) !== JSON.stringify(baseline.projectOrder)) {
    await mergeOrgSettingsJson(orgId, { gantt_project_order: current.projectOrder });
  }

  const projectTask = current.tasks.find(t => t.type === 'project');
  const affectedProjectIds = new Set<string>();
  for (const task of current.tasks) {
    if (task.type !== 'project') {
      affectedProjectIds.add(task.projectId);
    }
  }
  if (projectTask) affectedProjectIds.add(projectTask.id);

  const projectProgress: Record<string, number> = {};
  for (const pid of affectedProjectIds) {
    const avg = await updateProjectProgressFromWorkItems(pid);
    if (avg != null) projectProgress[pid] = avg;
  }

  return { workItems: [...wiMap.values()], projectProgress };
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
