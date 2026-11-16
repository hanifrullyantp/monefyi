import type { GanttPriority, GanttViewMode } from './types';

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
  criticalPath: '#DC2626',
} as const;

export const ROW_HEIGHT = 44;
export const HEADER_HEIGHT = 56;
export const MIN_BAR_WIDTH = 12;

export const PX_PER_DAY: Record<GanttViewMode, number> = {
  day: 32,
  week: 12,
  month: 4,
};

export const ZOOM_SCALE_MIN = 0.5;
export const ZOOM_SCALE_MAX = 3;
export const ZOOM_SCALE_STEP = 0.25;

export const ZOOM_LEVELS: GanttViewMode[] = ['day', 'week', 'month'];

/** Effective pixels per day after view mode + scale multiplier. */
export function getEffectivePxPerDay(viewMode: GanttViewMode, zoomScale: number): number {
  return PX_PER_DAY[viewMode] * zoomScale;
}

export const PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};

export const PRIORITY_BADGE_COLOR: Record<
  GanttPriority,
  { label: string; color: string; badgeClass: string }
> = {
  low: {
    label: 'Rendah',
    color: '#64748B',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  medium: {
    label: 'Sedang',
    color: '#D97706',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  high: {
    label: 'Tinggi',
    color: '#E11D48',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  critical: {
    label: 'Kritis',
    color: '#DC2626',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
  },
};

export const WORK_ITEM_STATUS_LABEL: Record<string, string> = {
  completed: 'Selesai',
  in_progress: 'Berjalan',
  pending: 'Belum Mulai',
};

export const BAR_COLOR_PRESETS = [
  { id: 'auto', label: 'Otomatis (status)', color: '' },
  { id: 'green', label: 'Hijau', color: '#10B981' },
  { id: 'blue', label: 'Biru', color: '#3B82F6' },
  { id: 'orange', label: 'Orange', color: '#F59E0B' },
  { id: 'red', label: 'Merah', color: '#EF4444' },
  { id: 'purple', label: 'Ungu', color: '#8B5CF6' },
  { id: 'gray', label: 'Abu', color: '#6B7280' },
  { id: 'teal', label: 'Teal', color: '#14B8A6' },
] as const;
