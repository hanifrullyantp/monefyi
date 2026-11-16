import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGroupTodayByUser = vi.fn();
const mockListMembers = vi.fn();

vi.mock('./attendanceService', () => ({
  groupTodayByUser: (...args: unknown[]) => mockGroupTodayByUser(...args),
}));

vi.mock('./memberService', () => ({
  listMembers: (...args: unknown[]) => mockListMembers(...args),
}));

import { getTodayAttendanceSummary } from './dashboardService';

describe('dashboardService.getTodayAttendanceSummary (F-21)', () => {
  beforeEach(() => {
    mockGroupTodayByUser.mockReset();
    mockListMembers.mockReset();
  });

  it('counts workers who already checked in and checked out today as present', async () => {
    mockListMembers.mockResolvedValue([
      { id: 'm1', user_id: 'u1', org_id: 'org-1', role: 'worker', status: 'active' },
    ]);
    mockGroupTodayByUser.mockResolvedValue(
      new Map([
        ['u1', { name: 'Worker 1', checkIn: '18.48', checkOut: '18.49', status: 'out' }],
      ]),
    );

    const summary = await getTodayAttendanceSummary('org-1');

    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(0);
    expect(summary.working).toBe(0);
    expect(summary.checkedOut).toBe(1);
    expect(summary.total).toBe(1);
  });

  it('splits working vs checkedOut cleanly while keeping total present accurate', async () => {
    mockListMembers.mockResolvedValue([
      { id: 'm1', user_id: 'u1', org_id: 'org-1', role: 'worker', status: 'active' },
      { id: 'm2', user_id: 'u2', org_id: 'org-1', role: 'worker', status: 'active' },
      { id: 'm3', user_id: 'u3', org_id: 'org-1', role: 'worker', status: 'active' },
    ]);
    mockGroupTodayByUser.mockResolvedValue(
      new Map([
        ['u1', { name: 'Asep', checkIn: '08.00', status: 'in' }],
        ['u2', { name: 'Budi', checkIn: '07.30', checkOut: '16.30', status: 'out' }],
      ]),
    );

    const summary = await getTodayAttendanceSummary('org-1');

    expect(summary.present).toBe(2);
    expect(summary.working).toBe(1);
    expect(summary.checkedOut).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('returns zero counts when organization has no members', async () => {
    mockListMembers.mockResolvedValue([]);
    mockGroupTodayByUser.mockResolvedValue(new Map());

    const summary = await getTodayAttendanceSummary('org-1');

    expect(summary.present).toBe(0);
    expect(summary.absent).toBe(0);
    expect(summary.total).toBe(0);
  });
});
