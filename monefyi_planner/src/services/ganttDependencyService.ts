import type { WorkItem } from './workItemService';
import { updateWorkItem } from './workItemService';
import { mergeOrgSettingsJson } from './orgService';
import { supabase } from '../lib/supabase';
import { isDemoOrInvalidUuid } from '../lib/demo/demoMode';
import {
  dependencyTypeDbToGantt,
  dependencyTypeGanttToDb,
  wouldCreateDependencyCycle,
  type DbDependencyType,
} from '../lib/gantt/criticalPath';
import type { DependencyType, GanttDependency, GanttTask } from '../lib/gantt/types';

const GANTT_DEPS_KEY = 'gantt_dependencies';
const LEGACY_DEPS_KEY = 'monefyi_gantt_deps';

export interface StoredGanttDep {
  id: string;
  from_task_id: string;
  to_task_id: string;
  type?: string;
}

function depId(from: string, to: string) {
  return `${from}__${to}`;
}

export { depId };

function normalizeDependencyType(rawType?: string | null): DependencyType {
  if (rawType === 'pending') return 'pending';
  if (
    rawType === 'finish_to_start' ||
    rawType === 'start_to_start' ||
    rawType === 'finish_to_finish' ||
    rawType === 'start_to_finish'
  ) {
    return rawType;
  }
  return dependencyTypeDbToGantt(rawType);
}

function toGanttDep(raw: StoredGanttDep): GanttDependency {
  return {
    id: raw.id || depId(raw.from_task_id, raw.to_task_id),
    fromTaskId: raw.from_task_id,
    toTaskId: raw.to_task_id,
    type: normalizeDependencyType(raw.type),
  };
}

/**
 * Build dependency edges from work item `dependencies` arrays (predecessor UUIDs).
 */
export function depsFromWorkItems(items: WorkItem[]): GanttDependency[] {
  const edges: GanttDependency[] = [];
  for (const wi of items) {
    const depType = dependencyTypeDbToGantt(wi.dependency_type);
    for (const predId of wi.dependencies || []) {
      edges.push({
        id: depId(predId, wi.id),
        fromTaskId: predId,
        toTaskId: wi.id,
        type: depType,
      });
    }
  }
  return edges;
}

/**
 * Load org-level dependencies (project ↔ project, cross-type) from org settings.
 */
export async function loadOrgGanttDependencies(orgId: string): Promise<GanttDependency[]> {
  if (isDemoOrInvalidUuid(orgId)) return [];

  const { data, error } = await supabase
    .from('planner_organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const settings = (data?.settings as Record<string, unknown>) || {};
  const stored = (settings[GANTT_DEPS_KEY] as StoredGanttDep[]) || [];
  return stored.map(toGanttDep);
}

/**
 * Load all dependencies: work items + org settings + legacy localStorage migration.
 */
export async function loadAllGanttDependencies(
  orgId: string,
  workItems: WorkItem[],
  tasks: GanttTask[] = [],
): Promise<GanttDependency[]> {
  const fromWi = depsFromWorkItems(workItems);
  const fromOrg = await loadOrgGanttDependencies(orgId);

  const merged = new Map<string, GanttDependency>();
  for (const d of [...fromWi, ...fromOrg]) merged.set(d.id, d);

  try {
    const legacyRaw = localStorage.getItem(`${LEGACY_DEPS_KEY}_${orgId}`);
    if (legacyRaw && tasks.length) {
      const legacy = JSON.parse(legacyRaw) as GanttDependency[];
      for (const d of legacy) {
        merged.set(d.id, d);
        await persistGanttDependency(orgId, d, tasks, workItems).catch(() => {});
      }
      localStorage.removeItem(`${LEGACY_DEPS_KEY}_${orgId}`);
    }
  } catch { /* ignore legacy migration errors */ }

  return [...merged.values()];
}

function usesWorkItemStorage(tasks: GanttTask[], fromId: string, toId: string): boolean {
  const from = tasks.find(t => t.id === fromId);
  const to = tasks.find(t => t.id === toId);
  return from?.type === 'work_item' && to?.type === 'work_item';
}

async function saveOrgGanttDependencies(orgId: string, deps: GanttDependency[]) {
  if (isDemoOrInvalidUuid(orgId)) return;
  const payload: StoredGanttDep[] = deps.map(d => ({
    id: d.id,
    from_task_id: d.fromTaskId,
    to_task_id: d.toTaskId,
    type: d.type,
  }));
  await mergeOrgSettingsJson(orgId, { [GANTT_DEPS_KEY]: payload });
}

/**
 * Persist a new dependency edge to DB (work item array or org settings).
 */
export async function persistGanttDependency(
  orgId: string,
  dep: GanttDependency,
  tasks: GanttTask[],
  workItems: WorkItem[],
): Promise<void> {
  if (usesWorkItemStorage(tasks, dep.fromTaskId, dep.toTaskId)) {
    const wi = workItems.find(w => w.id === dep.toTaskId);
    const existing = wi?.dependencies || [];
    const dbDepType = dependencyTypeGanttToDb(dep.type);
    if (!existing.includes(dep.fromTaskId) || wi?.dependency_type !== dbDepType) {
      await updateWorkItem(dep.toTaskId, {
        project_id: wi?.project_id,
        dependencies: existing.includes(dep.fromTaskId)
          ? existing
          : [...existing, dep.fromTaskId],
        dependency_type: dbDepType,
      });
    }
    return;
  }

  const orgDeps = await loadOrgGanttDependencies(orgId);
  if (!orgDeps.some(d => d.fromTaskId === dep.fromTaskId && d.toTaskId === dep.toTaskId)) {
    await saveOrgGanttDependencies(orgId, [...orgDeps, dep]);
  }
}

/**
 * Remove a dependency from DB.
 */
export async function removeGanttDependency(
  orgId: string,
  dep: GanttDependency,
  workItems: WorkItem[],
): Promise<void> {
  const wi = workItems.find(w => w.id === dep.toTaskId);
  if (wi?.dependencies?.includes(dep.fromTaskId)) {
    await updateWorkItem(dep.toTaskId, {
      project_id: wi.project_id,
      dependencies: (wi.dependencies || []).filter(id => id !== dep.fromTaskId),
    });
    return;
  }

  const orgDeps = await loadOrgGanttDependencies(orgId);
  const filtered = orgDeps.filter(d => d.id !== dep.id);
  if (filtered.length !== orgDeps.length) {
    await saveOrgGanttDependencies(orgId, filtered);
  }
}

/**
 * Replace all predecessor IDs for `workItemId` after verifying DAG acyclicity
 * via `wouldCreateDependencyCycle`.
 */
export async function setWorkItemPredecessors(
  workItemId: string,
  predecessorIds: string[],
  allWorkItems: WorkItem[],
  depType: DependencyType | DbDependencyType = 'finish_to_start',
): Promise<WorkItem> {
  const uniquePreds = [...new Set(predecessorIds.filter(Boolean))];
  const ganttType = normalizeDependencyType(depType);
  const dbDepType = dependencyTypeGanttToDb(depType);

  // Build graph of all other items' dependencies (replacing incoming edges of workItemId)
  const workingDeps = depsFromWorkItems(allWorkItems).filter(
    d => d.toTaskId !== workItemId,
  );

  for (const predId of uniquePreds) {
    if (predId === workItemId || wouldCreateDependencyCycle(predId, workItemId, workingDeps)) {
      throw new Error('Dependensi melingkar (circular dependency) tidak diizinkan');
    }
    workingDeps.push({
      id: depId(predId, workItemId),
      fromTaskId: predId,
      toTaskId: workItemId,
      type: ganttType,
    });
  }

  const targetItem = allWorkItems.find(w => w.id === workItemId);
  return updateWorkItem(workItemId, {
    ...(targetItem?.project_id ? { project_id: targetItem.project_id } : {}),
    dependencies: uniquePreds,
    dependency_type: dbDepType,
  });
}
