import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));

import {
  applyReclassificationJournalsToAccounts,
  reconcileF1Migration,
  summarizeAccounts,
} from '../reconciliation';
import { businessReportFromLedger } from '../../../services/financeV1/businessReportService';
import type { FinanceAccount } from '../../../types/financeV2';
import type { JournalLineEnriched } from '../reports/types';

describe('F1 migrasi saldo lama & rekonsiliasi dry-run', () => {
  const accounts: Pick<FinanceAccount, 'type' | 'current_balance'>[] = [
    { type: 'kas', current_balance: 35_000_000 },
    { type: 'piutang', current_balance: 10_000_000 },
    { type: 'hutang_dagang', current_balance: 5_000_000 },
    { type: 'laba', current_balance: 40_000_000 },
  ];

  it('mode dry-run memetakan biaya ke sub-akun HPP RAP, menandai tanpa RAP sebagai belum dikategorikan, dan angka sebelum=sesudah', () => {
    const report = reconcileF1Migration({
      accounts,
      costs: [
        { id: 'c1', projectId: 'p1', description: 'Semen', amount: 15_000_000, rapItemId: 'rap-1' },
        { id: 'c2', projectId: 'p1', description: 'Upah tukang', amount: 10_000_000, rapItemId: 'rap-2' },
        { id: 'c3', projectId: 'p1', description: 'Beli baut dadakan', amount: 500_000, rapItemId: null },
      ],
      rapTypesById: {
        'rap-1': 'material',
        'rap-2': 'labor',
      },
      dryRun: true,
    });

    expect(report.dryRun).toBe(true);
    expect(report.matched).toBe(true);
    expect(report.before).toEqual(report.after);
    expect(report.remappedCosts[0].targetAccountType).toBe('hpp_material');
    expect(report.remappedCosts[1].targetAccountType).toBe('hpp_labor');
    expect(report.remappedCosts[2]).toMatchObject({
      targetAccountType: 'hpp_uncategorized',
      needsReview: true,
    });
    expect(report.uncategorizedCount).toBe(1);
    expect(report.uncategorizedTotal).toBe(500_000);
  });

  it('businessReportFromLedger membaca COA F1 dari buku besar dan menghasilkan angka identik dengan P&L buku besar', () => {
    const lines: JournalLineEnriched[] = [
      {
        journalId: 'e1',
        entryDate: '2026-11-10',
        referenceType: 'project_income',
        referenceId: 'inc-1',
        description: 'Termin 1 Proyek A',
        accountId: 'a-rev',
        accountName: 'Pendapatan Proyek',
        accountType: 'pendapatan_proyek',
        accountCategory: 'pasiva',
        debit: 0,
        credit: 50_000_000,
        projectId: 'p-a',
        partyId: 'c-1',
      },
      {
        journalId: 'e2',
        entryDate: '2026-11-12',
        referenceType: 'project_cost',
        referenceId: 'cost-1',
        description: 'Semen Proyek A',
        accountId: 'a-hpp-mat',
        accountName: 'HPP Material',
        accountType: 'hpp_material',
        accountCategory: 'pasiva',
        debit: 15_000_000,
        credit: 0,
        projectId: 'p-a',
        partyId: null,
      },
      {
        journalId: 'e3',
        entryDate: '2026-11-13',
        referenceType: 'project_cost',
        referenceId: 'cost-2',
        description: 'Upah tukang Proyek A',
        accountId: 'a-hpp-lab',
        accountName: 'HPP Upah',
        accountType: 'hpp_labor',
        accountCategory: 'pasiva',
        debit: 10_000_000,
        credit: 0,
        projectId: 'p-a',
        partyId: null,
      },
      {
        journalId: 'e4',
        entryDate: '2026-11-15',
        referenceType: 'opex_realization',
        referenceId: 'opx-1',
        description: 'Sewa workshop',
        accountId: 'a-opex',
        accountName: 'Beban Operasional',
        accountType: 'beban_opex',
        accountCategory: 'pasiva',
        debit: 5_000_000,
        credit: 0,
        projectId: null,
        partyId: null,
      },
    ];

    const v1Report = businessReportFromLedger({
      filters: {
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
      },
      lines,
      projectNames: { 'p-a': 'Proyek A' },
      opexCategoryNames: { 'cat-sewa': 'Sewa & Kantor' },
      receivableProjectMap: {},
      opexRealizationCategory: { 'opx-1': 'cat-sewa' },
    });

    expect(v1Report.revenue.total).toBe(50_000_000);
    expect(v1Report.hpp.total).toBe(25_000_000);
    expect(v1Report.grossProfit).toBe(25_000_000);
    expect(v1Report.opex.total).toBe(5_000_000);
    expect(v1Report.netProfit).toBe(20_000_000);
    expect(v1Report.hpp.byType).toHaveLength(2);
    expect(v1Report.hpp.byType.find((r) => r.type === 'material')?.amount).toBe(15_000_000);
    expect(v1Report.hpp.byType.find((r) => r.type === 'labor')?.amount).toBe(10_000_000);
    expect(v1Report.byProjectProfit[0]).toMatchObject({
      projectId: 'p-a',
      revenue: 50_000_000,
      hpp: 25_000_000,
      grossProfit: 25_000_000,
      marginPct: 50,
    });
  });

  it('menghasilkan jurnal reklasifikasi append-only yang seimbang untuk biaya, pemasukan non-DP, dan DP serta menghitung after secara nyata', () => {
    const initialAccounts: Pick<FinanceAccount, 'type' | 'current_balance'>[] = [
      { type: 'kas', current_balance: 70_000_000 },
      { type: 'piutang', current_balance: 5_000_000 },
      { type: 'hutang_dagang', current_balance: 10_000_000 },
      // Laba F0 = termin 50jt + DP 20jt - semen 15jt - upah 10jt - tanpa RAP 5jt = 40jt
      { type: 'laba', current_balance: 40_000_000 },
    ];
    const snapshotBefore = initialAccounts.map((a) => ({ ...a }));

    const report = reconcileF1Migration({
      accounts: initialAccounts,
      costs: [
        { id: 'c1', projectId: 'p1', description: 'Semen', amount: 15_000_000, rapItemId: 'rap-1' },
        { id: 'c2', projectId: 'p1', description: 'Upah tukang', amount: 10_000_000, rapItemId: 'rap-2' },
        { id: 'c3', projectId: 'p1', description: 'Beli baut', amount: 5_000_000, rapItemId: null },
      ],
      incomes: [
        { id: 'i1', projectId: 'p1', category: 'termin', amount: 50_000_000, status: 'received' },
        { id: 'i2', projectId: 'p1', category: 'dp', amount: 20_000_000, status: 'received' },
        { id: 'i3', projectId: 'p1', category: 'termin', amount: 12_000_000, status: 'pending' },
      ],
      rapTypesById: {
        'rap-1': 'material',
        'rap-2': 'labor',
      },
      dryRun: true,
    });

    // Dry-run tidak boleh memutasi array/state akun asli pemanggil
    expect(initialAccounts).toEqual(snapshotBefore);

    // 3 biaya + 2 pemasukan received (pending diabaikan) = 5 jurnal reklasifikasi
    expect(report.reclassificationJournals).toHaveLength(5);
    for (const j of report.reclassificationJournals) {
      expect(j.referenceType).toBe('f1_migration');
      const totalDebit = j.lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = j.lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeGreaterThan(0);
      expect(totalDebit).toBe(totalCredit);
    }

    // Verifikasi pemetaan akun di jurnal reklasifikasi
    const costMatJournal = report.reclassificationJournals.find((j) => j.referenceId === 'c1');
    expect(costMatJournal?.lines).toEqual([
      expect.objectContaining({ accountType: 'hpp_material', debit: 15_000_000, credit: 0, needsReview: false }),
      expect.objectContaining({ accountType: 'laba', debit: 0, credit: 15_000_000, needsReview: false }),
    ]);

    const costUncatJournal = report.reclassificationJournals.find((j) => j.referenceId === 'c3');
    expect(costUncatJournal?.lines).toEqual([
      expect.objectContaining({ accountType: 'hpp_uncategorized', debit: 5_000_000, credit: 0, needsReview: true }),
      expect.objectContaining({ accountType: 'laba', debit: 0, credit: 5_000_000, needsReview: false }),
    ]);

    const terminJournal = report.reclassificationJournals.find((j) => j.referenceId === 'i1');
    expect(terminJournal?.lines).toEqual([
      expect.objectContaining({ accountType: 'laba', debit: 50_000_000, credit: 0 }),
      expect.objectContaining({ accountType: 'pendapatan_proyek', debit: 0, credit: 50_000_000 }),
    ]);

    const dpJournal = report.reclassificationJournals.find((j) => j.referenceId === 'i2');
    expect(dpJournal?.lines).toEqual([
      expect.objectContaining({ accountType: 'laba', debit: 20_000_000, credit: 0 }),
      expect.objectContaining({ accountType: 'uang_muka_klien', debit: 0, credit: 20_000_000 }),
    ]);

    // Verifikasi saldo akun sesudah simulasi nyata
    const byType = Object.fromEntries(report.simulatedAccounts.map((a) => [a.type, a.current_balance]));
    expect(byType.pendapatan_proyek).toBe(50_000_000);
    expect(byType.uang_muka_klien).toBe(20_000_000);
    expect(byType.hpp_material).toBe(15_000_000);
    expect(byType.hpp_labor).toBe(10_000_000);
    expect(byType.hpp_uncategorized).toBe(5_000_000);
    // Laba lama 40jt + 30jt (reklas biaya) - 50jt (termin) - 20jt (DP) = 0
    expect(byType.laba).toBe(0);

    // after dihitung nyata dari simulatedAccounts
    expect(report.after).toEqual(summarizeAccounts(report.simulatedAccounts));
    expect(report.dpReclassified).toBe(20_000_000);
    expect(report.after.netProfit).toBe(20_000_000);
    expect(report.after.netProfit + report.dpReclassified).toBe(report.before.netProfit);
    expect(report.after.uangMukaKlien - report.before.uangMukaKlien).toBe(report.dpReclassified);
    expect(report.matched).toBe(true);
    expect(report.mismatches).toEqual([]);
  });

  it('mengembalikan matched=false dan mengisi mismatches jika saldo sesudah migrasi tidak cocok', () => {
    const reportKasCorrupted = reconcileF1Migration({
      accounts,
      costs: [
        { id: 'c1', projectId: 'p1', description: 'Semen', amount: 15_000_000, rapItemId: 'rap-1' },
      ],
      rapTypesById: { 'rap-1': 'material' },
      dryRun: true,
      postJournals: (clonedAccounts, journals) => {
        const applied = applyReclassificationJournalsToAccounts(clonedAccounts, journals);
        // Suntikkan kerusakan saldo kas sebesar Rp 1.000.000
        return applied.map((a) =>
          a.type === 'kas' ? { ...a, current_balance: a.current_balance - 1_000_000 } : a,
        );
      },
    });

    expect(reportKasCorrupted.matched).toBe(false);
    expect(reportKasCorrupted.mismatches).toContain('kas');
    expect(reportKasCorrupted.after.kas).toBe(reportKasCorrupted.before.kas - 1_000_000);

    // Suntikkan kegagalan posting jurnal DP (tidak diterapkan sama sekali)
    const reportDpUnapplied = reconcileF1Migration({
      accounts,
      costs: [],
      incomes: [
        { id: 'i-dp', projectId: 'p1', category: 'dp', amount: 10_000_000, status: 'received' },
      ],
      rapTypesById: {},
      dryRun: true,
      postJournals: (clonedAccounts) => clonedAccounts,
    });

    expect(reportDpUnapplied.matched).toBe(false);
    expect(reportDpUnapplied.mismatches).toEqual(expect.arrayContaining(['netProfit', 'uangMukaKlien']));
  });

  it('idempoten: melewatkan biaya dan pemasukan yang sudah memiliki jurnal f1_migration', () => {
    const report = reconcileF1Migration({
      accounts,
      costs: [
        { id: 'c1', projectId: 'p1', description: 'Semen', amount: 15_000_000, rapItemId: 'rap-1' },
        { id: 'c2', projectId: 'p1', description: 'Upah', amount: 10_000_000, rapItemId: 'rap-2' },
      ],
      incomes: [
        { id: 'i1', projectId: 'p1', category: 'dp', amount: 5_000_000, status: 'received' },
      ],
      rapTypesById: { 'rap-1': 'material', 'rap-2': 'labor' },
      alreadyMigratedReferenceIds: ['c1', 'i1'],
      dryRun: false,
    });

    expect(report.reclassificationJournals.map((j) => j.referenceId)).toEqual(['c2']);
    expect(report.dpReclassified).toBe(0);
    expect(report.matched).toBe(true);
  });

  it('migrasi SQL lokal 20261124140000_g0_1_real_f1_migration.sql imutabel, BLOCKED remote, dan menghitung rekonsiliasi secara nyata', () => {
    const sqlPath = resolve(
      process.cwd(),
      '../../my-supabase-project/supabase/migrations/20261124140000_g0_1_real_f1_migration.sql',
    );
    const sql = readFileSync(sqlPath, 'utf8');

    expect(sql).toMatch(/BLOCKED remote/i);
    expect(sql).toContain("'f1_migration'");
    expect(sql).toContain('planner_journal_entries_reference_type_check');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.planner_migrate_f1_ledger');

    // Dilarang keras memutasi planner_journal_lines
    expect(sql).not.toMatch(/UPDATE\s+planner_journal_lines/i);
    expect(sql).not.toMatch(/DELETE\s+FROM\s+planner_journal_lines/i);

    // Dilarang hardcode hasil after = before atau matched = true
    expect(sql).not.toMatch(/'matched'\s*,\s*true/i);
    expect(sql).not.toMatch(/'kas_after'\s*,\s*v_kas_before/i);
    expect(sql).not.toMatch(/'laba_after'\s*,\s*v_laba_before/i);

    // Wajib menghitung ulang saldo after secara nyata dan memakai subtransaksi rollback dry-run
    expect(sql).toContain('v_kas_after');
    expect(sql).toContain('v_piutang_after');
    expect(sql).toContain('v_hutang_after');
    expect(sql).toContain('v_laba_after');
    expect(sql).toContain('v_dp_reclassified');
    expect(sql).toContain("SQLSTATE 'P0001'");
    expect(sql).toContain('migrasi_f1_tidak_cocok');
  });
});
