import { describe, expect, it } from 'vitest';
import { buildEstimationBillingSnapshot } from './estimationBillingSchedule';
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

describe('buildEstimationBillingSnapshot - contract with no payments', () => {
  it('returns full remaining and pending milestones', () => {
    const snap = buildEstimationBillingSnapshot(10_000_000, []);
    expect(snap.totalReceived).toBe(0);
    expect(snap.remaining).toBe(10_000_000);
    expect(snap.progressPct).toBe(0);
    expect(snap.nextDue?.id).toBe('dp');
    expect(snap.milestones.every(m => m.status === 'pending')).toBe(true);
  });
});

describe('buildEstimationBillingSnapshot - partial DP paid', () => {
  it('marks DP partial and sets progress', () => {
    const snap = buildEstimationBillingSnapshot(10_000_000, [
      income({ amount: 1_500_000, category: 'dp' }),
    ]);
    expect(snap.totalReceived).toBe(1_500_000);
    expect(snap.progressPct).toBe(15);
    expect(snap.milestones[0].status).toBe('partial');
    expect(snap.nextDue?.id).toBe('dp');
  });
});

describe('buildEstimationBillingSnapshot - DP fully paid', () => {
  it('marks DP paid and next due termin', () => {
    const snap = buildEstimationBillingSnapshot(10_000_000, [
      income({ amount: 3_000_000, category: 'dp' }),
    ]);
    expect(snap.milestones[0].status).toBe('paid');
    expect(snap.nextDue?.id).toBe('termin');
  });
});
