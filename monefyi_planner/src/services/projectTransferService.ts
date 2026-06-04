import { supabase } from '../lib/supabase';
import { loadProjectIncomes } from './incomeService';
import { loadCostRealizations } from './costService';

export type TransferType = 'loan' | 'repayment';

export interface ProjectTransfer {
  id: string;
  org_id: string;
  from_project_id: string;
  to_project_id: string;
  amount: number;
  type: TransferType;
  date: string;
  description?: string | null;
  recorded_by: string;
  created_at?: string;
}

export interface ProjectCashSummary {
  received: number;
  spent: number;
  loansIn: number;
  loansOut: number;
  repaymentsIn: number;
  repaymentsOut: number;
  surplus: number;
  owedToProjects: Array<{ projectId: string; projectName?: string; amount: number }>;
  owedFromProjects: Array<{ projectId: string; projectName?: string; amount: number }>;
}

export async function loadProjectTransfers(orgId: string, projectId?: string): Promise<ProjectTransfer[]> {
  let q = supabase
    .from('planner_project_transfers')
    .select('*')
    .eq('org_id', orgId)
    .order('date', { ascending: false });

  if (projectId) {
    q = q.or(`from_project_id.eq.${projectId},to_project_id.eq.${projectId}`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    ...row,
    amount: Number(row.amount) || 0,
  })) as ProjectTransfer[];
}

export async function loadAllTransfers(orgId: string): Promise<ProjectTransfer[]> {
  return loadProjectTransfers(orgId);
}

function sumTransfers(transfers: ProjectTransfer[], projectId: string) {
  let loansIn = 0;
  let loansOut = 0;
  let repaymentsIn = 0;
  let repaymentsOut = 0;

  for (const t of transfers) {
    if (t.type === 'loan') {
      if (t.to_project_id === projectId) loansIn += t.amount;
      if (t.from_project_id === projectId) loansOut += t.amount;
    } else {
      if (t.to_project_id === projectId) repaymentsIn += t.amount;
      if (t.from_project_id === projectId) repaymentsOut += t.amount;
    }
  }

  return { loansIn, loansOut, repaymentsIn, repaymentsOut };
}

/** Net debt: positive = this project owes counterparty */
function netDebtBetween(
  transfers: ProjectTransfer[],
  debtorId: string,
  creditorId: string,
): number {
  let debt = 0;
  for (const t of transfers) {
    if (t.type === 'loan' && t.from_project_id === creditorId && t.to_project_id === debtorId) {
      debt += t.amount;
    }
    if (t.type === 'repayment' && t.from_project_id === debtorId && t.to_project_id === creditorId) {
      debt -= t.amount;
    }
  }
  return Math.max(0, debt);
}

export async function getProjectCashSummary(
  projectId: string,
  orgId: string,
  projectName?: string,
  spentFromStore?: number,
): Promise<ProjectCashSummary> {
  const [{ data: proj }, transfers, incomes] = await Promise.all([
    supabase.from('planner_projects').select('total_received, total_spent, name').eq('id', projectId).single(),
    loadProjectTransfers(orgId, projectId),
    loadProjectIncomes(projectId),
  ]);

  const received = Number(proj?.total_received) || incomes.filter(i => i.status === 'received').reduce((s, i) => s + i.amount, 0);
  const spent = spentFromStore ?? (Number(proj?.total_spent) || 0);
  const { loansIn, loansOut, repaymentsIn, repaymentsOut } = sumTransfers(transfers, projectId);

  const surplus = received + loansIn + repaymentsIn - spent - loansOut - repaymentsOut;

  const relatedIds = new Set<string>();
  for (const t of transfers) {
    if (t.from_project_id === projectId) relatedIds.add(t.to_project_id);
    if (t.to_project_id === projectId) relatedIds.add(t.from_project_id);
  }

  const owedToProjects: ProjectCashSummary['owedToProjects'] = [];
  const owedFromProjects: ProjectCashSummary['owedFromProjects'] = [];

  for (const otherId of relatedIds) {
    const oweOther = netDebtBetween(transfers, projectId, otherId);
    const otherOwesUs = netDebtBetween(transfers, otherId, projectId);
    if (oweOther > 0) {
      owedToProjects.push({ projectId: otherId, amount: oweOther });
    }
    if (otherOwesUs > 0) {
      owedFromProjects.push({ projectId: otherId, amount: otherOwesUs });
    }
  }

  return {
    received,
    spent,
    loansIn,
    loansOut,
    repaymentsIn,
    repaymentsOut,
    surplus,
    owedToProjects,
    owedFromProjects,
  };
}

export async function getAvailableSurplus(projectId: string, orgId: string, spentFromStore?: number): Promise<number> {
  const s = await getProjectCashSummary(projectId, orgId, undefined, spentFromStore);
  return Math.max(0, s.surplus);
}

export async function createProjectTransfer(params: {
  org_id: string;
  from_project_id: string;
  to_project_id: string;
  amount: number;
  type: TransferType;
  date?: string;
  description?: string;
  recorded_by: string;
  undoContext?: { actorId: string };
}) {
  if (params.from_project_id === params.to_project_id) {
    throw new Error('Proyek sumber dan tujuan harus berbeda.');
  }

  const amount = Number(params.amount);
  if (!amount || amount <= 0) throw new Error('Nominal harus lebih dari 0.');

  if (params.type === 'loan') {
    const available = await getAvailableSurplus(params.from_project_id, params.org_id);
    if (amount > available) {
      throw new Error(`Saldo tersedia proyek sumber tidak cukup (tersedia ${Math.floor(available).toLocaleString('id-ID')}).`);
    }
  }

  if (params.type === 'repayment') {
    const debt = netDebtBetween(
      await loadProjectTransfers(params.org_id, params.from_project_id),
      params.from_project_id,
      params.to_project_id,
    );
    if (amount > debt) {
      throw new Error(`Pelunasan melebihi hutang outstanding (${Math.floor(debt).toLocaleString('id-ID')}).`);
    }
  }

  const { data, error } = await supabase
    .from('planner_project_transfers')
    .insert({
      org_id: params.org_id,
      from_project_id: params.from_project_id,
      to_project_id: params.to_project_id,
      amount,
      type: params.type,
      date: params.date || new Date().toISOString().slice(0, 10),
      description: params.description || null,
      recorded_by: params.recorded_by,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  let undoActionId: string | undefined;
  if (params.undoContext) {
    const { recordReversibleAction } = await import('./undoService');
    const action = await recordReversibleAction({
      orgId: params.org_id,
      actorId: params.undoContext.actorId,
      actionType: 'project_transfer_create',
      entityType: 'planner_project_transfers',
      entityId: data.id,
      beforeState: null,
      afterState: data as Record<string, unknown>,
    });
    undoActionId = action.id;
  }

  return {
    transfer: { ...data, amount: Number(data.amount) || 0 } as ProjectTransfer,
    undoActionId,
  };
}

export async function deleteProjectTransfer(id: string) {
  const { error } = await supabase.from('planner_project_transfers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function aggregateInterProjectDebt(orgId: string) {
  const transfers = await loadAllTransfers(orgId);
  const projectIds = new Set<string>();
  for (const t of transfers) {
    projectIds.add(t.from_project_id);
    projectIds.add(t.to_project_id);
  }

  let totalOutstanding = 0;
  const pairs: Array<{ from: string; to: string; amount: number }> = [];

  for (const a of projectIds) {
    for (const b of projectIds) {
      if (a === b) continue;
      const d = netDebtBetween(transfers, a, b);
      if (d > 0) {
        pairs.push({ from: a, to: b, amount: d });
        totalOutstanding += d;
      }
    }
  }

  return { totalOutstanding, pairs };
}
