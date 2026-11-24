import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));

import { balanceDelta } from '../../financeV2Calc';
import { normalCategoryForAccountType } from '../reconciliation';
import { buildBalanceSheetFromBalances } from '../reports/balanceSheetReport';
import { balancesFromLines, buildProfitLossFromLines } from '../reports/profitLossReport';
import type { JournalLineEnriched } from '../reports/types';
import { rollupByCategory } from '../../../services/financeV2/accountService';
import type { AccountCategory, AccountType, FinanceAccount } from '../../../types/financeV2';

function makeLine(input: {
  journalId: string;
  entryDate?: string;
  referenceType?: string;
  referenceId?: string | null;
  accountId: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  debit: number;
  credit: number;
  projectId?: string | null;
}): JournalLineEnriched {
  return {
    journalId: input.journalId,
    entryDate: input.entryDate ?? '2026-11-20',
    description: null,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    accountId: input.accountId,
    accountName: input.accountName,
    accountType: input.accountType,
    accountCategory: input.accountCategory,
    projectId: input.projectId ?? null,
    partyId: null,
    debit: input.debit,
    credit: input.credit,
  };
}

describe('G0-3: Taksonomi 4 Kategori Akun (aktiva/pasiva/pendapatan/beban) & Neraca', () => {
  const balancedLedgerLines: JournalLineEnriched[] = [
    // 1. Setoran Modal: Dr Kas 100jt, Cr Modal Disetor 100jt
    makeLine({
      journalId: 'j1',
      referenceType: 'manual',
      accountId: 'acc-kas',
      accountName: 'Kas Bisnis',
      accountType: 'kas',
      accountCategory: 'aktiva',
      debit: 100_000_000,
      credit: 0,
    }),
    makeLine({
      journalId: 'j1',
      referenceType: 'manual',
      accountId: 'acc-modal',
      accountName: 'Modal Disetor',
      accountType: 'modal_disetor',
      accountCategory: 'pasiva',
      debit: 0,
      credit: 100_000_000,
    }),
    // 2. Pendapatan Proyek: Dr Kas 60jt, Cr Pendapatan Proyek 60jt
    makeLine({
      journalId: 'j2',
      referenceType: 'project_income',
      accountId: 'acc-kas',
      accountName: 'Kas Bisnis',
      accountType: 'kas',
      accountCategory: 'aktiva',
      debit: 60_000_000,
      credit: 0,
      projectId: 'proj-1',
    }),
    makeLine({
      journalId: 'j2',
      referenceType: 'project_income',
      accountId: 'acc-pendapatan',
      accountName: 'Pendapatan Proyek',
      accountType: 'pendapatan_proyek',
      accountCategory: 'pendapatan',
      debit: 0,
      credit: 60_000_000,
      projectId: 'proj-1',
    }),
    // 3. HPP Material: Dr HPP Material 25jt, Cr Kas 25jt
    makeLine({
      journalId: 'j3',
      referenceType: 'project_expense',
      accountId: 'acc-hpp-mat',
      accountName: 'HPP Proyek - Material',
      accountType: 'hpp_material',
      accountCategory: 'beban',
      debit: 25_000_000,
      credit: 0,
      projectId: 'proj-1',
    }),
    makeLine({
      journalId: 'j3',
      referenceType: 'project_expense',
      accountId: 'acc-kas',
      accountName: 'Kas Bisnis',
      accountType: 'kas',
      accountCategory: 'aktiva',
      debit: 0,
      credit: 25_000_000,
      projectId: 'proj-1',
    }),
    // 4. Beban Opex: Dr Beban Operasional 10jt, Cr Kas 10jt
    makeLine({
      journalId: 'j4',
      referenceType: 'opex',
      referenceId: 'opx-1',
      accountId: 'acc-opex',
      accountName: 'Beban Operasional',
      accountType: 'beban_opex',
      accountCategory: 'beban',
      debit: 10_000_000,
      credit: 0,
    }),
    makeLine({
      journalId: 'j4',
      referenceType: 'opex',
      referenceId: 'opx-1',
      accountId: 'acc-kas',
      accountName: 'Kas Bisnis',
      accountType: 'kas',
      accountCategory: 'aktiva',
      debit: 0,
      credit: 10_000_000,
    }),
    // 5. Dividen: Dr Dividen 5jt, Cr Kas 5jt
    makeLine({
      journalId: 'j5',
      referenceType: 'dividend',
      accountId: 'acc-dividen',
      accountName: 'Dividen / Prive',
      accountType: 'dividen',
      accountCategory: 'pasiva',
      debit: 5_000_000,
      credit: 0,
    }),
    makeLine({
      journalId: 'j5',
      referenceType: 'dividend',
      accountId: 'acc-kas',
      accountName: 'Kas Bisnis',
      accountType: 'kas',
      accountCategory: 'aktiva',
      debit: 0,
      credit: 5_000_000,
    }),
  ];

  it('Neraca dari buku besar seimbang selalu balanced dan bebas dari akun hpp_*, beban_*, maupun pendapatan_proyek', () => {
    const balanceMap = balancesFromLines(balancedLedgerLines);

    // Verifikasi saldo normal per kategori: aktiva/beban = debit - credit, pasiva/pendapatan = credit - debit
    expect(balanceMap.get('acc-kas')?.balance).toBe(120_000_000);
    expect(balanceMap.get('acc-modal')?.balance).toBe(100_000_000);
    expect(balanceMap.get('acc-pendapatan')?.balance).toBe(60_000_000);
    expect(balanceMap.get('acc-hpp-mat')?.balance).toBe(25_000_000);
    expect(balanceMap.get('acc-opex')?.balance).toBe(10_000_000);
    expect(balanceMap.get('acc-dividen')?.balance).toBe(-5_000_000);

    const sheet = buildBalanceSheetFromBalances(balanceMap, '2026-11-30');

    expect(sheet.isBalanced).toBe(true);
    expect(sheet.totalAktiva).toBe(120_000_000);
    expect(sheet.totalPasiva).toBe(120_000_000);
    expect(sheet.totalAktiva).toBe(sheet.totalPasiva);

    // 0 akun hpp_* / beban_* / pendapatan_proyek di aktiva maupun pasiva
    const allRows = [...sheet.aktiva, ...sheet.pasiva];
    const leakedPlAccounts = allRows.filter(
      r =>
        r.type.startsWith('hpp_')
        || r.type.startsWith('beban_')
        || r.type === 'pendapatan_proyek',
    );
    expect(leakedPlAccounts).toHaveLength(0);

    // Laba Periode Berjalan (60jt - 25jt - 10jt = 25jt) muncul di sisi pasiva
    const profitRow = sheet.pasiva.find(r => r.type === 'laba');
    expect(profitRow).toEqual({
      name: 'Laba Periode Berjalan (Dari Buku Besar)',
      type: 'laba',
      balance: 25_000_000,
    });
  });

  it('Laporan Laba/Rugi (buildProfitLossFromLines) tetap akurat dengan kategori pendapatan & beban', () => {
    const pl = buildProfitLossFromLines(
      balancedLedgerLines,
      { 'proj-1': 'Proyek Renovasi A' },
      { 'cat-kantor': 'Sewa Kantor' },
      {},
      { 'opx-1': 'cat-kantor' },
    );

    expect(pl.revenue).toBe(60_000_000);
    expect(pl.hpp).toBe(25_000_000);
    expect(pl.grossProfit).toBe(35_000_000);
    expect(pl.opex).toBe(10_000_000);
    expect(pl.otherExpense).toBe(0);
    expect(pl.netProfit).toBe(25_000_000);
    expect(pl.hppByRapType?.material).toBe(25_000_000);
    expect(pl.revenueByProject).toEqual([
      { projectId: 'proj-1', projectName: 'Proyek Renovasi A', amount: 60_000_000 },
    ]);
  });

  it('Neraca tetap seimbang saat rugi (beban > pendapatan) dan menggabungkan akun laba legacy tanpa double-counting', () => {
    const balanceMap = new Map([
      ['acc-kas', { name: 'Kas Bisnis', type: 'kas', category: 'aktiva' as AccountCategory, balance: 95_000_000 }],
      ['acc-modal', { name: 'Modal Disetor', type: 'modal_disetor', category: 'pasiva' as AccountCategory, balance: 100_000_000 }],
      ['acc-laba', { name: 'Laba Periode Berjalan', type: 'laba', category: 'pasiva' as AccountCategory, balance: 10_000_000 }],
      ['acc-pendapatan', { name: 'Pendapatan Proyek', type: 'pendapatan_proyek', category: 'pendapatan' as AccountCategory, balance: 5_000_000 }],
      ['acc-beban', { name: 'Beban Operasional', type: 'beban_opex', category: 'beban' as AccountCategory, balance: 20_000_000 }],
    ]);

    // Total Aktiva = 95jt; Modal = 100jt; legacyLaba = +10jt; computedProfit = 5jt - 20jt = -15jt
    // Combined Laba = +10jt + (-15jt) = -5jt -> Total Pasiva = 100jt - 5jt = 95jt
    const sheet = buildBalanceSheetFromBalances(balanceMap, '2026-11-30');
    expect(sheet.isBalanced).toBe(true);
    expect(sheet.totalAktiva).toBe(95_000_000);
    expect(sheet.totalPasiva).toBe(95_000_000);
    expect(sheet.pasiva.filter(r => r.type === 'laba')).toHaveLength(1);
    expect(sheet.pasiva.find(r => r.type === 'laba')?.balance).toBe(-5_000_000);
  });

  it('balanceDelta, normalCategoryForAccountType, dan rollupByCategory konsisten dengan 4 kategori', () => {
    expect(balanceDelta('aktiva', 100, 30)).toBe(70);
    expect(balanceDelta('beban', 100, 30)).toBe(70);
    expect(balanceDelta('pasiva', 30, 100)).toBe(70);
    expect(balanceDelta('pendapatan', 30, 100)).toBe(70);

    expect(normalCategoryForAccountType('kas')).toBe('aktiva');
    expect(normalCategoryForAccountType('modal_disetor')).toBe('pasiva');
    expect(normalCategoryForAccountType('pendapatan_proyek')).toBe('pendapatan');
    expect(normalCategoryForAccountType('hpp_material')).toBe('beban');
    expect(normalCategoryForAccountType('beban_opex')).toBe('beban');
    expect(normalCategoryForAccountType('beban_penyusutan')).toBe('beban');

    const dummyAccounts: FinanceAccount[] = [
      { id: '1', org_id: 'o', type: 'kas', category: 'aktiva', name: 'Kas', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 120, metadata: {}, created_at: '', updated_at: '' },
      { id: '2', org_id: 'o', type: 'modal_disetor', category: 'pasiva', name: 'Modal', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 100, metadata: {}, created_at: '', updated_at: '' },
      { id: '3', org_id: 'o', type: 'pendapatan_proyek', category: 'pendapatan', name: 'Pendapatan', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 50, metadata: {}, created_at: '', updated_at: '' },
      { id: '4', org_id: 'o', type: 'hpp_material', category: 'beban', name: 'HPP', project_id: null, parent_id: null, is_system: true, is_active: true, current_balance: 30, metadata: {}, created_at: '', updated_at: '' },
    ];
    expect(rollupByCategory(dummyAccounts)).toEqual({
      aktiva: 120,
      pasiva: 100,
      pendapatan: 50,
      beban: 30,
    });
  });

  it('migrasi SQL lokal 20261124141000_g0_3_account_taxonomy.sql memiliki struktur lengkap dan berlabel BLOCKED remote', () => {
    const sqlPath = resolve(
      __dirname,
      '../../../../../../my-supabase-project/supabase/migrations/20261124141000_g0_3_account_taxonomy.sql',
    );
    const sql = readFileSync(sqlPath, 'utf8');

    expect(sql).toContain('BLOCKED remote');
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS planner_finance_accounts_category_check');
    expect(sql).toContain("CHECK (category IN ('aktiva', 'pasiva', 'pendapatan', 'beban'))");
    expect(sql).toContain("SET category = 'pendapatan'");
    expect(sql).toContain("WHERE type = 'pendapatan_proyek'");
    expect(sql).toContain("SET category = 'beban'");
    expect(sql).toContain("'hpp_material'");
    expect(sql).toContain("'beban_opex'");
    expect(sql).toContain("'beban_penyusutan'");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.seed_default_chart_of_accounts');
    expect(sql).toContain("('pendapatan_proyek', 'pendapatan', 'Pendapatan Proyek')");
    expect(sql).toContain("('hpp_material', 'beban', 'HPP Proyek - Material')");
    expect(sql).toContain("('beban_opex', 'beban', 'Beban Operasional')");
    expect(sql).toContain("('beban_penyusutan', 'beban', 'Beban Penyusutan')");
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.planner_apply_line_balance()');
    expect(sql).toContain("IF v_category IN ('aktiva', 'beban') THEN");
    expect(sql).toContain('v_delta := NEW.debit - NEW.credit;');
    expect(sql).toContain('v_delta := NEW.credit - NEW.debit;');
  });
});
