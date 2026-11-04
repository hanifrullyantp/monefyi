import { describe, expect, it } from 'vitest';
import {
  cashAfter,
  linesAreBalanced,
  partyDebt,
  payPayable,
  projectExpense,
  projectIncome,
  receiveReceivable,
  walletTransfer,
} from '../../../packages/domain/src/journal';

describe('template jurnal', () => {
  it('lima kejadian seimbang dalam rupiah bulat', () => {
    for (const lines of [
      projectExpense(100_000),
      projectIncome(1_500_000.4),
      walletTransfer(250_000),
      payPayable(80_000),
      receiveReceivable(80_000),
    ]) {
      expect(linesAreBalanced(lines)).toBe(true);
    }
    expect(projectIncome(1_500_000.4)[0].debit).toBe(1_500_000);
  });
});

describe('hutang satu pihak di tiga proyek', () => {
  const rows = [
    { partyId: 'toko-a', projectId: 'rumah', amount: 100_000 },
    { partyId: 'toko-a', projectId: 'ruko', amount: 200_000 },
    { partyId: 'toko-a', projectId: 'gudang', amount: 300_000 },
    { partyId: 'toko-b', projectId: 'rumah', amount: 50_000 },
  ];

  it('jumlah hutang toko-a 600 ribu dan tiap proyek tetap terpisah', () => {
    expect(partyDebt(rows, 'toko-a')).toBe(600_000);
    expect(partyDebt(rows, 'toko-a', 'ruko')).toBe(200_000);
    expect(partyDebt(rows, 'toko-a', 'gudang')).toBe(300_000);
    expect(partyDebt(rows, 'toko-b')).toBe(50_000);
  });
});

describe('kas proyek dipakai operasional', () => {
  it('biaya proyek dan opex mengurangi dompet yang sama', () => {
    const left = cashAfter(1_000_000, [
      { direction: 'out', amount: 100_000 },
      { direction: 'out', amount: 50_000 },
    ]);
    expect(left).toBe(850_000);
    expect(projectExpense(100_000)[1]).toMatchObject({ role: 'kas', credit: 100_000 });
  });
});
