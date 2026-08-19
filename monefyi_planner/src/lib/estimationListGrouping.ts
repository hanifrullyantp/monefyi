import { ESTIMATION_WORKFLOW_STATUSES, normalizeEstimationStatus } from './estimationStatus';
import { ESTIMATION_STATUS_LABEL } from './estimatorFormat';
import type { Estimation } from '../types/estimator';

const PRODUCT_KEYWORDS: Array<{ match: RegExp; label: string }> = [
  { match: /kitchen\s*set/i, label: 'Kitchen Set' },
  { match: /kanopi/i, label: 'Kanopi' },
  { match: /renovasi/i, label: 'Renovasi Rumah' },
  { match: /interior|furniture|lemari|meja/i, label: 'Interior & Furniture' },
  { match: /konstruksi|baja\s*ringan|ruko|gudang/i, label: 'Konstruksi Ringan' },
];

/** Tebak kelompok produk dari judul estimasi (untuk grouping di list). */
export function deriveEstimationProductGroup(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return 'Umum';
  for (const { match, label } of PRODUCT_KEYWORDS) {
    if (match.test(trimmed)) return label;
  }
  return 'Umum';
}

export function getEstimationClientGroupLabel(customerName: string | null | undefined): string {
  const name = customerName?.trim();
  return name || 'Tanpa klien';
}

const STATUS_ORDER = new Map<string, number>([
  ...ESTIMATION_WORKFLOW_STATUSES.map((s, i) => [s, i] as const),
  ['rejected', 20],
  ['converted', 21],
]);

export function statusSortIndex(status: string): number {
  return STATUS_ORDER.get(normalizeEstimationStatus(status)) ?? 99;
}

export type EstimationGroupMode = 'none' | 'status' | 'product' | 'client';

export function groupEstimationsForList(
  rows: Estimation[],
  mode: EstimationGroupMode,
): Array<{ key: string; label: string; rows: Estimation[] }> {
  if (mode === 'none') {
    return [{ key: 'all', label: '', rows }];
  }

  const map = new Map<string, Estimation[]>();

  for (const row of rows) {
    let key: string;
    let label: string;

    if (mode === 'status') {
      const status = normalizeEstimationStatus(row.status);
      key = status;
      label = ESTIMATION_STATUS_LABEL[status] || status;
    } else if (mode === 'product') {
      label = deriveEstimationProductGroup(row.title);
      key = label;
    } else {
      label = getEstimationClientGroupLabel(row.customer_name);
      key = label.toLowerCase();
    }

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const groups = [...map.entries()].map(([key, groupRows]) => ({
    key,
    label: mode === 'status'
      ? ESTIMATION_STATUS_LABEL[normalizeEstimationStatus(groupRows[0]?.status || 'wa')] || key
      : mode === 'product'
        ? deriveEstimationProductGroup(groupRows[0]?.title || '')
        : getEstimationClientGroupLabel(groupRows[0]?.customer_name),
    rows: groupRows,
  }));

  if (mode === 'status') {
    groups.sort((a, b) => statusSortIndex(a.key) - statusSortIndex(b.key));
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }

  return groups;
}
