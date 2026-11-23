import { supabase } from '../../lib/supabase';
import { backfillProjectJournalsForOrg } from './projectJournalBridge';

export type FinanceIntegrationStatus = {
  unsyncedIncomes: number;
  unsyncedCosts: number;
  unsyncedPayroll: number;
  totalUnsynced: number;
  needsBackfill: boolean;
};

export async function getFinanceIntegrationStatus(orgId: string): Promise<FinanceIntegrationStatus> {
  const { data: projects } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId)
    .is('deleted_at', null);

  const projectIds = (projects || []).map(p => p.id as string);

  let unsyncedIncomes = 0;
  let unsyncedCosts = 0;

  if (projectIds.length) {
    const [{ count: incomeCount }, { count: costCount }] = await Promise.all([
      supabase
        .from('planner_project_incomes')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'received')
        .is('journal_entry_id', null),
      supabase
        .from('planner_cost_realizations')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .is('journal_entry_id', null),
    ]);

    unsyncedIncomes = incomeCount || 0;
    unsyncedCosts = costCount || 0;
  }

  const { count: payrollCount } = await supabase
    .from('planner_payroll_entries')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'paid')
    .is('journal_entry_id', null);

  const unsyncedPayroll = payrollCount || 0;
  const totalUnsynced = unsyncedIncomes + unsyncedCosts + unsyncedPayroll;

  return {
    unsyncedIncomes,
    unsyncedCosts,
    unsyncedPayroll,
    totalUnsynced,
    needsBackfill: totalUnsynced > 0,
  };
}

export async function runFinanceJournalBackfill(
  orgId: string,
  createdBy?: string,
): Promise<{ incomesPosted: number; costsPosted: number; status: FinanceIntegrationStatus }> {
  const result = await backfillProjectJournalsForOrg(orgId, createdBy);
  const status = await getFinanceIntegrationStatus(orgId);
  return { ...result, status };
}
