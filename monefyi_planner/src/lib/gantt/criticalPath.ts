import type { WorkItem } from '../../services/workItemService';
import type { DependencyType, GanttDependency, GanttTask } from './types';

const DAY_MS = 86_400_000;

export type DbDependencyType = 'FS' | 'FF' | 'SS' | 'SF';

export interface CriticalPathTaskMetrics {
  taskId: string;
  projectId: string;
  durationDays: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloatDays: number;
  isCritical: boolean;
  isCyclic: boolean;
}

export interface CriticalPathResult {
  tasksById: Map<string, CriticalPathTaskMetrics>;
  metrics: Record<string, CriticalPathTaskMetrics>;
  criticalTaskIds: Set<string>;
  criticalDependencyIds: Set<string>;
  cyclicTaskIds: Set<string>;
  hasCycle: boolean;
  projectDurationDays: number;
  projectDurations: Record<string, number>;
}

export interface TaskDateUpdate {
  id: string;
  startDate: string;
  endDate: string;
}

function parseIsoDayMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso || '').trim());
  if (m) {
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const parsed = Date.parse(iso);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  return 0;
}

function addDaysUtc(iso: string, days: number): string {
  const baseMs = parseIsoDayMs(iso);
  return new Date(baseMs + days * DAY_MS).toISOString().slice(0, 10);
}

function diffDaysUtc(startIso: string, endIso: string): number {
  return Math.round((parseIsoDayMs(endIso) - parseIsoDayMs(startIso)) / DAY_MS);
}

export function dependencyTypeDbToGantt(dbType?: string | null): DependencyType {
  switch ((dbType || '').toUpperCase()) {
    case 'SS':
    case 'START_TO_START':
      return 'start_to_start';
    case 'FF':
    case 'FINISH_TO_FINISH':
      return 'finish_to_finish';
    case 'SF':
    case 'START_TO_FINISH':
      return 'start_to_finish';
    case 'FS':
    case 'FINISH_TO_START':
    default:
      return 'finish_to_start';
  }
}

export function dependencyTypeGanttToDb(
  ganttType?: DependencyType | string | null,
): DbDependencyType {
  switch (ganttType) {
    case 'start_to_start':
    case 'SS':
      return 'SS';
    case 'finish_to_finish':
    case 'FF':
      return 'FF';
    case 'start_to_finish':
    case 'SF':
      return 'SF';
    case 'finish_to_start':
    case 'pending':
    case 'FS':
    default:
      return 'FS';
  }
}

/**
 * Checks whether adding a directed dependency edge `fromId -> toId`
 * would introduce a cycle in the DAG.
 */
export function wouldCreateDependencyCycle(
  fromId: string,
  toId: string,
  deps: Pick<GanttDependency, 'fromTaskId' | 'toTaskId'>[],
): boolean {
  if (!fromId || !toId) return false;
  if (fromId === toId) return true;

  const adj = new Map<string, string[]>();
  for (const dep of deps) {
    if (!dep.fromTaskId || !dep.toTaskId || dep.fromTaskId === dep.toTaskId) continue;
    let next = adj.get(dep.fromTaskId);
    if (!next) {
      next = [];
      adj.set(dep.fromTaskId, next);
    }
    next.push(dep.toTaskId);
  }

  // If `fromId` is reachable from `toId` along existing edges, adding `fromId -> toId` creates a cycle.
  const visited = new Set<string>();
  const queue: string[] = [toId];
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === fromId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const next of adj.get(cur) || []) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return false;
}

function isEdgeTight(
  depType: DependencyType,
  from: CriticalPathTaskMetrics,
  to: CriticalPathTaskMetrics,
): boolean {
  switch (depType) {
    case 'start_to_start':
      return to.lateStart - from.earlyStart <= 0;
    case 'finish_to_finish':
      return to.lateFinish - from.earlyFinish <= 0;
    case 'start_to_finish':
      return to.lateFinish - from.earlyStart <= 0;
    case 'finish_to_start':
    case 'pending':
    default:
      return to.lateStart - from.earlyFinish <= 0;
  }
}

function computeProjectCriticalPath(
  projectId: string,
  groupTasks: GanttTask[],
  dependencies: GanttDependency[],
): {
  taskMetrics: CriticalPathTaskMetrics[];
  criticalDependencyIds: string[];
  cyclicTaskIds: string[];
  hasCycle: boolean;
  projectDurationDays: number;
} {
  const uniqueTasks = new Map<string, GanttTask>();
  for (const t of groupTasks) {
    uniqueTasks.set(t.id, t);
  }
  const nodes = [...uniqueTasks.values()];
  if (nodes.length === 0) {
    return {
      taskMetrics: [],
      criticalDependencyIds: [],
      cyclicTaskIds: [],
      hasCycle: false,
      projectDurationDays: 0,
    };
  }

  const minStartMs = Math.min(...nodes.map(t => parseIsoDayMs(t.startDate)));
  const durationById = new Map<string, number>();
  const plannedOffsetById = new Map<string, number>();

  for (const t of nodes) {
    const startMs = parseIsoDayMs(t.startDate);
    const endMs = parseIsoDayMs(t.endDate);
    const durationDays = Math.max(1, Math.round((endMs - startMs) / DAY_MS) + 1);
    const offset = Math.max(0, Math.round((startMs - minStartMs) / DAY_MS));
    durationById.set(t.id, durationDays);
    plannedOffsetById.set(t.id, offset);
  }

  // Deduplicate intra-project edges (ignore self-loops and cross-project edges)
  const validEdges: GanttDependency[] = [];
  const seenEdgeKeys = new Set<string>();
  const preds = new Map<string, GanttDependency[]>();
  const succs = new Map<string, GanttDependency[]>();
  const inDegree = new Map<string, number>();

  for (const t of nodes) {
    preds.set(t.id, []);
    succs.set(t.id, []);
    inDegree.set(t.id, 0);
  }

  for (const dep of dependencies) {
    if (!uniqueTasks.has(dep.fromTaskId) || !uniqueTasks.has(dep.toTaskId)) continue;
    if (dep.fromTaskId === dep.toTaskId) continue;
    const edgeKey = `${dep.fromTaskId}->${dep.toTaskId}:${dep.type}`;
    if (seenEdgeKeys.has(edgeKey)) continue;
    seenEdgeKeys.add(edgeKey);
    validEdges.push(dep);
    preds.get(dep.toTaskId)!.push(dep);
    succs.get(dep.fromTaskId)!.push(dep);
    inDegree.set(dep.toTaskId, (inDegree.get(dep.toTaskId) || 0) + 1);
  }

  // Kahn's topological sort
  const queue: string[] = [];
  for (const t of nodes) {
    if ((inDegree.get(t.id) || 0) === 0) {
      queue.push(t.id);
    }
  }

  const topoOrder: string[] = [];
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    topoOrder.push(id);
    for (const edge of succs.get(id) || []) {
      const nextDeg = (inDegree.get(edge.toTaskId) || 0) - 1;
      inDegree.set(edge.toTaskId, nextDeg);
      if (nextDeg === 0) {
        queue.push(edge.toTaskId);
      }
    }
  }

  const topoSet = new Set(topoOrder);
  const cyclicTaskIds: string[] = [];
  for (const t of nodes) {
    if (!topoSet.has(t.id)) {
      cyclicTaskIds.push(t.id);
    }
  }
  const hasCycle = cyclicTaskIds.length > 0;

  // Forward pass over acyclic topological order
  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();
  let projectEarlyFinish = 0;

  for (const id of topoOrder) {
    const dur = durationById.get(id)!;
    let es = plannedOffsetById.get(id)!;

    for (const edge of preds.get(id) || []) {
      if (!topoSet.has(edge.fromTaskId)) continue;
      const predEs = earlyStart.get(edge.fromTaskId)!;
      const predEf = earlyFinish.get(edge.fromTaskId)!;

      let constraint = predEf;
      switch (edge.type) {
        case 'start_to_start':
          constraint = predEs;
          break;
        case 'finish_to_finish':
          constraint = predEf - dur;
          break;
        case 'start_to_finish':
          constraint = predEs - dur;
          break;
        case 'finish_to_start':
        case 'pending':
        default:
          constraint = predEf;
          break;
      }
      if (constraint > es) {
        es = constraint;
      }
    }

    const ef = es + dur;
    earlyStart.set(id, es);
    earlyFinish.set(id, ef);
    if (ef > projectEarlyFinish) {
      projectEarlyFinish = ef;
    }
  }

  let projectDurationDays = projectEarlyFinish;
  for (const id of cyclicTaskIds) {
    const es = plannedOffsetById.get(id)!;
    const ef = es + durationById.get(id)!;
    if (ef > projectDurationDays) {
      projectDurationDays = ef;
    }
  }

  // Backward pass over reverse topological order
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const dur = durationById.get(id)!;
    const acyclicSuccs = (succs.get(id) || []).filter(edge => topoSet.has(edge.toTaskId));

    let lf = projectEarlyFinish;
    if (acyclicSuccs.length > 0) {
      lf = Infinity;
      for (const edge of acyclicSuccs) {
        const succLs = lateStart.get(edge.toTaskId)!;
        const succLf = lateFinish.get(edge.toTaskId)!;

        let constraint = succLs;
        switch (edge.type) {
          case 'start_to_start':
            constraint = succLs + dur;
            break;
          case 'finish_to_finish':
            constraint = succLf;
            break;
          case 'start_to_finish':
            constraint = succLf + dur;
            break;
          case 'finish_to_start':
          case 'pending':
          default:
            constraint = succLs;
            break;
        }
        if (constraint < lf) {
          lf = constraint;
        }
      }
    }

    lateFinish.set(id, lf);
    lateStart.set(id, lf - dur);
  }

  const metricsMap = new Map<string, CriticalPathTaskMetrics>();
  const taskMetrics: CriticalPathTaskMetrics[] = [];

  for (const t of nodes) {
    const dur = durationById.get(t.id)!;
    const isCyclic = !topoSet.has(t.id);

    const es = isCyclic ? plannedOffsetById.get(t.id)! : earlyStart.get(t.id)!;
    const ef = isCyclic ? es + dur : earlyFinish.get(t.id)!;
    const lf = isCyclic ? Math.max(projectDurationDays, ef) : lateFinish.get(t.id)!;
    const ls = lf - dur;
    const totalFloatDays = ls - es;
    const isCritical = !isCyclic && totalFloatDays <= 0;

    const m: CriticalPathTaskMetrics = {
      taskId: t.id,
      projectId,
      durationDays: dur,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloatDays,
      isCritical,
      isCyclic,
    };
    metricsMap.set(t.id, m);
    taskMetrics.push(m);
  }

  const criticalDependencyIds: string[] = [];
  for (const edge of validEdges) {
    const fromM = metricsMap.get(edge.fromTaskId);
    const toM = metricsMap.get(edge.toTaskId);
    if (!fromM || !toM) continue;
    if (fromM.isCritical && toM.isCritical && isEdgeTight(edge.type, fromM, toM)) {
      criticalDependencyIds.push(edge.id);
    }
  }

  return {
    taskMetrics,
    criticalDependencyIds,
    cyclicTaskIds,
    hasCycle,
    projectDurationDays,
  };
}

/**
 * Computes Critical Path Method (CPM) forward/backward pass isolated per `projectId`.
 * Filters out `type === 'project'` summary bars and safely breaks pre-existing cycles.
 */
export function computeCriticalPath(
  tasks: GanttTask[],
  dependencies: GanttDependency[],
): CriticalPathResult {
  const workTasks = tasks.filter(t => t.type !== 'project');
  const byProject = new Map<string, GanttTask[]>();

  for (const task of workTasks) {
    const pid = task.projectId || '__default__';
    let group = byProject.get(pid);
    if (!group) {
      group = [];
      byProject.set(pid, group);
    }
    group.push(task);
  }

  const tasksById = new Map<string, CriticalPathTaskMetrics>();
  const metrics: Record<string, CriticalPathTaskMetrics> = {};
  const criticalTaskIds = new Set<string>();
  const criticalDependencyIds = new Set<string>();
  const cyclicTaskIds = new Set<string>();
  const projectDurations: Record<string, number> = {};
  let hasCycle = false;
  let maxDuration = 0;

  for (const [projectId, group] of byProject.entries()) {
    const sub = computeProjectCriticalPath(projectId, group, dependencies);
    projectDurations[projectId] = sub.projectDurationDays;
    if (sub.projectDurationDays > maxDuration) {
      maxDuration = sub.projectDurationDays;
    }
    if (sub.hasCycle) {
      hasCycle = true;
    }
    for (const id of sub.cyclicTaskIds) {
      cyclicTaskIds.add(id);
    }
    for (const m of sub.taskMetrics) {
      tasksById.set(m.taskId, m);
      metrics[m.taskId] = m;
      if (m.isCritical) {
        criticalTaskIds.add(m.taskId);
      }
    }
    for (const depId of sub.criticalDependencyIds) {
      criticalDependencyIds.add(depId);
    }
  }

  return {
    tasksById,
    metrics,
    criticalTaskIds,
    criticalDependencyIds,
    cyclicTaskIds,
    hasCycle,
    projectDurationDays: maxDuration,
    projectDurations,
  };
}

/**
 * Convenience CPM wrapper directly for `WorkItem[]` scoped to a project.
 */
export function computeWorkItemsCriticalPath(
  projectId: string,
  items: WorkItem[],
): CriticalPathResult {
  const filtered = projectId ? items.filter(w => w.project_id === projectId) : items;

  const tasks: GanttTask[] = filtered.map(wi => ({
    id: wi.id,
    type: 'work_item',
    projectId: wi.project_id,
    parentId: wi.parent_id ?? wi.project_id,
    name: wi.name,
    startDate: wi.planned_start,
    endDate: wi.planned_end,
    progress: Number(wi.progress_pct) || 0,
    status: wi.status || 'pending',
    priority: wi.priority ?? 'medium',
    assignedMemberId: wi.assigned_member_id ?? null,
    sortOrder: wi.sort_order ?? 0,
    updatedAt: wi.updated_at,
  }));

  const deps: GanttDependency[] = [];
  for (const wi of filtered) {
    const type = dependencyTypeDbToGantt(wi.dependency_type);
    for (const predId of wi.dependencies || []) {
      deps.push({
        id: `${predId}__${wi.id}`,
        fromTaskId: predId,
        toTaskId: wi.id,
        type,
      });
    }
  }

  return computeCriticalPath(tasks, deps);
}

/**
 * When a predecessor task's `endDate` shifts later, cascades Finish-to-Start (`FS`)
 * successor tasks forward (preserving each successor's inclusive duration in days)
 * and returns only the updated successor task dates `{ id, startDate, endDate }[]`.
 */
export function cascadeFinishToStartShift(
  movedTaskId: string,
  newEndDate: string,
  tasks: Pick<GanttTask, 'id' | 'startDate' | 'endDate'>[],
  deps: Pick<GanttDependency, 'fromTaskId' | 'toTaskId' | 'type'>[],
): TaskDateUpdate[] {
  if (!movedTaskId || !newEndDate || tasks.length === 0) return [];

  const workingDates = new Map<string, { startDate: string; endDate: string }>();
  const spanDaysById = new Map<string, number>();

  for (const t of tasks) {
    workingDates.set(t.id, { startDate: t.startDate, endDate: t.endDate });
    spanDaysById.set(t.id, Math.max(0, diffDaysUtc(t.startDate, t.endDate)));
  }

  const movedDates = workingDates.get(movedTaskId);
  if (movedDates) {
    workingDates.set(movedTaskId, { ...movedDates, endDate: newEndDate });
  } else {
    workingDates.set(movedTaskId, { startDate: newEndDate, endDate: newEndDate });
  }

  const fsSuccessors = new Map<string, string[]>();
  for (const d of deps) {
    if (!d.fromTaskId || !d.toTaskId || d.fromTaskId === d.toTaskId) continue;
    if (d.type !== 'finish_to_start' && d.type !== 'pending') continue;
    let list = fsSuccessors.get(d.fromTaskId);
    if (!list) {
      list = [];
      fsSuccessors.set(d.fromTaskId, list);
    }
    if (!list.includes(d.toTaskId)) {
      list.push(d.toTaskId);
    }
  }

  const queue: string[] = [movedTaskId];
  let head = 0;
  const updatedIds = new Set<string>();
  const visitCount = new Map<string, number>();
  const maxVisitsPerNode = Math.max(2, tasks.length);

  while (head < queue.length) {
    const predId = queue[head++];
    const predDates = workingDates.get(predId);
    if (!predDates) continue;

    const minStartDate = addDaysUtc(predDates.endDate, 1);

    for (const succId of fsSuccessors.get(predId) || []) {
      if (succId === movedTaskId) continue;
      const count = (visitCount.get(succId) || 0) + 1;
      if (count > maxVisitsPerNode) continue;

      const succDates = workingDates.get(succId);
      if (!succDates) continue;

      if (parseIsoDayMs(succDates.startDate) < parseIsoDayMs(minStartDate)) {
        visitCount.set(succId, count);
        const span = spanDaysById.get(succId) ?? 0;
        const nextEndDate = addDaysUtc(minStartDate, span);
        workingDates.set(succId, { startDate: minStartDate, endDate: nextEndDate });
        updatedIds.add(succId);
        queue.push(succId);
      }
    }
  }

  const updates: TaskDateUpdate[] = [];
  for (const t of tasks) {
    if (!updatedIds.has(t.id)) continue;
    const next = workingDates.get(t.id)!;
    updates.push({
      id: t.id,
      startDate: next.startDate,
      endDate: next.endDate,
    });
  }

  return updates;
}
