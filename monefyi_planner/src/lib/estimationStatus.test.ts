import { describe, expect, it } from 'vitest';
import {
  buildStatusHistory,
  buildStatusUpdatePayload,
  countEstimationsByStatus,
  countEstimationsByPipelineSummary,
  getPipelineSummaryBucket,
  getStatusTransitionActions,
  isStatusTransitionAllowed,
  matchesPipelineSummaryFilter,
  normalizeEstimationStatus,
} from './estimationStatus';

describe('estimationStatus - normalizeEstimationStatus - legacy values', () => {
  it('maps legacy draft/sent/accepted to workflow statuses', () => {
    expect(normalizeEstimationStatus('draft')).toBe('wa');
    expect(normalizeEstimationStatus('sent')).toBe('penawaran');
    expect(normalizeEstimationStatus('accepted')).toBe('closing');
    expect(normalizeEstimationStatus('wa')).toBe('wa');
  });
});

describe('estimationStatus - transitions - workflow quick set', () => {
  it('allows jumping between workflow stages', () => {
    expect(isStatusTransitionAllowed('wa', 'penawaran')).toBe(true);
    expect(isStatusTransitionAllowed('survei', 'closing')).toBe(true);
    expect(isStatusTransitionAllowed('penawaran', 'wa')).toBe(true);
    expect(isStatusTransitionAllowed('closing', 'selesai')).toBe(true);
  });

  it('blocks transitions from or to converted', () => {
    expect(isStatusTransitionAllowed('converted', 'wa')).toBe(false);
    expect(isStatusTransitionAllowed('closing', 'converted')).toBe(false);
  });

  it('converted is read-only in dropdown actions', () => {
    expect(getStatusTransitionActions('converted')).toEqual([]);
  });
});

describe('estimationStatus - buildStatusUpdatePayload - timestamps', () => {
  it('penawaran transition sets sent_at', () => {
    const payload = buildStatusUpdatePayload('wa', 'penawaran', '2026-08-18T10:00:00.000Z');
    expect(payload.status).toBe('penawaran');
    expect(payload.sent_at).toBe('2026-08-18T10:00:00.000Z');
  });

  it('closing transition sets accepted_at', () => {
    const payload = buildStatusUpdatePayload('penawaran', 'closing', '2026-08-18T11:00:00.000Z');
    expect(payload.status).toBe('closing');
    expect(payload.accepted_at).toBe('2026-08-18T11:00:00.000Z');
  });

  it('survei transition sets survei_at', () => {
    const payload = buildStatusUpdatePayload('wa', 'survei', '2026-08-18T09:00:00.000Z');
    expect(payload.survei_at).toBe('2026-08-18T09:00:00.000Z');
  });
});

describe('estimationStatus - buildStatusHistory - ordered rows', () => {
  it('includes created and workflow milestones', () => {
    const rows = buildStatusHistory({
      created_at: '2026-08-14T10:30:00.000Z',
      wa_at: '2026-08-14T10:30:00.000Z',
      sent_at: '2026-08-15T14:22:00.000Z',
      accepted_at: '2026-08-16T09:15:00.000Z',
    });
    expect(rows.map(r => r.key)).toEqual(['created', 'wa', 'penawaran', 'closing']);
  });
});

describe('estimationStatus - countEstimationsByPipelineSummary - grouped cards', () => {
  it('groups survei+penawaran, closing stages, excludes rejected', () => {
    const counts = countEstimationsByPipelineSummary([
      { status: 'wa' },
      { status: 'survei' },
      { status: 'penawaran' },
      { status: 'sent' },
      { status: 'closing' },
      { status: 'proses' },
      { status: 'finishing' },
      { status: 'selesai' },
      { status: 'rejected' },
      { status: 'converted' },
    ]);
    expect(counts.wa).toBe(1);
    expect(counts.survei).toBe(3);
    expect(counts.closing).toBe(4);
  });

  it('matches pipeline filter bucket', () => {
    expect(matchesPipelineSummaryFilter('penawaran', 'survei')).toBe(true);
    expect(matchesPipelineSummaryFilter('finishing', 'closing')).toBe(true);
    expect(matchesPipelineSummaryFilter('rejected', 'survei')).toBe(false);
    expect(getPipelineSummaryBucket('rejected')).toBeNull();
  });
});

describe('estimationStatus - countEstimationsByStatus - totals', () => {
  it('counts all workflow statuses including legacy normalization', () => {
    const counts = countEstimationsByStatus([
      { status: 'wa' },
      { status: 'draft' },
      { status: 'penawaran' },
      { status: 'rejected' },
    ]);
    expect(counts.all).toBe(4);
    expect(counts.wa).toBe(2);
    expect(counts.penawaran).toBe(1);
    expect(counts.rejected).toBe(1);
  });
});
