import { describe, it, expect } from 'vitest';
import { aggregateSlotsToRap, slotCost, workingDaysInMonth } from './laborCostCalculator';
import type { LaborSlot } from '../types/labor';

function slot(partial: Partial<LaborSlot>): LaborSlot {
  return {
    id: '1',
    org_id: 'o',
    project_id: 'p',
    work_date: '2026-07-10',
    slot_kind: 'planned',
    rate_type: 'daily',
    day_fraction: 1,
    regular_hours: 8,
    overtime_hours: 0,
    unit_rate: 200_000,
    ...partial,
  };
}

describe('slotCost', () => {
  it('daily full day — fraction × rate', () => {
    expect(slotCost(slot({ rate_type: 'daily', day_fraction: 1, unit_rate: 200_000 }))).toBe(200_000);
  });

  it('daily half day — 0.5 × rate', () => {
    expect(slotCost(slot({ rate_type: 'daily', day_fraction: 0.5, unit_rate: 200_000 }))).toBe(100_000);
  });

  it('daily with overtime — adds OT hours', () => {
    const cost = slotCost(slot({
      rate_type: 'daily',
      day_fraction: 1,
      unit_rate: 200_000,
      overtime_hours: 2,
    }));
    expect(cost).toBeGreaterThan(200_000);
  });

  it('hourly — regular + overtime', () => {
    expect(slotCost(slot({
      rate_type: 'hourly',
      regular_hours: 4,
      overtime_hours: 2,
      unit_rate: 25_000,
    }))).toBe(4 * 25_000 + 2 * 25_000 * 1.5);
  });

  it('monthly — prorated by day fraction', () => {
    const monthly = 4_400_000;
    const wd = workingDaysInMonth(new Date('2026-07-15'));
    expect(slotCost(slot({
      rate_type: 'monthly',
      day_fraction: 1,
      unit_rate: monthly,
    }), new Date('2026-07-15'))).toBeCloseTo(monthly / wd, 0);
  });
});

describe('aggregateSlotsToRap', () => {
  it('sums planned daily fractions into quantity', () => {
    const agg = aggregateSlotsToRap([
      slot({ day_fraction: 1 }),
      slot({ work_date: '2026-07-11', day_fraction: 0.5 }),
    ], 'planned', 'daily');
    expect(agg.quantity).toBe(1.5);
    expect(agg.unit).toBe('hari');
    expect(agg.totalCost).toBe(300_000);
  });

  it('sums hourly slots into jam quantity', () => {
    const agg = aggregateSlotsToRap([
      slot({ rate_type: 'hourly', regular_hours: 6, overtime_hours: 1, unit_rate: 30_000 }),
      slot({ work_date: '2026-07-11', rate_type: 'hourly', regular_hours: 4, unit_rate: 30_000 }),
    ], 'planned', 'hourly');
    expect(agg.quantity).toBe(11);
    expect(agg.unit).toBe('jam');
  });
});
