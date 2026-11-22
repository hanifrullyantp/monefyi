import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  computeDailySummaries,
  getUserTodayStatus,
  groupTodayByUser,
  startOfOrgDayIso,
  summarizeMonthlyByUser,
  toOrgDateKey,
  type AttendanceRecord,
} from './attendanceService';

describe('attendanceService timezone & day boundary helpers (F-21)', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes startOfOrgDayIso accurately during 00:00–06:59 WIB (UTC 17:00–23:59)', () => {
    // 2026-11-16 00:00 WIB === 2026-11-15T17:00:00.000Z
    expect(startOfOrgDayIso(new Date('2026-11-15T17:00:00.000Z'), 'Asia/Jakarta')).toBe(
      '2026-11-15T17:00:00.000Z',
    );
    // 2026-11-16 05:30 WIB === 2026-11-15T22:30:00.000Z (must still be Nov 16 WIB start!)
    expect(startOfOrgDayIso(new Date('2026-11-15T22:30:00.000Z'), 'Asia/Jakarta')).toBe(
      '2026-11-15T17:00:00.000Z',
    );
    // 2026-11-16 06:59:59 WIB === 2026-11-15T23:59:59.000Z
    expect(startOfOrgDayIso(new Date('2026-11-15T23:59:59.000Z'), 'Asia/Jakarta')).toBe(
      '2026-11-15T17:00:00.000Z',
    );
    // 2026-11-15 23:59:59 WIB === 2026-11-15T16:59:59.000Z (still Nov 15 WIB)
    expect(startOfOrgDayIso(new Date('2026-11-15T16:59:59.000Z'), 'Asia/Jakarta')).toBe(
      '2026-11-14T17:00:00.000Z',
    );
    // WITA (UTC+8): 2026-11-16 00:30 WITA === 2026-11-15T16:30:00.000Z
    expect(startOfOrgDayIso(new Date('2026-11-15T16:30:00.000Z'), 'Asia/Makassar')).toBe(
      '2026-11-15T16:00:00.000Z',
    );
  });

  it('maps UTC timestamps in 00:00–06:59 WIB to the local org date via toOrgDateKey', () => {
    expect(toOrgDateKey('2026-11-15T18:30:00.000Z', 'Asia/Jakarta')).toBe('2026-11-16');
    expect(toOrgDateKey('2026-11-15T16:30:00.000Z', 'Asia/Jakarta')).toBe('2026-11-15');
  });

  it('groups early-morning WIB check-in and same-day check-out onto the same org day in computeDailySummaries', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'att-1',
        user_id: 'u1',
        user_name: 'Asep',
        org_id: 'org-1',
        type: 'check_in',
        // 06:00 WIB on 2026-11-16
        timestamp: '2026-11-15T23:00:00.000Z',
      },
      {
        id: 'att-2',
        user_id: 'u1',
        user_name: 'Asep',
        org_id: 'org-1',
        type: 'check_out',
        // 15:00 WIB on 2026-11-16
        timestamp: '2026-11-16T08:00:00.000Z',
      },
    ];

    const summaries = computeDailySummaries(
      records,
      8,
      new Date('2026-11-16T09:00:00.000Z'),
      'Asia/Jakarta',
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].date).toBe('2026-11-16');
    expect(summaries[0].hoursWorked).toBe(9);
    expect(summaries[0].isComplete).toBe(true);
    expect(summaries[0].isPartial).toBe(false);
  });

  it('counts open shift hours up to referenceDate on the same org day', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'att-open',
        user_id: 'u1',
        user_name: 'Asep',
        org_id: 'org-1',
        type: 'check_in',
        // 06:00 WIB on 2026-11-16
        timestamp: '2026-11-15T23:00:00.000Z',
      },
    ];

    const summaries = computeDailySummaries(
      records,
      8,
      // 10:00 WIB on 2026-11-16
      new Date('2026-11-16T03:00:00.000Z'),
      'Asia/Jakarta',
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0].date).toBe('2026-11-16');
    expect(summaries[0].hoursWorked).toBe(4);
    expect(summaries[0].isPartial).toBe(true);
  });

  it('groups 1st-of-month 01:00 WIB attendance into the new org month in summarizeMonthlyByUser', () => {
    const records: AttendanceRecord[] = [
      {
        id: 'att-nov-1',
        user_id: 'u1',
        user_name: 'Asep',
        org_id: 'org-1',
        type: 'check_in',
        // 2026-11-01 01:00 WIB === 2026-10-31T18:00:00.000Z
        timestamp: '2026-10-31T18:00:00.000Z',
      },
      {
        id: 'att-nov-2',
        user_id: 'u1',
        user_name: 'Asep',
        org_id: 'org-1',
        type: 'check_out',
        // 2026-11-01 09:00 WIB === 2026-11-01T02:00:00.000Z
        timestamp: '2026-11-01T02:00:00.000Z',
      },
    ];

    const novSummary = summarizeMonthlyByUser(
      records,
      8,
      new Date('2026-11-10T05:00:00.000Z'),
      'Asia/Jakarta',
    );
    expect(novSummary.get('u1')?.daysPresent).toBe(1);
    expect(novSummary.get('u1')?.effectiveDays).toBe(1);

    const octSummary = summarizeMonthlyByUser(
      records,
      8,
      new Date('2026-10-15T05:00:00.000Z'),
      'Asia/Jakarta',
    );
    expect(octSummary.has('u1')).toBe(false);
  });

  it('queries getUserTodayStatus and groupTodayByUser using org-local midnight UTC ISO', async () => {
    vi.useFakeTimers();
    // 2026-11-16 05:30 WIB
    vi.setSystemTime(new Date('2026-11-15T22:30:00.000Z'));

    const order = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          type: 'check_in',
          recorded_at: '2026-11-15T22:15:00.000Z',
          profiles: { name: 'Worker 1' },
        },
      ],
      error: null,
    });
    const gte = vi.fn(() => ({ order }));
    const eqUser = vi.fn(() => ({ gte }));
    const eqOrg = vi.fn(() => ({ eq: eqUser, gte }));
    const select = vi.fn(() => ({ eq: eqOrg }));
    mockFrom.mockReturnValue({ select });

    const status = await getUserTodayStatus('u1', 'org-1', 'Asia/Jakarta');
    expect(gte).toHaveBeenCalledWith('recorded_at', '2026-11-15T17:00:00.000Z');
    expect(status.checkedIn).toBe(true);

    gte.mockClear();
    const grouped = await groupTodayByUser('org-1', 'Asia/Jakarta');
    expect(gte).toHaveBeenCalledWith('recorded_at', '2026-11-15T17:00:00.000Z');
    expect(grouped.get('u1')?.checkIn).toBeTruthy();
    expect(grouped.get('u1')?.status).toBe('in');
  });
});
