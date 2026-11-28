import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));
import {
  cashAfter,
  linesAreBalanced,
  projectDividendCash,
  projectDividendReceivableOffset,
  projectExpense,
  projectIncome,
  receiveReceivable,
  toRupiah,
  walletTransfer,
  payPayable,
} from '@domain/journal';
import { balanceDelta, isBalanceSheetBalanced } from '../../financeV2Calc';
import { buildProfitLossFromLines } from '../reports/profitLossReport';
import type { JournalLineEnriched } from '../reports/types';

type LedgerAccount = {
  id: string;
  name: string;
  type: JournalLineEnriched['accountType'];
  category: 'aktiva' | 'pasiva';
  projectId: string | null;
  balance: number;
};

type LedgerPosting = {
  journalId: string;
  entryDate: string;
  description: string;
  referenceType: string;
  referenceId: string | null;
  lines: Array<{ accountId: string; debit: number; credit: number }>;
};

function createLedgerHarness() {
  const accounts: LedgerAccount[] = [
    { id: 'kas-bisnis', name: 'Kas Bisnis', type: 'kas', category: 'aktiva', projectId: null, balance: 0 },
    { id: 'kas-p1', name: 'Kas Proyek A', type: 'kas', category: 'aktiva', projectId: 'p1', balance: 0 },
    { id: 'kas-p2', name: 'Kas Proyek B', type: 'kas', category: 'aktiva', projectId: 'p2', balance: 0 },
    { id: 'piutang', name: 'Piutang Usaha', type: 'piutang', category: 'aktiva', projectId: null, balance: 0 },
    { id: 'modal', name: 'Modal Disetor', type: 'modal_disetor', category: 'pasiva', projectId: null, balance: 0 },
    { id: 'laba-ditahan', name: 'Laba Ditahan', type: 'laba_ditahan', category: 'pasiva', projectId: null, balance: 0 },
    { id: 'laba', name: 'Laba Periode Berjalan', type: 'laba', category: 'pasiva', projectId: null, balance: 0 },
  ];

  const postings: LedgerPosting[] = [];
  let seq = 0;

  function post(input: Omit<LedgerPosting, 'journalId'>): string {
    const rounded = input.lines.map((l) => ({
      accountId: l.accountId,
      debit: toRupiah(l.debit),
      credit: toRupiah(l.credit),
    }));
    expect(linesAreBalanced(rounded)).toBe(true);

    seq += 1;
    const journalId = `j-${seq}`;
    postings.push({ ...input, journalId, lines: rounded });

    for (const line of rounded) {
      const acc = accounts.find((a) => a.id === line.accountId)!;
      acc.balance += balanceDelta(acc.category, line.debit, line.credit);
    }
    return journalId;
  }

  function reverse(journalId: string, entryDate: string, reason: string): string {
    const orig = postings.find((p) => p.journalId === journalId)!;
    return post({
      entryDate,
      description: reason,
      referenceType: 'reversal',
      referenceId: journalId,
      lines: orig.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.credit,
        credit: l.debit,
      })),
    });
  }

  function toEnrichedLines(): JournalLineEnriched[] {
    const out: JournalLineEnriched[] = [];
    for (const p of postings) {
      for (const l of p.lines) {
        const acc = accounts.find((a) => a.id === l.accountId)!;
        out.push({
          journalId: p.journalId,
          entryDate: p.entryDate,
          description: p.description,
          referenceType: p.referenceType,
          referenceId: p.referenceId,
          accountId: acc.id,
          accountName: acc.name,
          accountType: acc.type,
          accountCategory: acc.category,
          projectId: acc.projectId,
          debit: l.debit,
          credit: l.credit,
        });
      }
    }
    return out;
  }

  function totalsByCategory() {
    const aktiva = accounts.filter((a) => a.category === 'aktiva').reduce((s, a) => s + a.balance, 0);
    const pasiva = accounts.filter((a) => a.category === 'pasiva').reduce((s, a) => s + a.balance, 0);
    return { aktiva, pasiva };
  }

  return { accounts, postings, post, reverse, toEnrichedLines, totalsByCategory };
}

describe('F0 Invarian Buku Besar', () => {
  it('Invarian 1, 2, & 3: Debit = Kredit, Aktiva = Pasiva, Kas Buku = Kas Operasional, dan Laba Bisnis = Sum(Laba Proyek) - Opex', () => {
    const ledger = createLedgerHarness();

    // 0. Modal awal Rp 20.000.000 masuk Kas Bisnis
    ledger.post({
      entryDate: '2026-11-01',
      description: 'Setoran modal awal',
      referenceType: 'manual',
      referenceId: 'inv-1',
      lines: [
        { accountId: 'kas-bisnis', debit: 20_000_000, credit: 0 },
        { accountId: 'modal', debit: 0, credit: 20_000_000 },
      ],
    });

    // 1. Proyek A: pemasukan Rp 100.000.000, biaya Rp 50.000.000, lalu dikoreksi menjadi Rp 55.000.000
    ledger.post({
      entryDate: '2026-11-05',
      description: 'DP & Termin Proyek A',
      referenceType: 'project_income',
      referenceId: 'inc-a1',
      lines: [
        { accountId: 'kas-p1', debit: 100_000_000, credit: 0 },
        { accountId: 'laba', debit: 0, credit: 100_000_000 },
      ],
    });
    const jCostA1 = ledger.post({
      entryDate: '2026-11-06',
      description: 'Beli material semen & besi Proyek A',
      referenceType: 'project_expense',
      referenceId: 'cost-a1',
      lines: [
        { accountId: 'laba', debit: 50_000_000, credit: 0 },
        { accountId: 'kas-p1', debit: 0, credit: 50_000_000 },
      ],
    });
    // Edit biaya Proyek A -> balik 50jt, posting ulang 55jt
    ledger.reverse(jCostA1, '2026-11-07', 'Koreksi biaya Proyek A');
    ledger.post({
      entryDate: '2026-11-07',
      description: 'Beli material semen & besi Proyek A (koreksi)',
      referenceType: 'project_expense',
      referenceId: 'cost-a1',
      lines: [
        { accountId: 'laba', debit: 55_000_000, credit: 0 },
        { accountId: 'kas-p1', debit: 0, credit: 55_000_000 },
      ],
    });
    // Biaya salah catat di Proyek A Rp 5.000.000 lalu dihapus (soft-delete + reversal)
    const jCostWrong = ledger.post({
      entryDate: '2026-11-08',
      description: 'Biaya duplikat Proyek A',
      referenceType: 'project_expense',
      referenceId: 'cost-a-wrong',
      lines: [
        { accountId: 'laba', debit: 5_000_000, credit: 0 },
        { accountId: 'kas-p1', debit: 0, credit: 5_000_000 },
      ],
    });
    ledger.reverse(jCostWrong, '2026-11-08', 'Batal biaya duplikat');

    // Dividen proyek A ke investor sebesar Rp 10.000.000 (ekuitas, bukan biaya proyek!)
    ledger.post({
      entryDate: '2026-11-10',
      description: 'Dividen Proyek A',
      referenceType: 'dividend',
      referenceId: 'div-a1',
      lines: [
        { accountId: 'laba-ditahan', debit: 10_000_000, credit: 0 },
        { accountId: 'kas-p1', debit: 0, credit: 10_000_000 },
      ],
    });

    // 2. Proyek B: pemasukan Rp 60.000.000, biaya Rp 40.000.000
    ledger.post({
      entryDate: '2026-11-12',
      description: 'Termin Proyek B',
      referenceType: 'project_income',
      referenceId: 'inc-b1',
      lines: [
        { accountId: 'kas-p2', debit: 60_000_000, credit: 0 },
        { accountId: 'laba', debit: 0, credit: 60_000_000 },
      ],
    });
    ledger.post({
      entryDate: '2026-11-14',
      description: 'Upah tukang Proyek B',
      referenceType: 'project_expense',
      referenceId: 'cost-b1',
      lines: [
        { accountId: 'laba', debit: 40_000_000, credit: 0 },
        { accountId: 'kas-p2', debit: 0, credit: 40_000_000 },
      ],
    });

    // 3. Opex bisnis Rp 12.000.000 (mis. keramik perbaikan workshop & listrik)
    ledger.post({
      entryDate: '2026-11-15',
      description: 'Perbaikan workshop & listrik',
      referenceType: 'opex',
      referenceId: 'opex-1',
      lines: [
        { accountId: 'laba', debit: 12_000_000, credit: 0 },
        { accountId: 'kas-bisnis', debit: 0, credit: 12_000_000 },
      ],
    });

    // Invariant 1: Sum(Debit) === Sum(Credit) di setiap jurnal & Neraca seimbang
    for (const p of ledger.postings) {
      const dr = p.lines.reduce((s, l) => s + l.debit, 0);
      const cr = p.lines.reduce((s, l) => s + l.credit, 0);
      expect(dr).toBe(cr);
    }
    const bs1 = ledger.totalsByCategory();
    expect(isBalanceSheetBalanced(bs1.aktiva, bs1.pasiva)).toBe(true);

    // Invariant 2: Kas Buku === Kas Operasional per proyek
    const kasBukuP1 = ledger.accounts.find((a) => a.id === 'kas-p1')!.balance;
    const kasOpP1 = cashAfter(0, [
      { direction: 'in', amount: 100_000_000 },
      { direction: 'out', amount: 55_000_000 },
      { direction: 'out', amount: 10_000_000 }, // dividen kas keluar dari dompet proyek
    ]);
    expect(kasBukuP1).toBe(kasOpP1);
    expect(kasBukuP1).toBe(35_000_000);

    const kasBukuP2 = ledger.accounts.find((a) => a.id === 'kas-p2')!.balance;
    expect(kasBukuP2).toBe(20_000_000);

    // Invariant 3: Jumlah laba proyek (45jt + 20jt = 65jt) - Opex (12jt) = Laba Bisnis (53jt)
    const pl = buildProfitLossFromLines(
      ledger.toEnrichedLines(),
      { p1: 'Proyek A', p2: 'Proyek B' },
      { 'opex-1': 'Perawatan Workshop' },
      {},
      { 'opex-1': 'opex-1' },
    );
    const projectProfitA = 100_000_000 - 55_000_000; // 45jt (dividen tidak mengurangi profit!)
    const projectProfitB = 60_000_000 - 40_000_000;  // 20jt
    expect(pl.revenue).toBe(160_000_000);
    expect(pl.hpp).toBe(95_000_000);
    expect(pl.grossProfit).toBe(projectProfitA + projectProfitB);
    expect(pl.opex).toBe(12_000_000);
    expect(pl.netProfit).toBe(projectProfitA + projectProfitB - 12_000_000);
    expect(pl.netProfit).toBe(53_000_000);

    // Tutup Proyek B (20jt), lalu Tutup Periode (sisa 53jt - 20jt = 33jt) -> pindah 1x ke Laba Ditahan!
    ledger.post({
      entryDate: '2026-11-28',
      description: 'Tutup Proyek B — kas & laba',
      referenceType: 'project_close',
      referenceId: 'p2',
      lines: [
        { accountId: 'kas-bisnis', debit: 20_000_000, credit: 0 },
        { accountId: 'kas-p2', debit: 0, credit: 20_000_000 },
        { accountId: 'laba', debit: 20_000_000, credit: 0 },
        { accountId: 'laba-ditahan', debit: 0, credit: 20_000_000 },
      ],
    });
    const alreadyClosed = 20_000_000;
    const remaining = pl.netProfit - alreadyClosed; // 33jt
    ledger.post({
      entryDate: '2026-11-30',
      description: 'Tutup periode 2026-11',
      referenceType: 'period_close',
      referenceId: 'snap-2026-11',
      lines: [
        { accountId: 'laba', debit: remaining, credit: 0 },
        { accountId: 'laba-ditahan', debit: 0, credit: remaining },
      ],
    });

    // Saldo Laba Periode kembali 0, Laba Ditahan = -10jt (dividen) + 53jt (netProfit) = 43jt, Neraca tetap seimbang
    expect(ledger.accounts.find((a) => a.id === 'laba')!.balance).toBe(0);
    expect(ledger.accounts.find((a) => a.id === 'laba-ditahan')!.balance).toBe(43_000_000);
    const bsFinal = ledger.totalsByCategory();
    expect(isBalanceSheetBalanced(bsFinal.aktiva, bsFinal.pasiva)).toBe(true);
  });

  it('semua fungsi template domain menghasilkan jurnal seimbang rupiah bulat', () => {
    for (const lines of [
      projectIncome(1_250_000.6),
      projectExpense(450_000.4),
      walletTransfer(300_000),
      payPayable(120_000),
      receiveReceivable(120_000),
      projectDividendCash(500_000),
      projectDividendReceivableOffset(200_000),
    ]) {
      expect(linesAreBalanced(lines)).toBe(true);
    }
  });
});

