import { describe, expect, it } from 'vitest';
import {
  cashAfterExtraPiutang,
  extraPiutangBeyondContract,
  projectOperatingCash,
} from './cashIdentity';

describe('extraPiutangBeyondContract', () => {
  it('is zero when piutang equals remaining contract', () => {
    expect(extraPiutangBeyondContract(30_000_000, 100_000_000, 70_000_000)).toBe(0);
  });

  it('returns the excess when contract is already fully received', () => {
    expect(extraPiutangBeyondContract(1_787_000, 30_200_000, 30_200_000)).toBe(1_787_000);
  });
});

describe('projectOperatingCash', () => {
  it('subtracts extra piutang from received − spent', () => {
    expect(projectOperatingCash({
      received: 30_200_000,
      spent: 17_000_000,
      piutang: 1_787_000,
      contractValue: 30_200_000,
    })).toBe(11_413_000);
  });

  it('does not subtract expected remaining contract receivable', () => {
    expect(projectOperatingCash({
      received: 70_000_000,
      spent: 50_000_000,
      piutang: 30_000_000,
      contractValue: 100_000_000,
    })).toBe(20_000_000);
  });
});

describe('cashAfterExtraPiutang', () => {
  it('reduces a still-gross saldo', () => {
    expect(cashAfterExtraPiutang(13_200_000, 1_787_000, 30_200_000, 17_000_000)).toBe(11_413_000);
  });

  it('does not double-subtract a saldo that is already net', () => {
    expect(cashAfterExtraPiutang(11_413_000, 1_787_000, 30_200_000, 17_000_000)).toBe(11_413_000);
  });
});
