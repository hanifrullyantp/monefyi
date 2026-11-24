import { describe, expect, it } from 'vitest';
import {
  evaluateDocsGate,
  isFinanceFile,
  REQUIRED_CHANGELOG_PATH,
} from '../../../../scripts/docs-gate-check.mjs';

describe('docs-gate-check', () => {
  it('mengenali file keuangan, packages/domain, agent-core, dan migrasi keuangan', () => {
    expect(isFinanceFile('apps/web/src/services/financeV2/kasService.ts')).toBe(true);
    expect(isFinanceFile('apps/web/src/services/costService.ts')).toBe(true);
    expect(isFinanceFile('apps/web/src/services/incomeService.ts')).toBe(true);
    expect(isFinanceFile('apps/web/src/lib/financeV2/reports/profitLossReport.ts')).toBe(true);
    expect(isFinanceFile('packages/domain/src/journal.ts')).toBe(true);
    expect(isFinanceFile('agent-core/functions.json')).toBe(true);
    expect(isFinanceFile('my-supabase-project/supabase/migrations/20261124100000_f0_accounting_correctness.sql')).toBe(true);
    expect(isFinanceFile('apps/web/src/components/Layout.tsx')).toBe(false);
  });

  it('gagal bila file keuangan berubah tanpa docs/finance/CHANGELOG.md', () => {
    const res = evaluateDocsGate([
      'apps/web/src/services/financeV2/projectDividendService.ts',
      'apps/web/src/components/Layout.tsx',
    ]);
    expect(res.ok).toBe(false);
    expect(res.changelogUpdated).toBe(false);
    expect(res.touchedFinanceFiles).toHaveLength(1);
  });

  it('lulus bila file keuangan berubah bersama docs/finance/CHANGELOG.md', () => {
    const res = evaluateDocsGate([
      'apps/web/src/services/financeV2/projectDividendService.ts',
      REQUIRED_CHANGELOG_PATH,
    ]);
    expect(res.ok).toBe(true);
    expect(res.changelogUpdated).toBe(true);
  });

  it('lulus bila tidak ada file keuangan yang berubah', () => {
    const res = evaluateDocsGate(['README.md', 'apps/landing/src/app/page.tsx']);
    expect(res.ok).toBe(true);
    expect(res.touchedFinanceFiles).toEqual([]);
  });
});

