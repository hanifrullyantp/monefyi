import type { WorkItem } from './workItemService';
import { updateWorkItem } from './workItemService';
import { mergeOrgSettingsJson } from './orgService';
import { supabase } from '../lib/supabase';
import type { GanttDependency, GanttTask } from '../lib/gantt/types';

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

function toGanttDep(raw: StoredGanttDep): GanttDependency {
  return {
    id: raw.id || depId(raw.from_task_id, raw.to_task_id),
    fromTaskId: raw.from_task_id,
    toTaskId: raw.to_task_id,
    type: raw.type === 'pending' ? 'pending' : 'finish_to_start',
  };
}

/**
 * Build dependency edges from work item `dependencies` arrays (predecessor UUIDs).
 */
export function depsFromWorkItems(items: WorkItem[]): GanttDependency[] {
  const edges: GanttDependency[] = [];
  for (const wi of items) {
    for (const predId of wi.dependencies || []) {
      edges.push({
        id: depId(predId, wi.id),
        fromTaskId: predId,
        toTaskId: wi.id,
        type: 'finish_to_start',
      });
    }
  }
  return edges;
}

/**
 * Load org-level dependencies (project ↔ project, cross-type) from org settings.
 */
export async function loadOrgGanttDependencies(orgId: string): Promise<GanttDependency[]> {
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
    if (!existing.includes(dep.fromTaskId)) {
      await updateWorkItem(dep.toTaskId, {
        dependencies: [...existing, dep.fromTaskId],
        dependency_type: 'FS',
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
