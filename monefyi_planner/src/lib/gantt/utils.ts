import type { Project } from '../../store/appStore';
import type { WorkItem } from '../../services/workItemService';
import type {
  FlatGanttRow,
  GanttAdvancedFilters,
  GanttDependency,
  GanttPriority,
  GanttTask,
  GanttViewMode,
  TimelineRange,
} from './types';
import { GANTT_COLORS, getEffectivePxPerDay } from './constants';

const DAY_MS = 86400000;

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDate(iso: string): number {
  return new Date(iso + 'T00:00:00').getTime();
}

export function addDays(iso: string, days: number): string {
  const d = new Date(parseDate(iso));
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function daysBetween(start: string, end: string): number {
  return Math.max(1, Math.round((parseDate(end) - parseDate(start)) / DAY_MS) + 1);
}

export function formatPeriod(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function formatShortPeriod(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function inferPriority(project: Project): GanttPriority {
  if (project.health_status === 'behind' || project.health_status === 'at_risk') return 'high';
  if (project.status === 'planning' || project.status === 'draft') return 'low';
  return 'medium';
}

export function projectToGanttTask(p: Project, sortOrder: number): GanttTask {
  return {
    id: p.id,
    type: 'project',
    projectId: p.id,
    parentId: null,
    name: p.name,
    code: p.code,
    clientName: p.client_name,
    startDate: p.start_date,
    endDate: p.end_date,
    progress: p.progress_percentage,
    status: p.status,
    healthStatus: p.health_status,
    priority: inferPriority(p),
    assigneeId: p.manager_id,
    sortOrder,
  };
}

export function workItemToGanttTask(wi: WorkItem, project: Project): GanttTask {
  return {
    id: wi.id,
    type: 'work_item',
    projectId: project.id,
    parentId: project.id,
    name: wi.name,
    startDate: wi.planned_start,
    endDate: wi.planned_end,
    progress: Number(wi.progress_pct) || 0,
    status: wi.status || 'pending',
    healthStatus: project.health_status,
    priority: inferPriority(project),
    sortOrder: wi.sort_order ?? 0,
  };
}

export function computeTimelineRange(tasks: GanttTask[]): TimelineRange {
  if (!tasks.length) {
    const now = Date.now();
    return { minDate: now - 14 * DAY_MS, maxDate: now + 90 * DAY_MS, rangeDays: 104 };
  }
  const starts = tasks.map(t => parseDate(t.startDate));
  const ends = tasks.map(t => parseDate(t.endDate));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const pad = 14 * DAY_MS;
  const minDate = min - pad;
  const maxDate = max + pad;
  return {
    minDate,
    maxDate,
    rangeDays: Math.ceil((maxDate - minDate) / DAY_MS),
  };
}

export function getBarStyle(
  task: GanttTask,
  range: TimelineRange,
  viewMode: GanttViewMode,
  selected: boolean,
  zoomScale = 1,
): { left: number; width: number; color: string } {
  const pxPerDay = getEffectivePxPerDay(viewMode, zoomScale);
  const left = ((parseDate(task.startDate) - range.minDate) / DAY_MS) * pxPerDay;
  const width = Math.max(12, daysBetween(task.startDate, task.endDate) * pxPerDay - 2);

  let color = GANTT_COLORS.onTrack;
  if (task.barColor) color = task.barColor;
  else if (selected) color = GANTT_COLORS.selected;
  else if (task.status === 'completed' || task.status === 'archived') color = GANTT_COLORS.completed;
  else if (task.healthStatus === 'behind') color = GANTT_COLORS.behind;
  else if (task.healthStatus === 'at_risk') color = GANTT_COLORS.atRisk;
  else if (task.progress <= 0 && task.status === 'pending') color = GANTT_COLORS.notStarted;
  else if (selected) color = GANTT_COLORS.selected;

  return { left, width, color };
}

export function flattenTasks(
  tasks: GanttTask[],
  expandedIds: Set<string>,
  projectOrder: string[],
): FlatGanttRow[] {
  const byParent = new Map<string | null, GanttTask[]>();
  for (const t of tasks) {
    const key = t.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }

  for (const [, list] of byParent) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const roots = byParent.get(null) || [];
  roots.sort((a, b) => {
    const ai = projectOrder.indexOf(a.id);
    const bi = projectOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return a.sortOrder - b.sortOrder;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const rows: FlatGanttRow[] = [];

  const walk = (task: GanttTask, depth: number) => {
    const children = byParent.get(task.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(task.id);
    rows.push({ task, depth, isExpanded, hasChildren });
    if (hasChildren && isExpanded) {
      for (const child of children) walk(child, depth + 1);
    }
  };

  for (const root of roots) walk(root, 0);
  return rows;
}

export function wouldCreateCycle(
  fromId: string,
  toId: string,
  deps: GanttDependency[],
): boolean {
  if (fromId === toId) return true;
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    if (!adj.has(d.fromTaskId)) adj.set(d.fromTaskId, []);
    adj.get(d.fromTaskId)!.push(d.toTaskId);
  }
  if (!adj.has(fromId)) adj.set(fromId, []);
  adj.get(fromId)!.push(toId);

  const visited = new Set<string>();
  const stack = [toId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === fromId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const next of adj.get(cur) || []) stack.push(next);
  }
  return false;
}

export function bezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dx = Math.abs(x2 - x1);
  const cx = Math.max(dx * 0.4, 40);
  return `M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`;
}

export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function generateTimelineDays(range: TimelineRange): Date[] {
  const days: Date[] = [];
  const cur = new Date(range.minDate);
  const end = new Date(range.maxDate);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function getMonthGroups(days: Date[]): { label: string; span: number }[] {
  const groups: { label: string; span: number }[] = [];
  let i = 0;
  while (i < days.length) {
    const d = days[i];
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    let span = 0;
    while (i < days.length && days[i].toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) === label) {
      span++;
      i++;
    }
    groups.push({ label, span });
  }
  return groups;
}

/** Returns true if task passes advanced filter criteria. */
export function matchesAdvancedFilters(task: GanttTask, f: GanttAdvancedFilters): boolean {
  if (f.clientName && !(task.clientName || '').toLowerCase().includes(f.clientName.toLowerCase())) {
    return false;
  }
  if (f.priority !== 'all' && task.priority !== f.priority) return false;
  if (f.healthStatus !== 'all' && task.healthStatus !== f.healthStatus) return false;
  if (task.progress < f.progressMin || task.progress > f.progressMax) return false;
  if (f.dateFrom && task.endDate < f.dateFrom) return false;
  if (f.dateTo && task.startDate > f.dateTo) return false;
  return true;
}

export function countActiveAdvancedFilters(f: GanttAdvancedFilters): number {
  let n = 0;
  if (f.clientName) n++;
  if (f.priority !== 'all') n++;
  if (f.healthStatus !== 'all') n++;
  if (f.progressMin > 0 || f.progressMax < 100) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}
