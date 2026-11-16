import { describe, expect, it } from 'vitest';
import {
  computeAnalisaHealthScore,
  computeProjectedEndDate,
  getAnalisaFinanceBadge,
  getBehindScheduleAdvice,
} from './projectAnalysisMetrics';

describe('computeAnalisaHealthScore (F-07)', () => {
  it('never rises from 10 to 14 after adding RAP and going 150% overbudget with cash deficit', () => {
    const beforeRap = computeAnalisaHealthScore({
      totalRAP: 0,
      realisasi: 0,
      saldo: 0,
      estLaba: 0,
      contractValue: 0,
      actualProgress: 0,
      progressDeviation: -50,
      evm: { cpi: 0, spi: 0, ac: 0, totalBudget: 0 },
    });

    const afterOverbudgetAndDeficit = computeAnalisaHealthScore({
      totalRAP: 10_000_000,
      realisasi: 15_000_000,
      saldo: -15_000_000,
      estLaba: -15_000_000,
      contractValue: 0,
      actualProgress: 20,
      progressDeviation: -30,
      evm: { cpi: 0.13, spi: 0.4, ac: 15_000_000, totalBudget: 10_000_000 },
    });

    expect(afterOverbudgetAndDeficit).toBeLessThan(beforeRap);
    expect(afterOverbudgetAndDeficit).toBeLessThanOrEqual(10);
  });

  it('ignores degenerate EVM when totalBudget === 0 or ac === 0', () => {
    const scoreNoAc = computeAnalisaHealthScore({
      totalRAP: 50_000_000,
      realisasi: 0,
      saldo: 20_000_000,
      estLaba: 50_000_000,
      contractValue: 50_000_000,
      actualProgress: 10,
      progressDeviation: 0,
      evm: { cpi: 0, spi: 0, ac: 0, totalBudget: 50_000_000 },
    });

    expect(scoreNoAc).toBeGreaterThanOrEqual(85);
  });

  it('does not let EVM CPI/SPI boost score above deterministic score when in cash deficit or overbudget', () => {
    const score = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 130_000_000,
      saldo: -30_000_000,
      estLaba: -30_000_000,
      contractValue: 100_000_000,
      actualProgress: 80,
      progressDeviation: 10,
      evm: { cpi: 0.95, spi: 1.1, ac: 130_000_000, totalBudget: 100_000_000 },
    });

    const scoreWithoutEvm = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 130_000_000,
      saldo: -30_000_000,
      estLaba: -30_000_000,
      contractValue: 100_000_000,
      actualProgress: 80,
      progressDeviation: 10,
      evm: null,
    });

    expect(score).toBeLessThanOrEqual(scoreWithoutEvm);
    expect(score).toBeLessThan(40);
  });

  it('degrades monotonically as project condition worsens', () => {
    const healthy = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 40_000_000,
      saldo: 30_000_000,
      estLaba: 20_000_000,
      contractValue: 120_000_000,
      actualProgress: 50,
      progressDeviation: 0,
    });

    const behind = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 40_000_000,
      saldo: 30_000_000,
      estLaba: 20_000_000,
      contractValue: 120_000_000,
      actualProgress: 20,
      progressDeviation: -30,
    });

    const nearBudget = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 90_000_000,
      saldo: 10_000_000,
      estLaba: 20_000_000,
      contractValue: 120_000_000,
      actualProgress: 20,
      progressDeviation: -30,
    });

    const over120 = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 120_000_000,
      saldo: -10_000_000,
      estLaba: 0,
      contractValue: 120_000_000,
      actualProgress: 20,
      progressDeviation: -30,
    });

    const over150Loss = computeAnalisaHealthScore({
      totalRAP: 100_000_000,
      realisasi: 150_000_000,
      saldo: -50_000_000,
      estLaba: -30_000_000,
      contractValue: 120_000_000,
      actualProgress: 20,
      progressDeviation: -30,
    });

    expect(healthy).toBeGreaterThan(behind);
    expect(behind).toBeGreaterThan(nearBudget);
    expect(nearBudget).toBeGreaterThan(over120);
    expect(over120).toBeGreaterThan(over150Loss);
  });
});

describe('computeProjectedEndDate (F-22)', () => {
  it('never prints a past endDate as a future estimate when progress is 0%', () => {
    const res = computeProjectedEndDate({
      startDate: '2026-07-01',
      endDate: '2026-09-01',
      actualProgress: 0,
      today: new Date(2026, 10, 16), // 2026-11-16
    });

    expect(res.isOverdue).toBe(true);
    expect(res.projectedDate).toBeNull();
    expect(res.label).toContain('Belum ada progres');
    expect(res.label).toContain('2026-09-01');
  });

  it('projects dynamic future date >= today based on pace when past target with partial progress', () => {
    const res = computeProjectedEndDate({
      startDate: '2026-07-01',
      endDate: '2026-09-01',
      actualProgress: 50,
      today: new Date(2026, 10, 16), // 2026-11-16
    });

    expect(res.isOverdue).toBe(true);
    expect(res.projectedDate).not.toBeNull();
    expect(res.projectedDate! >= '2026-11-16').toBe(true);
    expect(res.label).toBe(res.projectedDate);
  });

  it('projects on target endDate when pace matches plan', () => {
    const res = computeProjectedEndDate({
      startDate: '2026-11-01',
      endDate: '2026-12-01',
      actualProgress: 50,
      today: new Date(2026, 10, 16), // 15 days elapsed out of 30
    });

    expect(res.isOverdue).toBe(false);
    expect(res.projectedDate).toBe('2026-12-01');
  });

  it('marks project completed when actualProgress >= 100', () => {
    const res = computeProjectedEndDate({
      startDate: '2026-07-01',
      endDate: '2026-09-01',
      actualProgress: 100,
      today: new Date(2026, 10, 16),
    });

    expect(res.isCompleted).toBe(true);
    expect(res.isOverdue).toBe(false);
    expect(res.label).toBe('Selesai');
  });
});

describe('getAnalisaFinanceBadge (F-22)', () => {
  it('never returns Sehat when totalPemasukan is 0', () => {
    const badge = getAnalisaFinanceBadge({
      isCashDeficit: false,
      isOverBudget: false,
      isNearBudget: false,
      totalPemasukan: 0,
      estLaba: 0,
    });

    expect(badge.color).toBe('amber');
    expect(badge.label).not.toContain('Sehat');
  });

  it('returns rose Proyeksi Rugi when estLaba < 0 even without cash deficit or RAP overrun', () => {
    const badge = getAnalisaFinanceBadge({
      isCashDeficit: false,
      isOverBudget: false,
      isNearBudget: false,
      totalPemasukan: 50_000_000,
      estLaba: -10_000_000,
    });

    expect(badge.color).toBe('rose');
    expect(badge.label).not.toContain('Sehat');
  });

  it('returns rose Defisit Kas when cash is negative', () => {
    const badge = getAnalisaFinanceBadge({
      isCashDeficit: true,
      isOverBudget: true,
      isNearBudget: false,
      totalPemasukan: 0,
      estLaba: -15_000_000,
    });

    expect(badge.color).toBe('rose');
    expect(badge.label).toBe('Keuangan: Defisit Kas');
  });

  it('returns emerald Keuangan: Sehat when cashflow is positive and profitable', () => {
    const badge = getAnalisaFinanceBadge({
      isCashDeficit: false,
      isOverBudget: false,
      isNearBudget: false,
      totalPemasukan: 40_000_000,
      estLaba: 20_000_000,
    });

    expect(badge.color).toBe('emerald');
    expect(badge.label).toBe('Keuangan: Sehat');
  });
});

describe('getBehindScheduleAdvice (F-22)', () => {
  it('never mentions penambahan tukang for IT, service, event, manufacturing, or other types', () => {
    for (const type of ['it', 'IT', 'service', 'Jasa', 'event', 'manufacturing', 'other', '', undefined]) {
      const advice = getBehindScheduleAdvice(type);
      expect(advice.toLowerCase()).not.toContain('tukang');
    }
  });

  it('provides domain-appropriate recommendations for IT and Event projects', () => {
    expect(getBehindScheduleAdvice('it').toLowerCase()).toContain('developer');
    expect(getBehindScheduleAdvice('event').toLowerCase()).toContain('vendor');
  });
});
