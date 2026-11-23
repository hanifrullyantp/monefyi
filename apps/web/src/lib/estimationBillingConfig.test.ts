import { describe, expect, it } from 'vitest';
import {
  cloneBillingMilestones,
  defaultBillingMilestones,
  disableBillingMilestone,
  redistributeBillingPct,
  validateBillingMilestonePcts,
} from './estimationBillingConfig';

describe('redistributeBillingPct', () => {
  it('distributes freed pct to enabled milestones and keeps total 100', () => {
    const base = defaultBillingMilestones(50);
    const freed = base.find(m => m.key === 'termin_1')!.pct;
    const without = base.map(m => (
      m.key === 'termin_1' ? { ...m, enabled: false, pct: 0 } : m
    ));
    const next = redistributeBillingPct(without, freed, 'termin_1');
    const v = validateBillingMilestonePcts(next);
    expect(v.isExact).toBe(true);
    expect(next.find(m => m.key === 'termin_1')!.pct).toBe(0);
    expect(next.find(m => m.key === 'termin_2')!.pct).toBeGreaterThan(
      without.find(m => m.key === 'termin_2')!.pct,
    );
  });
});

describe('disableBillingMilestone', () => {
  it('returns snapshot-friendly state with total still 100', () => {
    const before = defaultBillingMilestones(50);
    const snap = cloneBillingMilestones(before);
    const after = disableBillingMilestone(before, 'termin_1');
    expect(validateBillingMilestonePcts(after).isExact).toBe(true);
    expect(after.find(m => m.key === 'termin_1')!.enabled).toBe(false);
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(snap));
  });
});
