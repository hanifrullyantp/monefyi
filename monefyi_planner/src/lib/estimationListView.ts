export type EstimationListViewMode = 'standard' | 'card' | 'detail';

const STORAGE_KEY = 'monefyi_estimator_list_view';

export const ESTIMATION_LIST_VIEW_OPTIONS: Array<{
  value: EstimationListViewMode;
  label: string;
  description: string;
}> = [
  { value: 'standard', label: 'Standar', description: 'Tampilan ringkas dengan status dan aksi' },
  { value: 'card', label: 'Kartu', description: 'Nama estimasi dan total nilai' },
  { value: 'detail', label: 'Detail', description: 'Informasi lengkap estimasi' },
];

/** Default: standar. */
export function readEstimationListViewMode(): EstimationListViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'standard' || v === 'card' || v === 'detail') return v;
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
