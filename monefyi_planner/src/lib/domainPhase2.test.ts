import { describe, expect, it } from 'vitest';
import { computeProjectEvm } from '../../../packages/domain/src/evm';
import { computeProjectEvm as edgeEvm } from '../../../my-supabase-project/supabase/functions/_shared/evm';
import { orgToday } from '../../../packages/domain/src/dates';
import { structuredError } from '../../../packages/domain/src/errors';
import { weightedActualProgress } from '../../../packages/domain/src/progress';
import { canMemorizeCommand, storedAmountConflicts } from '../../../packages/domain/src/validation';

const NOW = new Date('2026-01-06T00:00:00.000Z');

describe('computeProjectEvm', () => {
  const input = {
    budgetLines: [{ quantity: 2, unit_price: 1000 }],
    spentAmounts: [500],
    workItems: [{
      weight: 10,
      progress_pct: 40,
      planned_start: '2026-01-01',
      planned_end: '2026-01-11',
    }],
    plannedStart: '2026-01-01',
    plannedEnd: '2026-01-11',
    now: NOW,
  };

  it('menghitung EV, AC, CPI, dan EAC dari RAP dan progres', () => {
    const result = computeProjectEvm(input);
    expect(result.totalBudget).toBe(2000);
    expect(result.actualProgress).toBe(40);
    expect(result.ev).toBe(800);
    expect(result.ac).toBe(500);
    expect(result.cpi).toBe(1.6);
    expect(result.eac).toBe(1250);
    expect(result.totalDays).toBe(11);
    expect(result.elapsedDays).toBe(6);
    expect(result.spi).toBeCloseTo(result.ev / result.pv);
    expect(edgeEvm(input)).toEqual(result);
  });
});

describe('memori perintah', () => {
  it('nominal 650 juta dari memori lama bentrok dengan parser', () => {
    expect(storedAmountConflicts('beli semen 10 sak 65000', { total: 650_000_000 })).toBe(true);
    expect(storedAmountConflicts('beli semen 10 sak 65000', {
      qty: 10,
      unitPrice: 65_000,
      total: 650_000,
    })).toBe(false);
  });

  it('penerimaan 15 juta bentrok dengan 1,5 juta', () => {
    expect(storedAmountConflicts('terima 1,5 juta dp proyek rumah', { total: 15_000_000 })).toBe(true);
    expect(storedAmountConflicts('terima 1,5 juta dp proyek rumah', { total: 1_500_000 })).toBe(false);
  });

  it('model tidak menghafal nominal yang bentrok atau masih ditinjau', () => {
    expect(canMemorizeCommand('beli semen 10 sak 65000', { total: 650_000_000 }, 'ai')).toBe(false);
    expect(canMemorizeCommand('beli semen 10 sak 65000', { total: 650_000, needsReview: true }, 'ai')).toBe(false);
    expect(canMemorizeCommand('beli semen 10 sak 65000', { total: 700_000 }, 'user')).toBe(true);
    expect(canMemorizeCommand('beli semen 10 sak 65000', { total: 1.5 }, 'user')).toBe(false);
  });
});

describe('lapisan domain lain', () => {
  it('progres tertimbang dan tanggal organisasi', () => {
    expect(weightedActualProgress([
      { progress_pct: 100, weight: 70 },
      { progress_pct: 0, weight: 30 },
    ])).toBe(70);
    expect(orgToday('Asia/Jakarta', new Date('2026-11-03T17:30:00.000Z'))).toBe('2026-11-04');
  });

  it('error terstruktur punya code dan petunjuk', () => {
    expect(structuredError('input_kosong', 'Isi perintah.')).toEqual({
      code: 'input_kosong',
      message_id: 'input_kosong',
      fix_hint: 'Isi perintah.',
      valid_options: [],
    });
  });
});
