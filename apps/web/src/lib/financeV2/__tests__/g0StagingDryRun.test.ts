import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../supabase', () => ({ supabase: {} }));

import {
  generateSyntheticF1Dataset,
  runStagingDryRunSimulation,
} from '../../../../../../scripts/g0-staging-migration-dryrun.mjs';
import {
  normalCategoryForAccountType,
  reconcileF1Migration,
} from '../reconciliation';
import {
  buildBalanceSheetFromBalances,
  type AccountBalanceEntry,
} from '../reports/balanceSheetReport';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));

describe('G0-7: Simulasi & Dry-Run Migrasi F1 Skala Besar (>= 500 Transaksi Sintetis)', () => {
  it('generator deterministik tanpa Math.random() dan membangkitkan >= 500 transaksi (25 proyek, 350 biaya, 150 pemasukan, piutang, hutang, modal, dividen)', () => {
    const scriptPath = resolve(REPO_ROOT, 'scripts/g0-staging-migration-dryrun.mjs');
    const scriptSource = readFileSync(scriptPath, 'utf8');
    expect(scriptSource).not.toMatch(/Math\.random\s*\(/);

    const ds1 = generateSyntheticF1Dataset({ seed: 20261124 });
    const ds2 = generateSyntheticF1Dataset({ seed: 20261124 });
    expect(ds1).toEqual(ds2);

    expect(ds1.dataset).toBe('SYNTHETIC');
    expect(ds1.projects).toHaveLength(25);
    expect(ds1.costs).toHaveLength(350);
    expect(ds1.incomes).toHaveLength(150);
    expect(ds1.piutangItems.length).toBeGreaterThan(0);
    expect(ds1.hutangItems.length).toBeGreaterThan(0);
    expect(ds1.modalDisetor).toBeGreaterThan(0);
    expect(ds1.dividendItems.length).toBeGreaterThan(0);
    expect(ds1.stats.totalTransactions).toBeGreaterThanOrEqual(500);

    // Pastikan seluruh 6 tipe RAP (termasuk null / uncategorized) terwakili pada realisasi biaya
    const rapTypesPresent = new Set(
      ds1.costs.map((c) => (c.rapItemId ? ds1.rapTypesById[c.rapItemId] : 'uncategorized')),
    );
    expect(rapTypesPresent).toEqual(
      new Set(['material', 'labor', 'equipment', 'overhead', 'other', 'uncategorized']),
    );

    // Pastikan seluruh 4 kategori pemasukan terwakili
    const incomeCats = new Set(ds1.incomes.map((i) => i.category));
    expect(incomeCats).toEqual(new Set(['dp', 'termin', 'pelunasan', 'retensi']));
  });

  it('reconcileF1Migration nyata (dryRun: true lalu false) memenuhi seluruh invarian & buildBalanceSheetFromBalances seimbang tanpa beban di aktiva[]', () => {
    const ds = generateSyntheticF1Dataset({ seed: 20261124 });
    const snapshotAccountsBefore = ds.accounts.map((a) => ({ ...a }));

    // 1. Dry-run nyata
    const dryReport = reconcileF1Migration({
      accounts: ds.accounts,
      costs: ds.costs,
      incomes: ds.incomes,
      rapTypesById: ds.rapTypesById,
      dryRun: true,
    });

    // (a) dry-run tidak memutasi saldo akun input
    expect(ds.accounts).toEqual(snapshotAccountsBefore);
    expect(dryReport.dryRun).toBe(true);
    expect(dryReport.matched).toBe(true);
    expect(dryReport.mismatches).toEqual([]);

    // 2. Eksekusi nyata (dryRun: false)
    const execReport = reconcileF1Migration({
      accounts: ds.accounts,
      costs: ds.costs,
      incomes: ds.incomes,
      rapTypesById: ds.rapTypesById,
      dryRun: false,
    });

    expect(ds.accounts).toEqual(snapshotAccountsBefore);
    expect(execReport.dryRun).toBe(false);

    // (b) seluruh jurnal reklasifikasi yang dihasilkan seimbang (debit === credit > 0)
    expect(execReport.reclassificationJournals.length).toBe(
      ds.costs.length + ds.stats.receivedIncomes,
    );
    for (const journal of execReport.reclassificationJournals) {
      expect(journal.referenceType).toBe('f1_migration');
      const totalDebit = journal.lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = journal.lines.reduce((s, l) => s + l.credit, 0);
      expect(totalDebit).toBeGreaterThan(0);
      expect(totalDebit).toBe(totalCredit);
    }

    // (c) matched === true dan mismatches.length === 0
    expect(execReport.matched).toBe(true);
    expect(execReport.mismatches).toHaveLength(0);

    // (d) saldo kas, piutang, hutang, netProfit + dpReclassified, uangMukaKlien sebelum === sesudah
    expect(execReport.after.kas).toBe(execReport.before.kas);
    expect(execReport.after.piutang).toBe(execReport.before.piutang);
    expect(execReport.after.hutang).toBe(execReport.before.hutang);
    expect(execReport.after.netProfit + execReport.dpReclassified).toBe(execReport.before.netProfit);
    expect(execReport.after.uangMukaKlien).toBe(
      execReport.before.uangMukaKlien + execReport.dpReclassified,
    );
    expect(execReport.dpReclassified).toBeGreaterThan(0);

    // (e) buildBalanceSheetFromBalances pada akun sesudah migrasi seimbang & 0 akun beban di aktiva[]
    const balanceMap = new Map<string, AccountBalanceEntry>();
    for (const acc of execReport.simulatedAccounts) {
      balanceMap.set(`acc-${acc.type}`, {
        name: acc.type,
        type: acc.type,
        category: normalCategoryForAccountType(acc.type),
        balance: acc.current_balance,
      });
    }

    const balanceSheet = buildBalanceSheetFromBalances(balanceMap, '2026-11-24');
    expect(balanceSheet.isBalanced).toBe(true);
    expect(balanceSheet.totalAktiva).toBe(balanceSheet.totalPasiva);

    const expenseInAktiva = balanceSheet.aktiva.filter(
      (row) => row.type.startsWith('hpp_') || row.type.startsWith('beban_'),
    );
    expect(expenseInAktiva).toHaveLength(0);

    const leakedPlRows = [...balanceSheet.aktiva, ...balanceSheet.pasiva].filter(
      (row) =>
        row.type.startsWith('hpp_')
        || row.type.startsWith('beban_')
        || row.type === 'pendapatan_proyek',
    );
    expect(leakedPlRows).toHaveLength(0);

    // Pastikan skrip CLI mandiri Node ESM menghasilkan angka identik
    const cliSummary = runStagingDryRunSimulation({ seed: 20261124 });
    expect(cliSummary.dataset).toBe('SYNTHETIC');
    expect(cliSummary.status).toBe('PASS');
    expect(cliSummary.before).toEqual(execReport.before);
    expect(cliSummary.after).toEqual(execReport.after);
    expect(cliSummary.dpReclassified).toBe(execReport.dpReclassified);
    expect(cliSummary.balanceSheetAfter.totalAktiva).toBe(balanceSheet.totalAktiva);
    expect(cliSummary.balanceSheetAfter.totalPasiva).toBe(balanceSheet.totalPasiva);
    expect(cliSummary.balanceSheetAfter.balanceSheetBalanced).toBe(true);
    expect(cliSummary.balanceSheetAfter.expenseInAktiva).toBe(0);
  });
});
