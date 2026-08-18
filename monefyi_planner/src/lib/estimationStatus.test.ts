import { describe, expect, it } from 'vitest';
import {
  buildStatusHistory,
  buildStatusUpdatePayload,
  countEstimationsByStatus,
  getStatusTransitionActions,
  isStatusTransitionAllowed,
} from './estimationStatus';

describe('estimationStatus - transitions - allowed paths', () => {
  it('draft can go to sent, accepted, or rejected', () => {
    expect(isStatusTransitionAllowed('draft', 'sent')).toBe(true);
    expect(isStatusTransitionAllowed('draft', 'accepted')).toBe(true);
    expect(isStatusTransitionAllowed('draft', 'rejected')).toBe(true);
    expect(isStatusTransitionAllowed('draft', 'converted')).toBe(false);
  });

  it('converted is read-only', () => {
    expect(getStatusTransitionActions('converted')).toEqual([]);
  });
});

describe('estimationStatus - buildStatusUpdatePayload - timestamps', () => {
  it('sent transition sets sent_at and clears later timestamps', () => {
    const payload = buildStatusUpdatePayload('draft', 'sent', '2026-08-18T10:00:00.000Z');
    expect(payload.status).toBe('sent');
    expect(payload.sent_at).toBe('2026-08-18T10:00:00.000Z');
    expect(payload.accepted_at).toBeNull();
    expect(payload.rejected_at).toBeNull();
  });

  it('revert to draft clears pipeline timestamps', () => {
    const payload = buildStatusUpdatePayload('sent', 'draft', '2026-08-18T11:00:00.000Z');
    expect(payload.sent_at).toBeNull();
    expect(payload.accepted_at).toBeNull();
    expect(payload.rejected_at).toBeNull();
  });
});

describe('estimationStatus - buildStatusHistory - ordered rows', () => {
  it('includes created and status milestones', () => {
    const rows = buildStatusHistory({
      created_at: '2026-08-14T10:30:00.000Z',
      sent_at: '2026-08-15T14:22:00.000Z',
      accepted_at: '2026-08-16T09:15:00.000Z',
    });
    expect(rows.map(r => r.key)).toEqual(['created', 'sent', 'accepted']);
  });
});

describe('estimationStatus - countEstimationsByStatus - totals', () => {
  it('counts all statuses', () => {
    const counts = countEstimationsByStatus([
      { status: 'draft' },
      { status: 'draft' },
      { status: 'sent' },
      { status: 'rejected' },
    ]);
    expect(counts.all).toBe(4);
    expect(counts.draft).toBe(2);
    expect(counts.sent).toBe(1);
    expect(counts.rejected).toBe(1);
  });
});
