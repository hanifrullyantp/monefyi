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
  it('tracks DP partial without project', () => {
    const config = emptyBillingConfig(50);
    config.payments.push({
      id: 'p1',
      milestone_key: 'dp',
      date: '2026-08-01',
      amount: 2_500_000,
    });
    const snap = buildEstimationBillingSnapshot(10_000_000, config, []);
    expect(snap.contractTotal).toBe(10_000_000);
    expect(snap.milestones[0].paidAmount).toBe(2_500_000);
    expect(snap.milestones[0].status).toBe('partial');
    expect(snap.progressPct).toBe(25);
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
