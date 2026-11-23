import { loadAllCosts, aggregateByProject } from './costService';
import { loadAllIncomes } from './incomeService';
import { aggregateInterProjectDebt } from './projectTransferService';
import { supabase } from '../lib/supabase';

export type UnifiedTransaction = {
  id: string;
  kind: 'income' | 'expense';
  project_id: string;
  date: string;
  description: string;
  amount: number;
  meta?: string;
};

export async function loadUnifiedTransactions(orgId: string): Promise<UnifiedTransaction[]> {
  const [incomes, costs] = await Promise.all([
    loadAllIncomes(orgId),
    loadAllCosts(orgId),
  ]);

  const rows: UnifiedTransaction[] = [
    ...incomes.map(i => ({
      id: i.id,
      kind: 'income' as const,
      project_id: i.project_id,
      date: i.date,
      description: i.description,
      amount: i.amount,
      meta: i.category,
    })),
    ...costs.map(c => ({
      id: c.id,
      kind: 'expense' as const,
      project_id: c.project_id,
      date: c.date,
      description: c.description,
      amount: Number(c.total_amount) || 0,
      meta: c.supplier || undefined,
    })),
  ];

  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export async function aggregateNetCashflow(orgId: string, days = 30) {
  const [incomes, costs] = await Promise.all([
    loadAllIncomes(orgId),
    loadAllCosts(orgId),
  ]);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const byDay: Record<string, { inflow: number; outflow: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    byDay[d.toISOString().slice(0, 10)] = { inflow: 0, outflow: 0 };
  }

  for (const inc of incomes) {
    if (new Date(inc.date) >= cutoff) {
      byDay[inc.date] = byDay[inc.date] || { inflow: 0, outflow: 0 };
      byDay[inc.date].inflow += inc.amount;
    }
  }
  for (const c of costs) {
    if (new Date(c.date) >= cutoff) {
      byDay[c.date] = byDay[c.date] || { inflow: 0, outflow: 0 };
      byDay[c.date].outflow += Number(c.total_amount) || 0;
    }
  }

  return Object.entries(byDay).map(([date, v]) => ({
    date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    inflow: v.inflow / 1_000_000,
    outflow: v.outflow / 1_000_000,
    net: (v.inflow - v.outflow) / 1_000_000,
  }));
}

export async function aggregateFinanceByProject(orgId: string) {
  const base = await aggregateByProject(orgId);
  const { data: projects, error } = await supabase.from('planner_projects')
    .select('id, total_received')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);

  const receivedMap = Object.fromEntries(
    (projects || []).map(p => [p.id, Number(p.total_received) || 0]),
  );

  const enriched = await Promise.all(
    base.map(async p => {
      const { getProjectCashSummary } = await import('./projectTransferService');
      const cash = await getProjectCashSummary(p.projectId, orgId, p.name, p.spent);
      return {
        ...p,
        received: receivedMap[p.projectId] ?? cash.received,
        surplus: cash.surplus,
        interProjectDebt: cash.owedToProjects.reduce((s, x) => s + x.amount, 0),
      };
    }),
  );

  const debt = await aggregateInterProjectDebt(orgId);
  return { projects: enriched, interProjectDebt: debt };
}
export async function getOrgFinanceTotals(orgId: string) {
  const [incomes, costs, { projects, interProjectDebt }] = await Promise.all([
    loadAllIncomes(orgId),
    loadAllCosts(orgId),
    aggregateFinanceByProject(orgId),
  ]);

  const totalInflow = incomes.reduce((s, i) => s + i.amount, 0);
  const totalOutflow = costs.reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);

  return {
    totalInflow,
    totalOutflow,
    netCash: totalInflow - totalOutflow,
    totalBudget,
    interProjectDebtOutstanding: interProjectDebt.totalOutstanding,
    projects,
  };
}
