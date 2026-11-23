import { normalizeEstimationStatus } from './estimationStatus';
import type { Estimation, EstimationFormDraft, EstimationStatus } from '../types/estimator';

type ClientFields = Pick<
  EstimationFormDraft,
  'customer_name' | 'customer_address' | 'customer_phone'
>;

/** Baris klien untuk kartu list/detail: "Nama · Alamat" atau telepon. */
export function formatEstimationClientLine(source: ClientFields | Estimation): string | null {
  const name = source.customer_name?.trim();
  const place = source.customer_address?.trim() || source.customer_phone?.trim();
  if (!name && !place) return null;
  if (name && place) return `${name} · ${place}`;
  return name || place || null;
}

/** Label meta PDF untuk kartu estimasi. */
export function estimationPdfMetaLabel(
  status: EstimationStatus | string,
  sentAt: string | null | undefined,
): string {
  if (sentAt) return 'PDF Sent';
  if (normalizeEstimationStatus(status) === 'penawaran') return 'Penawaran';
  return 'Draft';
}
