import type { GanttDependency, GanttTask } from './types';

export interface GanttSnapshot {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  projectOrder: string[];
  barColors: Record<string, string>;
}

export function cloneSnapshot(s: GanttSnapshot): GanttSnapshot {
  return JSON.parse(JSON.stringify(s)) as GanttSnapshot;
}

export function snapshotsEqual(a: GanttSnapshot | null, b: GanttSnapshot | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pickSnapshot(state: {
  tasks: GanttTask[];
  dependencies: GanttDependency[];
  projectOrder: string[];
  barColors: Record<string, string>;
}): GanttSnapshot {
  return cloneSnapshot({
    tasks: state.tasks,
    dependencies: state.dependencies,
    projectOrder: state.projectOrder,
    barColors: state.barColors,
  });
}
