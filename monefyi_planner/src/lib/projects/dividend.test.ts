import { describe, expect, it } from 'vitest';
import { dividendPool, previewDividend } from './dividend';

describe('dividendPool', () => {
  it('restores owner piutang that had reduced cash', () => {
    const pool = dividendPool({
      received: 30_200_000,
      spent: 17_000_000,
      totalPiutang: 1_787_000,
      ownerPiutang: 1_787_000,
      contractValue: 30_200_000,
    });
    expect(pool).toBe(13_200_000);
  });

  it('does not restore client piutang', () => {
    const pool = dividendPool({
      received: 30_200_000,
      spent: 17_000_000,
      totalPiutang: 1_787_000,
      ownerPiutang: 0,
      contractValue: 30_200_000,
    });
    expect(pool).toBe(11_413_000);
  });
});

describe('previewDividend', () => {
  it('offsets owner share against their receivable then pays the rest in cash', () => {
    const { lines } = previewDividend({
      pool: 13_200_000,
      parties: [
        { id: 'h', name: 'Hanif', sharePct: 50, isOwner: true },
        { id: 'p', name: 'Partner', sharePct: 50, isOwner: false },
      ],
      ownerPiutangByParty: { hanif: 1_787_000 },
      payouts: [],
    });
    expect(Math.round(lines[0].shareAmount)).toBe(6_600_000);
    expect(lines[0].offsetPiutang).toBe(1_787_000);
    expect(Math.round(lines[0].cashDue)).toBe(4_813_000);
    expect(Math.round(lines[1].cashDue)).toBe(6_600_000);
  });
});
