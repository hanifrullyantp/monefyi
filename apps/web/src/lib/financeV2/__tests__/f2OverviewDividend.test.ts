import { describe, expect, it } from 'vitest';
import { linesAreBalanced } from '../../../../../../packages/domain/src/journal';
import { buildOverviewThreeCards } from '../overviewCards';
import { planBusinessModeDividend, planProjectModeDividend } from '../dividendModes';
import type { JournalLineEnriched } from '../reports/types';

describe('F2 — 3 Kartu Halaman Depan & Dividen Dua Mode', () => {
  it('menyusun 3 kartu halaman depan secara konsisten dari buku besar + RAP + opex', () => {
    const monthLines: JournalLineEnriched[] = [
      {
        journalId: 'j1',
        entryDate: '2026-11-10',
        description: 'Termin Proyek Alpha',
        referenceType: 'project_income',
        referenceId: 'inc1',
        accountId: 'a-rev',
        accountName: 'Pendapatan Proyek',
        accountType: 'pendapatan_proyek',
        accountCategory: 'pasiva',
        projectId: 'p1',
        partyId: 'c1',
        debit: 0,
        credit: 80_000_000,
      },
      {
        journalId: 'j2',
        entryDate: '2026-11-11',
        description: 'Material Proyek Alpha',
        referenceType: 'project_cost',
        referenceId: 'cos1',
        accountId: 'a-hpp',
        accountName: 'HPP Material',
        accountType: 'hpp_material',
        accountCategory: 'pasiva',
        projectId: 'p1',
        partyId: null,
        debit: 45_000_000,
        credit: 0,
      },
      {
        journalId: 'j3',
        entryDate: '2026-11-15',
        description: 'Listrik & sewa kantor',
        referenceType: 'opex_realization',
        referenceId: 'opx1',
        accountId: 'a-opx',
        accountName: 'Beban Operasional',
        accountType: 'beban_opex',
        accountCategory: 'pasiva',
        projectId: null,
        partyId: null,
        debit: 8_000_000,
        credit: 0,
      },
    ];

    const result = buildOverviewThreeCards({
      todayIso: '2026-11-24',
      monthLabel: '2026-11',
      accounts: [
        { id: 'kas-bca', name: 'Bank BCA', type: 'kas', current_balance: 50_000_000 },
        { id: 'kas-tunai', name: 'Kas Kecil', type: 'kas', current_balance: 5_000_000 },
        { id: 'ret-1', name: 'Piutang Retensi', type: 'piutang_retensi', current_balance: 4_000_000 },
      ],
      monthLines,
      allProjectLines: monthLines,
      projectNames: { p1: 'Proyek Alpha' },
      opexCategoryNames: { c1: 'Operasional' },
      opexRealizationCategory: { opx1: 'c1' },
      rapPlannedByProject: { p1: 60_000_000 },
      receivables: [
        { amount: 10_000_000, paid_amount: 2_000_000, due_date: '2026-11-20', status: 'overdue' },
      ],
      payables: [
        { amount: 6_000_000, paid_amount: 0, due_date: '2026-11-30', status: 'open' },
      ],
      monthlyOpexPlanned: 10_000_000,
    });

    // Kartu 1
    expect(result.card1CashDebt.totalCash).toBe(55_000_000);
    expect(result.card1CashDebt.wallets).toHaveLength(2);
    expect(result.card1CashDebt.totalReceivable).toBe(8_000_000);
    expect(result.card1CashDebt.overdueReceivable).toBe(8_000_000);
    expect(result.card1CashDebt.retentionReceivable).toBe(4_000_000);
    expect(result.card1CashDebt.totalPayable).toBe(6_000_000);
    expect(result.card1CashDebt.netPosition).toBe(61_000_000);

    // Kartu 2
    expect(result.card2Projects[0]).toMatchObject({
      projectId: 'p1',
      revenue: 80_000_000,
      hpp: 45_000_000,
      profit: 35_000_000,
      rapPlanned: 60_000_000,
      rapActual: 45_000_000,
      rapRemaining: 15_000_000,
      rapUsagePct: 75,
    });

    // Kartu 3
    expect(result.card3BusinessMonth).toMatchObject({
      grossProfit: 35_000_000,
      opexPlanned: 10_000_000,
      opexActual: 8_000_000,
      opexVariance: 2_000_000,
      netProfit: 27_000_000,
    });
  });

  it('mode dividen per_bisnis menghormati cadangan opex 1x dan menghasilkan jurnal seimbang', () => {
    const plan = planBusinessModeDividend({
      totalCash: 50_000_000,
      monthlyPlannedOpex: 12_000_000,
      labaDitahan: 60_000_000,
      parties: [
        { id: 'u1', name: 'Owner A', sharePct: 60, isOwner: true },
        { id: 'u2', name: 'Investor B', sharePct: 40, isOwner: false },
      ],
    });

    // Kas 50jt - cadangan opex 12jt = 38jt < laba ditahan 60jt
    expect(plan.opexReserve).toBe(12_000_000);
    expect(plan.cashAfterReserve).toBe(38_000_000);
    expect(plan.maxDistributable).toBe(38_000_000);
    expect(plan.totalCashOut).toBe(38_000_000);
    expect(plan.blockedReason).toBeNull();
    expect(linesAreBalanced(plan.journalTemplate)).toBe(true);
    expect(plan.journalTemplate[0].role).toBe('dividen');
    expect(plan.journalTemplate[1].role).toBe('kas');
  });

  it('mode dividen per_bisnis menolak bila melebihi batas kas aman', () => {
    const plan = planBusinessModeDividend({
      totalCash: 20_000_000,
      monthlyPlannedOpex: 15_000_000,
      labaDitahan: 40_000_000,
      requestedAmount: 10_000_000,
      parties: [{ id: 'u1', name: 'Owner A', sharePct: 100, isOwner: true }],
    });

    expect(plan.maxDistributable).toBe(5_000_000);
    expect(plan.blockedReason).not.toBeNull();
    expect(plan.journalTemplate).toHaveLength(0);
  });

  it('mode dividen per_proyek meng-offset piutang owner dan menghasilkan jurnal proyek seimbang', () => {
    const plan = planProjectModeDividend({
      projectId: 'p-1',
      received: 100_000_000,
      spent: 60_000_000,
      totalPiutang: 0,
      ownerPiutang: 0,
      contractValue: 100_000_000,
      parties: [
        { id: 'u1', name: 'Owner', sharePct: 50, isOwner: true },
        { id: 'u2', name: 'Mitra', sharePct: 50, isOwner: false },
      ],
      ownerPiutangByParty: { owner: 5_000_000 },
      payouts: [],
    });

    expect(plan.projectPool).toBe(40_000_000);
    // Owner bagian 20jt dikurangi offset piutang 5jt = 15jt kas + Mitra 20jt = 35jt kas keluar
    expect(plan.totalCashOut).toBe(35_000_000);
    expect(plan.blockedReason).toBeNull();
    expect(linesAreBalanced(plan.journalTemplate)).toBe(true);
    expect(plan.journalTemplate[0].role).toBe('dividen');
    expect(plan.journalTemplate[1].role).toBe('kas');
  });
});

