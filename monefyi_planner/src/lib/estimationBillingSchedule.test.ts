import { describe, expect, it } from 'vitest';
import { buildEstimationBillingSnapshot } from './estimationBillingSchedule';
import { defaultBillingMilestones, emptyBillingConfig, validateBillingMilestonePcts } from './estimationBillingConfig';
import type { ProjectIncome } from '../services/estimationPaymentService';

function income(partial: Partial<ProjectIncome> & Pick<ProjectIncome, 'amount' | 'category'>): ProjectIncome {
  return {
    id: partial.id || 'inc-1',
    project_id: 'proj-1',
    date: partial.date || '2026-08-01',
    amount: partial.amount,
    category: partial.category,
    description: partial.description || '',
    status: partial.status || 'received',
    payment_method: null,
    client_ref: null,
    invoice_ref: null,
    recorded_by: 'user-1',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  };
}

describe('defaultBillingMilestones - 50% DP default', () => {
  it('splits remainder across termin and pelunasan', () => {
    const ms = defaultBillingMilestones(50);
    const total = ms.filter(m => m.enabled).reduce((s, m) => s + m.pct, 0);
    expect(ms[0].pct).toBe(50);
    expect(total).toBe(100);
  });
});

describe('validateBillingMilestonePcts', () => {
  it('flags over 100%', () => {
    const ms = defaultBillingMilestones(60);
    ms[1].pct = 50;
    const v = validateBillingMilestonePcts(ms);
    expect(v.isOver).toBe(true);
  });
});

describe('buildEstimationBillingSnapshot - local payments', () => {
  it('tracks DP under plan and moves remainder to pelunasan', () => {
    const config = emptyBillingConfig(50);
    config.milestones = [
      { key: 'dp', label: 'DP / Uang Muka', pct: 50, enabled: true },
      { key: 'termin_1', label: 'Termin 1', pct: 0, enabled: false },
      { key: 'termin_2', label: 'Termin 2', pct: 0, enabled: false },
      { key: 'termin_3', label: 'Termin 3', pct: 0, enabled: false },
      { key: 'pelunasan', label: 'Pelunasan', pct: 50, enabled: true },
    ];
    config.payments.push({
      id: 'p1',
      milestone_key: 'dp',
      date: '2026-08-01',
      amount: 10_000_000,
    });
    const snap = buildEstimationBillingSnapshot(14_000_000, config, []);
    const dp = snap.milestones.find(m => m.id === 'dp')!;
    const pelunasan = snap.milestones.find(m => m.id === 'pelunasan')!;
    expect(dp.paidAmount).toBe(10_000_000);
    expect(dp.amount).toBe(10_000_000);
    expect(dp.status).toBe('paid');
    expect(pelunasan.amount).toBe(4_000_000);
    expect(pelunasan.dueAmount).toBe(4_000_000);
    expect(pelunasan.status).toBe('pending');
    expect(snap.remaining).toBe(4_000_000);
  });

  it('tracks DP over plan and shrinks pelunasan', () => {
    const config = emptyBillingConfig(50);
    config.milestones = [
      { key: 'dp', label: 'DP / Uang Muka', pct: 50, enabled: true },
      { key: 'termin_1', label: 'Termin 1', pct: 0, enabled: false },
      { key: 'termin_2', label: 'Termin 2', pct: 0, enabled: false },
      { key: 'termin_3', label: 'Termin 3', pct: 0, enabled: false },
      { key: 'pelunasan', label: 'Pelunasan', pct: 50, enabled: true },
    ];
    config.payments.push({
      id: 'p1',
      milestone_key: 'dp',
      date: '2026-08-01',
      amount: 9_000_000,
    });
    const snap = buildEstimationBillingSnapshot(14_000_000, config, []);
    const dp = snap.milestones.find(m => m.id === 'dp')!;
    const pelunasan = snap.milestones.find(m => m.id === 'pelunasan')!;
    expect(dp.amount).toBe(9_000_000);
    expect(pelunasan.amount).toBe(5_000_000);
  });
});

describe('buildEstimationBillingSnapshot - billing discount', () => {
  it('reduces contract total', () => {
    const config = emptyBillingConfig(50);
    config.billing_discount_amount = 1_000_000;
    const snap = buildEstimationBillingSnapshot(10_000_000, config, []);
    expect(snap.contractTotal).toBe(9_000_000);
  });
});

describe('buildEstimationBillingSnapshot - project payments merge', () => {
  it('marks DP paid from project income', () => {
    const config = emptyBillingConfig(50);
    const snap = buildEstimationBillingSnapshot(10_000_000, config, [
      income({ amount: 5_000_000, category: 'dp' }),
    ]);
    expect(snap.milestones[0].status).toBe('paid');
  });
});
