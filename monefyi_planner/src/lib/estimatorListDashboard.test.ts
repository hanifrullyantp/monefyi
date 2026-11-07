import { describe, expect, it } from 'vitest';
import type { Estimation } from '../types/estimator';
import {
  dashboardPillForRow,
  estimationMarginPct,
  estimationSourceLabel,
  formatUpdateAgeLabel,
  dashboardStatusLabel,
  getDashboardBucket,
  getEstimatorDashboardStats,
  isEstimationArchived,
  matchesDashboardFilter,
  isEstimationStale,
  recencyToneFromDays,
  sortEstimationsForDashboard,
} from './estimatorListDashboard';
import { ESTIMATOR_RECENCY_THRESHOLDS } from './estimatorListThresholds';

const NOW = Date.parse('2026-11-04T03:00:00.000Z');

function row(partial: Partial<Estimation> & { id: string; status: Estimation['status'] }): Estimation {
  return {
    tenant_id: 't1',
    org_id: 't1',
    code: `EST-2026-${partial.id}`,
    title: partial.title || `Proyek ${partial.id}`,
    customer_name: 'Klien',
    total_selling_price: 0,
    total_profit: 0,
    created_at: new Date(NOW).toISOString(),
    updated_at: new Date(NOW).toISOString(),
    ...partial,
  } as Estimation;
}

function daysAgo(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString();
}

describe('estimatorListDashboard - status mapping - Active/Lead/Arsip', () => {
  it('maps closing/proses/finishing and converted to Active, wa/survei/penawaran to Lead, selesai/rejected to arsip', () => {
    expect(getDashboardBucket('closing')).toBe('active');
    expect(getDashboardBucket('proses')).toBe('active');
    expect(getDashboardBucket('finishing')).toBe('active');
    expect(getDashboardBucket('converted')).toBe('active');
    expect(getDashboardBucket('selesai')).toBeNull();
    expect(getDashboardBucket('wa')).toBe('lead');
    expect(getDashboardBucket('survei')).toBe('lead');
    expect(getDashboardBucket('penawaran')).toBe('lead');
    expect(getDashboardBucket('rejected')).toBeNull();
    expect(dashboardStatusLabel('penawaran')).toBe('Lead');
    expect(dashboardStatusLabel('closing')).toBe('Active');
    expect(dashboardStatusLabel('converted')).toBe('Active');
    expect(dashboardStatusLabel('selesai')).toBe('Arsip');
    expect(dashboardStatusLabel('rejected')).toBe('Arsip');
  });

  it('treats selesai and rejected as archived (converted remains active connected to project)', () => {
    expect(isEstimationArchived('selesai')).toBe(true);
    expect(isEstimationArchived('rejected')).toBe(true);
    expect(isEstimationArchived('converted')).toBe(false);
    expect(isEstimationArchived('wa')).toBe(false);
    expect(isEstimationArchived('finishing')).toBe(false);
  });

  it('hides archived rows from the default list filter', () => {
    const open = row({ id: '1', status: 'wa' });
    const rejected = row({ id: '2', status: 'rejected' });
    const selesai = row({ id: '3', status: 'selesai' });
    expect(matchesDashboardFilter(open, 'all')).toBe(true);
    expect(matchesDashboardFilter(rejected, 'all')).toBe(false);
    expect(matchesDashboardFilter(selesai, 'all')).toBe(false);
  });
});

describe('estimatorListDashboard - recency - uses shared thresholds', () => {
  it('colors 0-14 green, 15-60 yellow, over 60 red', () => {
    expect(recencyToneFromDays(0)).toBe('fresh');
    expect(recencyToneFromDays(ESTIMATOR_RECENCY_THRESHOLDS.freshDays)).toBe('fresh');
    expect(recencyToneFromDays(ESTIMATOR_RECENCY_THRESHOLDS.freshDays + 1)).toBe('aging');
    expect(recencyToneFromDays(ESTIMATOR_RECENCY_THRESHOLDS.staleDays)).toBe('aging');
    expect(recencyToneFromDays(ESTIMATOR_RECENCY_THRESHOLDS.staleDays + 1)).toBe('stale');
  });

  it('marks non-archived rows stale after 60 days', () => {
    const stale = row({
      id: '1',
      status: 'wa',
      updated_at: daysAgo(61),
    });
    const fresh = row({
      id: '2',
      status: 'wa',
      updated_at: daysAgo(10),
    });
    const archived = row({
      id: '3',
      status: 'rejected',
      updated_at: daysAgo(90),
    });
    expect(isEstimationStale(stale, NOW)).toBe(true);
    expect(isEstimationStale(fresh, NOW)).toBe(false);
    expect(isEstimationStale(archived, NOW)).toBe(false);
  });
});

describe('estimatorListDashboard - formatUpdateAgeLabel - days then months', () => {
  it('keeps days until stale threshold then switches to months', () => {
    expect(formatUpdateAgeLabel(daysAgo(0), NOW)).toBe('Update hari ini');
    expect(formatUpdateAgeLabel(daysAgo(34), NOW)).toBe('Update 34 hari lalu');
    expect(formatUpdateAgeLabel(daysAgo(120), NOW)).toBe('Update 4 bulan lalu');
  });
});

describe('estimatorListDashboard - getEstimatorDashboardStats - client aggregates', () => {
  it('counts new/open/active/lead/stale from loaded rows', () => {
    const rows = [
      row({ id: '1', status: 'wa', created_at: daysAgo(5), updated_at: daysAgo(5), total_selling_price: 10_000_000 }),
      row({ id: '2', status: 'proses', created_at: daysAgo(10), updated_at: daysAgo(10), total_selling_price: 76_000_000 }),
      row({ id: '3', status: 'penawaran', created_at: daysAgo(40), updated_at: daysAgo(70), total_selling_price: 20_000_000 }),
      row({ id: '4', status: 'rejected', created_at: daysAgo(2), updated_at: daysAgo(2), total_selling_price: 99_000_000 }),
    ];
    const stats = getEstimatorDashboardStats(rows, NOW);
    expect(stats.totalOpen).toBe(3);
    expect(stats.newInWindow).toBe(2);
    expect(stats.activeCount).toBe(1);
    expect(stats.activeValue).toBe(76_000_000);
    expect(stats.leadCount).toBe(2);
    expect(stats.leadValue).toBe(30_000_000);
    expect(stats.staleCount).toBe(1);
  });
});

describe('estimatorListDashboard - sortEstimationsForDashboard - newest then Active then rest', () => {
  it('pins newest created first, then Active, then remaining by created_at', () => {
    const newestLead = row({ id: 'new', status: 'wa', created_at: daysAgo(1), title: 'Newest' });
    const olderActive = row({ id: 'a1', status: 'finishing', created_at: daysAgo(20) });
    const newerActive = row({ id: 'a2', status: 'proses', created_at: daysAgo(8) });
    const olderLead = row({ id: 'l1', status: 'penawaran', created_at: daysAgo(12) });

    const sorted = sortEstimationsForDashboard([olderLead, olderActive, newestLead, newerActive]);
    expect(sorted.map(r => r.id)).toEqual(['new', 'a2', 'a1', 'l1']);
    expect(dashboardPillForRow(sorted[0], sorted[0].id)).toBe('terbaru');
    expect(dashboardPillForRow(sorted[1], sorted[0].id)).toBe('active');
    expect(dashboardPillForRow(sorted[3], sorted[0].id)).toBe('lead');
  });
});

describe('estimatorListDashboard - helpers - margin and source', () => {
  it('computes margin and infers WA source from phone or wa_at', () => {
    expect(estimationMarginPct(100, 36)).toBe(36);
    expect(estimationMarginPct(0, 10)).toBeNull();
    expect(estimationSourceLabel({ wa_at: null, customer_phone: '0812' })).toBe('WA');
    expect(estimationSourceLabel({ wa_at: '2026-01-01', customer_phone: null })).toBe('WA');
    expect(estimationSourceLabel({ wa_at: null, customer_phone: null })).toBe('Manual');
  });
});
