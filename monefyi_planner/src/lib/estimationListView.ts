export type EstimationListViewMode = 'standard' | 'kanban';

const STORAGE_KEY = 'monefyi_estimator_list_view_v2';

export const ESTIMATION_LIST_VIEW_OPTIONS: Array<{
  value: EstimationListViewMode;
  label: string;
  description: string;
}> = [
  { value: 'standard', label: 'Standar', description: 'Daftar estimasi dengan tab pipeline' },
  { value: 'kanban', label: 'Kanban', description: 'Board kolom status workflow' },
];

/** Default: standar. Migrasi card/detail lama → standar. */
export function readEstimationListViewMode(): EstimationListViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'standard' || v === 'kanban') return v;
    if (v === 'card' || v === 'detail') return 'standard';
  } catch {
    /* ignore */
  }
  return 'standard';
}

export function persistEstimationListViewMode(mode: EstimationListViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
