import type { Project } from '../../store/appStore';

export type GanttTaskType = 'project' | 'work_item';
export type GanttViewMode = 'day' | 'week' | 'month';
export type GanttPriority = 'low' | 'medium' | 'high';
export type DependencyType = 'finish_to_start' | 'pending';

export interface GanttTask {
  id: string;
  type: GanttTaskType;
  projectId: string;
  parentId: string | null;
  name: string;
  code?: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
  healthStatus?: Project['health_status'];
  priority: GanttPriority;
  assigneeId?: string;
  assigneeName?: string;
  sortOrder: number;
  barColor?: string;
}

export interface GanttAdvancedFilters {
  clientName: string;
  priority: GanttPriority | 'all';
  healthStatus: Project['health_status'] | 'all';
  progressMin: number;
  progressMax: number;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_ADVANCED_FILTERS: GanttAdvancedFilters = {
  clientName: '',
  priority: 'all',
  healthStatus: 'all',
  progressMin: 0,
  progressMax: 100,
  dateFrom: '',
  dateTo: '',
};

export interface GanttDependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: DependencyType;
}

export interface GanttDragState {
  taskId: string;
  mode: 'move' | 'resize-start' | 'resize-end' | 'dependency';
  startX: number;
  origStart: string;
  origEnd: string;
  connectFrom?: string;
}

export interface FlatGanttRow {
  task: GanttTask;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
}

export interface TimelineRange {
  minDate: number;
  maxDate: number;
  rangeDays: number;
}
