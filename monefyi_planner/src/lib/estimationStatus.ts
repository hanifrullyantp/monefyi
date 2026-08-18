import type { EstimationStatus } from '../types/estimator';

export type StatusTransitionAction = {
  status: EstimationStatus;
  label: string;
};

const TRANSITION_LABELS: Record<EstimationStatus, string> = {
  draft: 'Kembalikan ke Draft',
  sent: 'Tandai Terkirim',
  accepted: 'Tandai Diterima',
  rejected: 'Tandai Ditolak',
  converted: 'Jadikan Proyek',
};

/** Allowed manual transitions from each status (converted is read-only). */
const ALLOWED: Record<EstimationStatus, EstimationStatus[]> = {
  draft: ['sent', 'accepted', 'rejected'],
  sent: ['accepted', 'rejected', 'draft'],
  accepted: ['draft', 'rejected'],
  rejected: ['draft'],
  converted: [],
};

/**
 * Returns dropdown actions for the current status.
 */
export function getStatusTransitionActions(current: EstimationStatus): StatusTransitionAction[] {
  return ALLOWED[current].map(status => ({
    status,
    label: status === 'draft' && current !== 'draft'
      ? TRANSITION_LABELS.draft
      : TRANSITION_LABELS[status],
  }));
}

export function isStatusTransitionAllowed(from: EstimationStatus, to: EstimationStatus): boolean {
  return ALLOWED[from].includes(to);
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

  if (to === 'draft') {
    payload.sent_at = null;
    payload.accepted_at = null;
    payload.rejected_at = null;
    return payload;
  }

  if (to === 'sent') {
    payload.sent_at = nowIso;
    payload.accepted_at = null;
    payload.rejected_at = null;
    return payload;
  }

  if (to === 'accepted') {
    payload.accepted_at = nowIso;
    payload.rejected_at = null;
    return payload;
  }

  if (to === 'rejected') {
    payload.rejected_at = nowIso;
    payload.accepted_at = null;
    return payload;
  }

  return payload;
}

export interface EstimationStatusTimestamps {
  created_at?: string | null;
  sent_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  converted_at?: string | null;
}

export type StatusHistoryEntry = {
  key: string;
  label: string;
  at: string;
};

/** Build ordered history rows for the builder footer. */
export function buildStatusHistory(meta: EstimationStatusTimestamps): StatusHistoryEntry[] {
  const rows: StatusHistoryEntry[] = [];
  if (meta.created_at) {
    rows.push({ key: 'created', label: 'Dibuat', at: meta.created_at });
  }
  if (meta.sent_at) {
    rows.push({ key: 'sent', label: 'Terkirim', at: meta.sent_at });
  }
  if (meta.accepted_at) {
    rows.push({ key: 'accepted', label: 'Diterima', at: meta.accepted_at });
  }
  if (meta.rejected_at) {
    rows.push({ key: 'rejected', label: 'Ditolak', at: meta.rejected_at });
  }
  if (meta.converted_at) {
    rows.push({ key: 'converted', label: 'Jadi Proyek', at: meta.converted_at });
  }
  return rows;
}

export function countEstimationsByStatus(
  rows: Array<{ status: EstimationStatus }>,
): Record<EstimationStatus | 'all', number> {
  const counts = {
    all: rows.length,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    converted: 0,
  };
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as EstimationStatus] += 1;
    }
  }
  return counts;
}
