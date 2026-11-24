import { describe, expect, it } from 'vitest';
import {
  buildJournalTemplate,
  cashAfter,
  clientTermin,
  FINANCE_EVENT_CODES,
  hppRoleForRapType,
  linesAreBalanced,
  partyDebt,
  payPayable,
  projectDividendCash,
  projectDividendReceivableOffset,
  projectExpense,
  projectIncome,
  receiveReceivable,
  validateJournalDimensions,
  walletTransfer,
} from '../../../../packages/domain/src/journal';

describe('template jurnal', () => {
  it('kejadian seimbang dalam rupiah bulat termasuk dividen proyek', () => {
    for (const lines of [
      projectExpense(100_000),
      projectIncome(1_500_000.4),
      walletTransfer(250_000),
      payPayable(80_000),
      receiveReceivable(80_000),
      projectDividendCash(500_000),
      projectDividendReceivableOffset(200_000),
    ]) {
      expect(linesAreBalanced(lines)).toBe(true);
    }
    expect(projectIncome(1_500_000.4)[0].debit).toBe(1_500_000);
    expect(projectDividendCash(500_000)[0]).toMatchObject({ role: 'dividen', debit: 500_000 });
    expect(projectDividendReceivableOffset(200_000)[1]).toMatchObject({ role: 'piutang', credit: 200_000 });
  });

  it('seluruh 24 kode kejadian tertutup F1 seimbang dan rupiah bulat (invarian lintas template)', () => {
    for (const code of FINANCE_EVENT_CODES) {
      const lines = buildJournalTemplate(code, 1_250_000.6, { dpApplied: 300_000 });
      expect(linesAreBalanced(lines), code).toBe(true);
      for (const line of lines) {
        expect(Number.isInteger(line.debit), code).toBe(true);
        expect(Number.isInteger(line.credit), code).toBe(true);
      }
    }
  });

  it('clientTermin memotong uang muka klien dengan tepat dan seimbang', () => {
    const lines = clientTermin(10_000_000, 3_000_000);
    expect(lines).toEqual([
      { role: 'kas', debit: 7_000_000, credit: 0 },
      { role: 'uang_muka_klien', debit: 3_000_000, credit: 0 },
      { role: 'pendapatan_proyek', debit: 0, credit: 10_000_000 },
    ]);
    expect(linesAreBalanced(lines)).toBe(true);
  });

  it('memetakan jenis RAP ke sub-akun HPP dan tanpa RAP ke belum dikategorikan', () => {
    expect(hppRoleForRapType('material')).toBe('hpp_material');
    expect(hppRoleForRapType('labor')).toBe('hpp_labor');
    expect(hppRoleForRapType('tenaga')).toBe('hpp_labor');
    expect(hppRoleForRapType('equipment')).toBe('hpp_equipment');
    expect(hppRoleForRapType('overhead')).toBe('hpp_overhead');
    expect(hppRoleForRapType('other')).toBe('hpp_other');
    expect(hppRoleForRapType(null)).toBe('hpp_uncategorized');
  });

  it('validateJournalDimensions mewajibkan project_id untuk akun proyek dan party_id untuk hutang/piutang', () => {
    expect(
      validateJournalDimensions([{ role: 'hpp_material', projectId: null }]).ok,
    ).toBe(false);
    expect(
      validateJournalDimensions([{ role: 'hutang_dagang', partyId: null }]).ok,
    ).toBe(false);
    expect(
      validateJournalDimensions([
        { role: 'hpp_material', projectId: 'proj-1' },
        { role: 'hutang_dagang', partyId: 'party-1', projectId: 'proj-1' },
      ]).ok,
    ).toBe(true);
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
