import type { EstimationStatus, EstimationWorkflowStatus } from '../types/estimator';

export type StatusTransitionAction = {
  status: EstimationStatus;
  label: string;
};

/** Ordered pipeline stages for quick status icons on list cards. */
export const ESTIMATION_WORKFLOW_STATUSES: EstimationWorkflowStatus[] = [
  'wa',
  'survei',
  'penawaran',
  'closing',
  'proses',
  'finishing',
  'selesai',
];

const LEGACY_STATUS_MAP: Record<string, EstimationStatus> = {
  draft: 'wa',
  sent: 'penawaran',
  accepted: 'closing',
};

const TRANSITION_LABELS: Record<EstimationStatus, string> = {
  wa: 'WA',
  survei: 'Survei',
  penawaran: 'Penawaran',
  closing: 'Closing',
  proses: 'Proses',
  finishing: 'Finishing',
  selesai: 'Selesai',
  rejected: 'Tandai Ditolak',
  converted: 'Jadikan Proyek',
};

/** Keterangan singkat tiap tahap pipeline — ditampilkan di dropdown status card list. */
export const ESTIMATION_STATUS_DESCRIPTION: Record<EstimationStatus, string> = {
  wa: 'Kontak awal & follow-up WhatsApp klien',
  survei: 'Survei lokasi dan kebutuhan di lapangan',
  penawaran: 'Penawaran harga sudah dikirim ke klien',
  closing: 'Negosiasi dan deal closing',
  proses: 'Produksi atau pengerjaan sedang berjalan',
  finishing: 'Finishing dan penyelesaian akhir',
  selesai: 'Pekerjaan selesai dan diterima klien',
  rejected: 'Estimasi ditolak oleh klien',
  converted: 'Estimasi sudah dijadikan proyek',
};

const WORKFLOW_TIMESTAMP_FIELD: Partial<Record<EstimationStatus, string>> = {
  wa: 'wa_at',
  survei: 'survei_at',
  penawaran: 'sent_at',
  closing: 'accepted_at',
  proses: 'proses_at',
  finishing: 'finishing_at',
  selesai: 'selesai_at',
  rejected: 'rejected_at',
};

export function isWorkflowStatus(status: string): status is EstimationWorkflowStatus {
  return ESTIMATION_WORKFLOW_STATUSES.includes(status as EstimationWorkflowStatus);
}

/** Normalize legacy DB values (draft/sent/accepted) to workflow statuses. */
export function normalizeEstimationStatus(status: string): EstimationStatus {
  return LEGACY_STATUS_MAP[status] ?? (status as EstimationStatus);
}

export function isStatusReadOnly(status: EstimationStatus): boolean {
  return status === 'converted';
}

/**
 * Quick workflow icons allow jumping to any pipeline stage.
 * Rejected estimations can re-enter the pipeline; converted is read-only.
 */
export function isStatusTransitionAllowed(from: EstimationStatus, to: EstimationStatus): boolean {
  if (from === 'converted' || to === 'converted') return false;
  if (isWorkflowStatus(to)) {
    return from !== 'converted';
  }
  if (to === 'rejected') {
    return from !== 'converted';
  }
  return false;
}

/**
 * Returns dropdown actions — all other workflow stages plus reject.
 */
export function getStatusTransitionActions(current: EstimationStatus): StatusTransitionAction[] {
  if (isStatusReadOnly(current)) return [];

  const actions: StatusTransitionAction[] = ESTIMATION_WORKFLOW_STATUSES
    .filter(status => status !== current)
    .map(status => ({
      status,
      label: TRANSITION_LABELS[status],
    }));

  if (current !== 'rejected') {
    actions.push({ status: 'rejected', label: TRANSITION_LABELS.rejected });
  }

  return actions;
}

export function buildStatusUpdatePayload(
  from: EstimationStatus,
  to: EstimationStatus,
  nowIso = new Date().toISOString(),
): Record<string, string | null> {
  if (!isStatusTransitionAllowed(from, to)) {
    throw new Error('Transisi status tidak valid');
  }

  const payload: Record<string, string | null> = {
    status: to,
    updated_at: nowIso,
  };

  const timestampField = WORKFLOW_TIMESTAMP_FIELD[to];
  if (timestampField) {
    payload[timestampField] = nowIso;
  }

  return payload;
}

export interface EstimationStatusTimestamps {
  created_at?: string | null;
  wa_at?: string | null;
  survei_at?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  proses_at?: string | null;
  finishing_at?: string | null;
  selesai_at?: string | null;
  rejected_at?: string | null;
  converted_at?: string | null;
}

export type StatusHistoryEntry = {
  key: string;
  label: string;
  at: string;
};

const HISTORY_ROWS: Array<{ key: string; label: string; field: keyof EstimationStatusTimestamps }> = [
  { key: 'created', label: 'Dibuat', field: 'created_at' },
  { key: 'wa', label: 'WA', field: 'wa_at' },
  { key: 'survei', label: 'Survei', field: 'survei_at' },
  { key: 'penawaran', label: 'Penawaran', field: 'sent_at' },
  { key: 'closing', label: 'Closing', field: 'accepted_at' },
  { key: 'proses', label: 'Proses', field: 'proses_at' },
  { key: 'finishing', label: 'Finishing', field: 'finishing_at' },
  { key: 'selesai', label: 'Selesai', field: 'selesai_at' },
  { key: 'rejected', label: 'Ditolak', field: 'rejected_at' },
  { key: 'converted', label: 'Jadi Proyek', field: 'converted_at' },
];

/** Build ordered history rows for the builder footer. */
export function buildStatusHistory(meta: EstimationStatusTimestamps): StatusHistoryEntry[] {
  const rows: StatusHistoryEntry[] = [];
  for (const row of HISTORY_ROWS) {
    const at = meta[row.field];
    if (at) {
      rows.push({ key: row.key, label: row.label, at });
    }
  }
  return rows;
}

export function countEstimationsByStatus(
  rows: Array<{ status: EstimationStatus | string }>,
): Record<EstimationStatus | 'all', number> {
  const counts = {
    all: rows.length,
    wa: 0,
    survei: 0,
    penawaran: 0,
    closing: 0,
    proses: 0,
    finishing: 0,
    selesai: 0,
    rejected: 0,
    converted: 0,
  };
  for (const row of rows) {
    const status = normalizeEstimationStatus(row.status);
    if (status in counts) {
      counts[status as EstimationStatus] += 1;
    }
  }
  return counts;
}
