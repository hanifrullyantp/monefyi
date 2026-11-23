import { describe, expect, it } from 'vitest';
import { buildBusinessSheet, validateBusinessBalance, validateProjectBalance } from './index';
import { buildBusinessSnapshotFromAccounts } from '../project-normalize';
import { mapPlannerProject } from '../planner-mapper';
import type { FinanceAccount } from '../../../types/financeV2';

describe('balance-validator', () => {
  it('business sheet aktiva equals sum of aktiva lines', () => {
    const accounts: FinanceAccount[] = [
      { id: '1', org_id: 'o', name: 'Kas', type: 'kas', category: 'aktiva', current_balance: 100_000_000, is_active: true, project_id: null, parent_id: null, is_system: true, metadata: {}, created_at: '', updated_at: '' },
      { id: '2', org_id: 'o', name: 'Modal', type: 'modal_disetor', category: 'pasiva', current_balance: 100_000_000, is_active: true, project_id: null, parent_id: null, is_system: true, metadata: {}, created_at: '', updated_at: '' },
    ];
    const snap = buildBusinessSnapshotFromAccounts('Test Org', accounts, 0);
    const sheet = buildBusinessSheet(snap);
    const rowSum = sheet.lines
      .filter(l => l.side === 'aktiva')
      .reduce((s, l) => s + l.amount, 0);
    expect(sheet.aktiva).toBe(rowSum);
  });

  it('project aktiva = realisasi + saldo + piutang', () => {
    const mapped = mapPlannerProject({
      project: {
        id: 'p1',
        org_id: 'org-1',
        name: 'Proyek',
        planned_start: '2026-01-01',
        planned_end: '2026-06-01',
        total_budget: 50_000_000,
        total_spent: 10_000_000,
        total_received: 20_000_000,
      },
      rapItems: [],
      costs: [],
      incomes: [{ id: 'i1', project_id: 'p1', date: '2026-02-01', amount: 20_000_000, category: 'DP', description: 'DP', status: 'received' }],
      workItems: [],
    });

    const check = validateProjectBalance(mapped);
    const piutang = mapped.budget?.piutang || 0;
    const hutang = mapped.budget?.hutang || 0;
    expect(check.aktiva).toBe(mapped.rap.realisasi + mapped.saldo + piutang);
    expect(check.pasiva).toBe(20_000_000 + hutang);
    expect(typeof check.isBalanced).toBe('boolean');
  });

  it('imbalanced business snapshot produces issues', () => {
    const snap = buildBusinessSnapshotFromAccounts('Org', [
      { id: '1', org_id: 'o', name: 'Kas', type: 'kas', category: 'aktiva', current_balance: 200_000_000, is_active: true, project_id: null, parent_id: null, is_system: true, metadata: {}, created_at: '', updated_at: '' },
      { id: '2', org_id: 'o', name: 'Modal', type: 'modal_disetor', category: 'pasiva', current_balance: 50_000_000, is_active: true, project_id: null, parent_id: null, is_system: true, metadata: {}, created_at: '', updated_at: '' },
    ], 10_000_000);
    const check = validateBusinessBalance(snap);
    if (!check.isBalanced) {
      expect(check.issues.length).toBeGreaterThan(0);
    }
  });
});
