import type { GanttViewMode } from './types';

export const GANTT_COLORS = {
  primary: '#10B981',
  onTrack: '#10B981',
  atRisk: '#F59E0B',
  behind: '#EF4444',
  completed: '#6B7280',
  selected: '#3B82F6',
  notStarted: '#9CA3AF',
  weekend: '#F8FAFC',
  grid: '#E2E8F0',
  today: '#EF4444',
} as const;

export const ROW_HEIGHT = 44;
export const HEADER_HEIGHT = 56;
export const MIN_BAR_WIDTH = 12;

export const PX_PER_DAY: Record<GanttViewMode, number> = {
  day: 32,
  week: 12,
  month: 4,
};

export const ZOOM_LEVELS: GanttViewMode[] = ['day', 'week', 'month'];

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
};

export const WORK_ITEM_STATUS_LABEL: Record<string, string> = {
  completed: 'Selesai',
  in_progress: 'Berjalan',
  pending: 'Belum Mulai',
};
