import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));

import { reconcileF1Migration } from '../reconciliation';
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
});
