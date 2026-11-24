import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  assertJournalOperationAllowed,
  JOURNAL_IMMUTABLE_TABLES,
  JOURNAL_MUTATION_ERROR_CODE,
  JOURNAL_MUTATION_SQLSTATE,
  JournalImmutabilityError,
  type JournalImmutableTable,
} from '../immutabilityGuard';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const SERVICES_DIR = resolve(REPO_ROOT, 'apps/web/src/services');
const MIGRATIONS_DIR = resolve(REPO_ROOT, 'my-supabase-project/supabase/migrations');

function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__') continue;
    const fullPath = join(dir, entry);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

interface SimulatedJournalLine {
  accountId: string;
  debit: number;
  credit: number;
}

interface SimulatedJournalEntry {
  id: string;
  referenceType: 'project_expense' | 'project_income' | 'opex' | 'reversal';
  referenceId: string;
  lines: SimulatedJournalLine[];
}

class AppendOnlyJournalLedger {
  private readonly entries: SimulatedJournalEntry[] = [];

  selectAll(): readonly SimulatedJournalEntry[] {
    assertJournalOperationAllowed('SELECT', 'planner_journal_entries');
    return this.entries.map((entry) => ({
      ...entry,
      lines: entry.lines.map((line) => ({ ...line })),
    }));
  }

  insert(entry: SimulatedJournalEntry): void {
    assertJournalOperationAllowed('INSERT', 'planner_journal_entries');
    assertJournalOperationAllowed('INSERT', 'planner_journal_lines');
    const sumDebit = entry.lines.reduce((acc, l) => acc + l.debit, 0);
    const sumCredit = entry.lines.reduce((acc, l) => acc + l.credit, 0);
    if (sumDebit !== sumCredit || sumDebit <= 0) {
      throw new Error('jurnal_tidak_seimbang');
    }
    this.entries.push({
      ...entry,
      lines: entry.lines.map((line) => ({ ...line })),
    });
  }

  update(_id: string, _patch: Partial<SimulatedJournalEntry>): never {
    assertJournalOperationAllowed('UPDATE', 'planner_journal_entries');
    throw new Error('unreachable');
  }

  delete(_id: string): never {
    assertJournalOperationAllowed('DELETE', 'planner_journal_entries');
    throw new Error('unreachable');
  }

  mutateLine(_table: JournalImmutableTable, operation: 'UPDATE' | 'DELETE'): never {
    assertJournalOperationAllowed(operation, _table);
    throw new Error('unreachable');
  }
}

describe('G0-4 Jaminan Imutabilitas Jurnal (Append-Only Ledger)', () => {
  it('uji statis layanan TS: tidak ada .update() atau .delete() pada tabel jurnal di apps/web/src/services/**', () => {
    const tsFiles = collectTsFiles(SERVICES_DIR);
    expect(tsFiles.length).toBeGreaterThan(0);

    const violations: string[] = [];
    // Deteksi rantai pemanggilan .from('planner_journal_*') diikuti .update( atau .delete( sebelum akhir pernyataan (;)
    const mutationPattern =
      /\.from\(\s*['"](planner_journal_entries|planner_journal_lines|planner_journal_allocations)['"]\s*\)[^;]*?\.(update|delete)\s*\(/g;

    for (const filePath of tsFiles) {
      const content = readFileSync(filePath, 'utf8');
      const matches = content.match(mutationPattern);
      if (matches && matches.length > 0) {
        violations.push(`${filePath}: ${matches.join(' | ')}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('uji statis migrasi SQL pasca-phase3 (20261124*): bebas UPDATE/DELETE pada tabel jurnal (kecuali file F1 lama yang digantikan G0-1)', () => {
    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.startsWith('20261124') && name.endsWith('.sql'))
      .sort();

    // Pastikan migrasi G0-1 dan G0-4 benar-benar hadir dan terverifikasi
    expect(migrationFiles).toContain('20261124140000_g0_1_real_f1_migration.sql');
    expect(migrationFiles).toContain('20261124142000_g0_4_immutability_guard.sql');

    // File lama F1 (20261124120000_f1_coa_and_dimensions.sql) memiliki fungsi legacy yang telah digantikan oleh G0-1.
    const LEGACY_SUPERSEDED_BY_G0_1 = new Set(['20261124120000_f1_coa_and_dimensions.sql']);

    const mutationPatterns = [
      /\bUPDATE\s+(?:public\.)?planner_journal_entries\b/i,
      /\bDELETE\s+FROM\s+(?:public\.)?planner_journal_entries\b/i,
      /\bUPDATE\s+(?:public\.)?planner_journal_lines\b/i,
      /\bDELETE\s+FROM\s+(?:public\.)?planner_journal_lines\b/i,
      /\bUPDATE\s+(?:public\.)?planner_journal_allocations\b/i,
      /\bDELETE\s+FROM\s+(?:public\.)?planner_journal_allocations\b/i,
    ];

    const violations: string[] = [];

    for (const fileName of migrationFiles) {
      if (LEGACY_SUPERSEDED_BY_G0_1.has(fileName)) continue;
      const rawSql = readFileSync(join(MIGRATIONS_DIR, fileName), 'utf8');
      const cleanedSql = stripSqlComments(rawSql);

      for (const pattern of mutationPatterns) {
        if (pattern.test(cleanedSql)) {
          violations.push(`${fileName} melanggar pola ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);

    // Tegaskan secara eksplisit G0-1 dan G0-4 bebas mutasi jurnal
    for (const criticalFile of [
      '20261124140000_g0_1_real_f1_migration.sql',
      '20261124142000_g0_4_immutability_guard.sql',
    ]) {
      const cleaned = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, criticalFile), 'utf8'));
      for (const pattern of mutationPatterns) {
        expect(cleaned).not.toMatch(pattern);
      }
    }
  });

  it('uji struktural SQL: phase3 dan G0-4 mendefinisikan planner_reject_journal_mutation & trigger BEFORE UPDATE OR DELETE pada ketiga tabel jurnal', () => {
    const phase3Sql = readFileSync(
      join(MIGRATIONS_DIR, '20261104140000_planner_phase3_ledger.sql'),
      'utf8',
    );
    const g04Sql = readFileSync(
      join(MIGRATIONS_DIR, '20261124142000_g0_4_immutability_guard.sql'),
      'utf8',
    );

    // Phase 3: definisi awal fungsi & trigger entries + lines
    expect(phase3Sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.planner_reject_journal_mutation\(\)/i);
    expect(phase3Sql).toContain("RAISE EXCEPTION 'jurnal_tidak_boleh_diubah'");
    expect(phase3Sql).toMatch(
      /CREATE\s+TRIGGER\s+planner_journal_entries_no_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+planner_journal_entries/i,
    );
    expect(phase3Sql).toMatch(
      /CREATE\s+TRIGGER\s+planner_journal_lines_no_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+planner_journal_lines/i,
    );

    // G0-4: label BLOCKED remote, ERRCODE 55000, trigger idempoten untuk ketiga tabel, dan bersih dari policy mutasi RLS
    expect(g04Sql).toMatch(/BLOCKED remote/i);
    expect(g04Sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.planner_reject_journal_mutation\(\)/i);
    expect(g04Sql).toContain("RAISE EXCEPTION 'jurnal_tidak_boleh_diubah'");
    expect(g04Sql).toContain("ERRCODE = '55000'");

    const expectedTriggers: Array<{ table: JournalImmutableTable; trigger: string }> = [
      { table: 'planner_journal_entries', trigger: 'planner_journal_entries_no_mutation' },
      { table: 'planner_journal_lines', trigger: 'planner_journal_lines_no_mutation' },
      { table: 'planner_journal_allocations', trigger: 'planner_journal_allocations_no_mutation' },
    ];

    for (const { table, trigger } of expectedTriggers) {
      expect(g04Sql).toMatch(new RegExp(`DROP\\s+TRIGGER\\s+IF\\s+EXISTS\\s+${trigger}\\s+ON\\s+${table}`, 'i'));
      expect(g04Sql).toMatch(
        new RegExp(
          `CREATE\\s+TRIGGER\\s+${trigger}\\s+BEFORE\\s+UPDATE\\s+OR\\s+DELETE\\s+ON\\s+${table}\\s+FOR\\s+EACH\\s+ROW\\s+EXECUTE\\s+FUNCTION\\s+public\\.planner_reject_journal_mutation\\(\\)`,
          'i',
        ),
      );
      expect(g04Sql).toMatch(new RegExp(`ALTER\\s+TABLE\\s+${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i'));
    }

    // Pastikan tidak ada CREATE POLICY untuk UPDATE/DELETE/ALL pada file G0-4
    expect(stripSqlComments(g04Sql)).not.toMatch(/CREATE\s+POLICY[\s\S]*?FOR\s+(?:UPDATE|DELETE|ALL)\b/i);
    expect(g04Sql).toContain("cmd IN ('UPDATE', 'DELETE', 'ALL')");
  });

  it('uji kontrak perilaku: UPDATE & DELETE ditolak dengan jurnal_tidak_boleh_diubah, sedangkan INSERT & reversal diizinkan', () => {
    // Uji helper assertJournalOperationAllowed untuk semua kombinasi
    for (const table of JOURNAL_IMMUTABLE_TABLES) {
      expect(() => assertJournalOperationAllowed('SELECT', table)).not.toThrow();
      expect(() => assertJournalOperationAllowed('INSERT', table)).not.toThrow();

      for (const op of ['UPDATE', 'DELETE'] as const) {
        try {
          assertJournalOperationAllowed(op, table);
          expect.unreachable(`Operasi ${op} pada ${table} seharusnya ditolak`);
        } catch (err) {
          expect(err).toBeInstanceOf(JournalImmutabilityError);
          expect((err as JournalImmutabilityError).message).toBe(JOURNAL_MUTATION_ERROR_CODE);
          expect((err as JournalImmutabilityError).code).toBe('jurnal_tidak_boleh_diubah');
          expect((err as JournalImmutabilityError).sqlstate).toBe(JOURNAL_MUTATION_SQLSTATE);
          expect((err as JournalImmutabilityError).operation).toBe(op);
          expect((err as JournalImmutabilityError).table).toBe(table);
        }
      }
    }

    // Uji simulasi buku besar append-only
    const ledger = new AppendOnlyJournalLedger();

    // 1. INSERT jurnal awal diizinkan
    ledger.insert({
      id: 'je-1',
      referenceType: 'project_expense',
      referenceId: 'cost-1',
      lines: [
        { accountId: 'acc-hpp-material', debit: 2_500_000, credit: 0 },
        { accountId: 'acc-kas', debit: 0, credit: 2_500_000 },
      ],
    });
    expect(ledger.selectAll()).toHaveLength(1);

    // 2. UPDATE dan DELETE pada entries/lines/allocations ditolak
    expect(() => ledger.update('je-1', { referenceId: 'tampered' })).toThrow('jurnal_tidak_boleh_diubah');
    expect(() => ledger.delete('je-1')).toThrow('jurnal_tidak_boleh_diubah');
    expect(() => ledger.mutateLine('planner_journal_lines', 'UPDATE')).toThrow('jurnal_tidak_boleh_diubah');
    expect(() => ledger.mutateLine('planner_journal_lines', 'DELETE')).toThrow('jurnal_tidak_boleh_diubah');
    expect(() => ledger.mutateLine('planner_journal_allocations', 'UPDATE')).toThrow('jurnal_tidak_boleh_diubah');
    expect(() => ledger.mutateLine('planner_journal_allocations', 'DELETE')).toThrow('jurnal_tidak_boleh_diubah');

    // Data awal tidak berubah sama sekali
    expect(ledger.selectAll()[0].referenceId).toBe('cost-1');

    // 3. Koreksi dilakukan dengan INSERT jurnal pembalik (reversal)
    ledger.insert({
      id: 'je-2-rev',
      referenceType: 'reversal',
      referenceId: 'je-1',
      lines: [
        { accountId: 'acc-kas', debit: 2_500_000, credit: 0 },
        { accountId: 'acc-hpp-material', debit: 0, credit: 2_500_000 },
      ],
    });

    const entries = ledger.selectAll();
    expect(entries).toHaveLength(2);
    expect(entries[1].referenceType).toBe('reversal');

    // Saldo bersih akun kas & hpp kembali 0 setelah reversal
    const netKas = entries
      .flatMap((e) => e.lines)
      .filter((l) => l.accountId === 'acc-kas')
      .reduce((acc, l) => acc + l.debit - l.credit, 0);
    expect(netKas).toBe(0);
  });
});
