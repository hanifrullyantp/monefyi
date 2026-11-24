import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildSyntheticOwnerExport,
  runOwnerParityCheck,
} from '../../../../../../scripts/g0-owner-local-parity-check.mjs';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const SCRIPT_PATH = resolve(REPO_ROOT, 'scripts/g0-owner-local-parity-check.mjs');

describe('G0-8: Skrip Uji Paritas Lokal Owner (100% Offline)', () => {
  it('uji statis: skrip 100% OFFLINE tanpa impor/pemanggilan modul atau API jaringan', () => {
    const source = readFileSync(SCRIPT_PATH, 'utf8');

    const forbiddenModules = ['http', 'https', 'http2', 'net', 'dgram', 'tls', 'dns', 'child_process'];
    for (const mod of forbiddenModules) {
      expect(source).not.toMatch(new RegExp(`['"](?:node:)?${mod}['"]`, 'i'));
    }

    const forbiddenApis = [
      /\bfetch\s*\(/i,
      /\bXMLHttpRequest\b/i,
      /\bWebSocket\b/i,
      /\bcurl\b/i,
      /\bwget\b/i,
      /\bsendBeacon\b/i,
    ];
    for (const pattern of forbiddenApis) {
      expect(source).not.toMatch(pattern);
    }

    // Hanya boleh mengimpor modul lokal Node fs, path, url
    const importSpecs = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(importSpecs.length).toBeGreaterThan(0);
    for (const spec of importSpecs) {
      expect(['node:fs', 'node:path', 'node:url']).toContain(spec);
    }
  });

  it('mode --demo-synthetic lulus penuh paritas operasional vs buku besar, mengecualikan dividend/cancelled/deleted_at, dan mendeteksi needs_review', () => {
    const synthetic = buildSyntheticOwnerExport();
    const report = runOwnerParityCheck(synthetic);

    expect(report.mode).toBe('OFFLINE_LOCAL_ONLY');
    expect(report.ok).toBe(true);
    expect(report.status).toBe('PASS');
    expect(report.excludedRows).toEqual({
      incomes: 2,
      costs: 3,
      opex: 1,
      pendingIncomesExcluded: 0,
    });

    expect(report.comparison.totalPendapatan.matched).toBe(true);
    expect(report.comparison.totalHpp.matched).toBe(true);
    expect(report.comparison.totalOpex.matched).toBe(true);
    expect(report.comparison.labaBersih.matched).toBe(true);
    expect(report.comparison.totalKas.matched).toBe(true);
    expect(report.comparison.neraca.isBalanced).toBe(true);
    expect(report.comparison.neraca.expenseInAktiva).toBe(0);

    expect(report.anomalies.missingJournalEntryIdCount).toBe(0);
    expect(report.anomalies.unbalancedJournalsCount).toBe(0);
    expect(report.anomalies.needsReviewCount).toBe(1);

    // Uji mode CLI --demo-synthetic keluar dengan exit code 0 dan mencetak JSON valid
    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, '--demo-synthetic'], {
      encoding: 'utf8',
    });
    const parsed = JSON.parse(stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe('OFFLINE_LOCAL_ONLY');
  });

  it('mendeteksi anomali: baris tanpa journal_entry_id, jurnal tidak seimbang, kebocoran beban ke aktiva, dan selisih paritas via --input', () => {
    const broken = buildSyntheticOwnerExport() as {
      cost_realizations: Array<Record<string, unknown>>;
      journal_lines: Array<Record<string, unknown>>;
      finance_accounts: Array<Record<string, unknown>>;
    };

    // 1. Suntikkan baris aktif tanpa journal_entry_id
    broken.cost_realizations.push({
      id: 'cost-orphan',
      project_id: 'p-1',
      date: '2026-11-22',
      total_amount: 2_500_000,
      rap_item_id: 'rap-mat',
      status: 'recorded',
      deleted_at: null,
      journal_entry_id: null,
    });

    // 2. Suntikkan baris jurnal tidak seimbang (debit !== credit)
    broken.journal_lines[0] = {
      ...broken.journal_lines[0],
      debit: 251_000_000,
    };

    // 3. Suntikkan akun beban berkategori 'aktiva'
    broken.finance_accounts.push({
      id: 'acc-leaked-expense',
      type: 'beban_opex',
      category: 'aktiva',
      name: 'Beban Bocor ke Aktiva',
      project_id: null,
      current_balance: 1_000_000,
      is_active: true,
    });

    const report = runOwnerParityCheck(broken);
    expect(report.ok).toBe(false);
    expect(report.status).toBe('FAIL');
    expect(report.anomalies.missingJournalEntryIdCount).toBe(1);
    expect(report.anomalies.missingJournalEntryId[0]).toMatchObject({
      table: 'cost_realizations',
      id: 'cost-orphan',
    });
    expect(report.anomalies.unbalancedJournalsCount).toBe(1);
    expect(report.anomalies.unbalancedJournals[0]).toMatchObject({
      journalId: 'je-open',
      diff: 1_000_000,
    });
    expect(report.comparison.neraca.expenseInAktiva).toBe(1);
    expect(report.comparison.totalHpp.matched).toBe(false);

    // Uji CLI --input <file.json> keluar dengan exit code 1 ketika gagal paritas
    const tempDir = mkdtempSync(join(tmpdir(), 'g0-owner-parity-'));
    try {
      const exportFile = join(tempDir, 'export.json');
      writeFileSync(exportFile, JSON.stringify(broken), 'utf8');
      let exitCode = 0;
      try {
        execFileSync(process.execPath, [SCRIPT_PATH, '--input', exportFile], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
      } catch (err) {
        const execErr = err as { status?: number; stdout?: string };
        exitCode = execErr.status ?? 1;
        const cliReport = JSON.parse(execErr.stdout || '{}');
        expect(cliReport.ok).toBe(false);
        expect(cliReport.anomalies.missingJournalEntryIdCount).toBe(1);
      }
      expect(exitCode).toBe(1);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
