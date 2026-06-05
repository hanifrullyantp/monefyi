import { supabase } from '../lib/supabase';
import { loadProjectIncomes } from './incomeService';

export type TransferType = 'loan' | 'repayment';
export type TransferSourceType = 'project' | 'external';

export interface ProjectTransfer {
  id: string;
  org_id: string;
  from_project_id: string | null;
  to_project_id: string | null;
  source_type: TransferSourceType;
  counterparty_name?: string | null;
  amount: number;
  type: TransferType;
  date: string;
  description?: string | null;
  recorded_by: string;
  created_at?: string;
}

export interface DebtCounterparty {
  key: string;
  label: string;
  sourceType: TransferSourceType;
  projectId?: string;
  amount: number;
}

export interface ProjectCashSummary {
  received: number;
  spent: number;
  loansIn: number;
  loansOut: number;
  repaymentsIn: number;
  repaymentsOut: number;
  surplus: number;
  /** @deprecated use owedTo */
  owedToProjects: Array<{ projectId: string; projectName?: string; amount: number }>;
  /** @deprecated use owedFrom */
  owedFromProjects: Array<{ projectId: string; projectName?: string; amount: number }>;
  owedTo: DebtCounterparty[];
  owedFrom: DebtCounterparty[];
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function counterpartyKey(sourceType: TransferSourceType, projectId?: string | null, name?: string | null) {
  if (sourceType === 'external') {
    return `external:${normalizeName(name || '')}`;
  }
  return `project:${projectId}`;
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
    source_type: (row.source_type || 'project') as TransferSourceType,
    from_project_id: row.from_project_id ?? null,
    to_project_id: row.to_project_id ?? null,
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

function netDebtToCounterparty(
  transfers: ProjectTransfer[],
  debtorProjectId: string,
  creditor: { sourceType: TransferSourceType; projectId?: string; name?: string },
): number {
  let debt = 0;
  const creditorKey = counterpartyKey(creditor.sourceType, creditor.projectId, creditor.name);

  for (const t of transfers) {
    if (t.type === 'loan' && t.to_project_id === debtorProjectId) {
      const lenderKey = t.source_type === 'external'
        ? counterpartyKey('external', null, t.counterparty_name)
        : counterpartyKey('project', t.from_project_id);
      if (lenderKey === creditorKey) debt += t.amount;
    }
    if (t.type === 'repayment' && t.from_project_id === debtorProjectId) {
      const payeeKey = t.source_type === 'external'
        ? counterpartyKey('external', null, t.counterparty_name)
        : counterpartyKey('project', t.to_project_id);
      if (payeeKey === creditorKey) debt -= t.amount;
    }
  }

  return Math.max(0, debt);
}

/** @deprecated use netDebtToCounterparty */
function netDebtBetween(
  transfers: ProjectTransfer[],
  debtorId: string,
  creditorId: string,
): number {
  return netDebtToCounterparty(transfers, debtorId, { sourceType: 'project', projectId: creditorId });
}

function buildDebtLists(transfers: ProjectTransfer[], projectId: string): Pick<ProjectCashSummary, 'owedTo' | 'owedFrom' | 'owedToProjects' | 'owedFromProjects'> {
  const creditorKeys = new Map<string, DebtCounterparty>();
  const debtorKeys = new Map<string, DebtCounterparty>();

  for (const t of transfers) {
    if (t.source_type === 'external') {
      if (t.type === 'loan' && t.to_project_id === projectId) {
        const key = counterpartyKey('external', null, t.counterparty_name);
        if (!creditorKeys.has(key)) {
          creditorKeys.set(key, {
            key,
            label: t.counterparty_name || 'Eksternal',
            sourceType: 'external',
            amount: 0,
          });
        }
      }
      if (t.type === 'repayment' && t.from_project_id === projectId) {
        const key = counterpartyKey('external', null, t.counterparty_name);
        if (!creditorKeys.has(key)) {
          creditorKeys.set(key, {
            key,
            label: t.counterparty_name || 'Eksternal',
            sourceType: 'external',
            amount: 0,
          });
        }
      }
    } else {
      if (t.from_project_id && t.from_project_id !== projectId) {
        const key = counterpartyKey('project', t.from_project_id);
        if (!creditorKeys.has(key)) {
          creditorKeys.set(key, {
            key,
            label: '',
            sourceType: 'project',
            projectId: t.from_project_id,
            amount: 0,
          });
        }
      }
      if (t.to_project_id && t.to_project_id !== projectId) {
        const key = counterpartyKey('project', t.to_project_id);
        if (!debtorKeys.has(key)) {
          debtorKeys.set(key, {
            key,
            label: '',
            sourceType: 'project',
            projectId: t.to_project_id,
            amount: 0,
          });
        }
      }
    }
  }

  const owedTo: DebtCounterparty[] = [];
  for (const c of creditorKeys.values()) {
    const amount = netDebtToCounterparty(transfers, projectId, {
      sourceType: c.sourceType,
      projectId: c.projectId,
      name: c.label,
    });
    if (amount > 0) owedTo.push({ ...c, amount });
  }

  const owedFrom: DebtCounterparty[] = [];
  for (const d of debtorKeys.values()) {
    if (!d.projectId) continue;
    const amount = netDebtBetween(transfers, d.projectId, projectId);
    if (amount > 0) owedFrom.push({ ...d, amount });
  }

  return {
    owedTo,
    owedFrom,
    owedToProjects: owedTo.filter(o => o.sourceType === 'project' && o.projectId).map(o => ({
      projectId: o.projectId!,
      amount: o.amount,
    })),
    owedFromProjects: owedFrom.filter(o => o.sourceType === 'project' && o.projectId).map(o => ({
      projectId: o.projectId!,
      amount: o.amount,
    })),
  };
}

export async function getProjectCashSummary(
  projectId: string,
  orgId: string,
  _projectName?: string,
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
  const debts = buildDebtLists(transfers, projectId);

  return {
    received,
    spent,
    loansIn,
    loansOut,
    repaymentsIn,
    repaymentsOut,
    surplus,
    ...debts,
  };
}

export async function getAvailableSurplus(projectId: string, orgId: string, spentFromStore?: number): Promise<number> {
  const s = await getProjectCashSummary(projectId, orgId, undefined, spentFromStore);
  return Math.max(0, s.surplus);
}

export async function createProjectTransfer(params: {
  org_id: string;
  source_type: TransferSourceType;
  from_project_id?: string | null;
  to_project_id?: string | null;
  counterparty_name?: string;
  amount: number;
  type: TransferType;
  date?: string;
  description?: string;
  recorded_by: string;
  undoContext?: { actorId: string };
}) {
  const amount = Number(params.amount);
  if (!amount || amount <= 0) throw new Error('Nominal harus lebih dari 0.');

  const sourceType = params.source_type || 'project';

  if (sourceType === 'project') {
    const fromId = params.from_project_id;
    const toId = params.to_project_id;
    if (!fromId || !toId) throw new Error('Proyek sumber dan tujuan wajib diisi.');
    if (fromId === toId) throw new Error('Proyek sumber dan tujuan harus berbeda.');

    if (params.type === 'loan') {
      const available = await getAvailableSurplus(fromId, params.org_id);
      if (amount > available) {
        throw new Error(`Saldo tersedia proyek sumber tidak cukup (tersedia ${Math.floor(available).toLocaleString('id-ID')}).`);
      }
    }

    if (params.type === 'repayment') {
      const debt = netDebtBetween(
        await loadProjectTransfers(params.org_id, fromId),
        fromId,
        toId,
      );
      if (amount > debt) {
        throw new Error(`Pelunasan melebihi hutang outstanding (${Math.floor(debt).toLocaleString('id-ID')}).`);
      }
    }
  } else {
    const name = params.counterparty_name?.trim();
    if (!name) throw new Error('Nama pemberi/penerima pinjaman wajib diisi.');

    if (params.type === 'loan') {
      if (!params.to_project_id) throw new Error('Proyek penerima pinjaman wajib diisi.');
    } else {
      if (!params.from_project_id) throw new Error('Proyek yang membayar hutang wajib diisi.');
      const debt = netDebtToCounterparty(
        await loadProjectTransfers(params.org_id, params.from_project_id),
        params.from_project_id,
        { sourceType: 'external', name },
      );
      if (amount > debt) {
        throw new Error(`Pelunasan melebihi hutang outstanding ke ${name} (${Math.floor(debt).toLocaleString('id-ID')}).`);
      }
    }
  }

  const insertRow = sourceType === 'project'
    ? {
        org_id: params.org_id,
        source_type: 'project',
        from_project_id: params.from_project_id,
        to_project_id: params.to_project_id,
        counterparty_name: null,
        amount,
        type: params.type,
        date: params.date || new Date().toISOString().slice(0, 10),
        description: params.description || null,
        recorded_by: params.recorded_by,
      }
    : params.type === 'loan'
      ? {
          org_id: params.org_id,
          source_type: 'external',
          from_project_id: null,
          to_project_id: params.to_project_id,
          counterparty_name: params.counterparty_name!.trim(),
          amount,
          type: 'loan',
          date: params.date || new Date().toISOString().slice(0, 10),
          description: params.description || null,
          recorded_by: params.recorded_by,
        }
      : {
          org_id: params.org_id,
          source_type: 'external',
          from_project_id: params.from_project_id,
          to_project_id: null,
          counterparty_name: params.counterparty_name!.trim(),
          amount,
          type: 'repayment',
          date: params.date || new Date().toISOString().slice(0, 10),
          description: params.description || null,
          recorded_by: params.recorded_by,
        };

  const { data, error } = await supabase
    .from('planner_project_transfers')
    .insert(insertRow)
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
    transfer: {
      ...data,
      source_type: (data.source_type || 'project') as TransferSourceType,
      amount: Number(data.amount) || 0,
    } as ProjectTransfer,
    undoActionId,
  };
}

export async function deleteProjectTransfer(id: string) {
  const { error } = await supabase.from('planner_project_transfers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function transferCounterpartyLabel(
  t: ProjectTransfer,
  projectId: string,
  projectNameMap: Record<string, string>,
): string {
  if (t.source_type === 'external') {
    return t.counterparty_name || 'Eksternal';
  }
  const otherId = t.to_project_id === projectId ? t.from_project_id : t.to_project_id;
  return otherId ? (projectNameMap[otherId] || otherId.slice(0, 8)) : '—';
}

export async function aggregateInterProjectDebt(orgId: string) {
  const transfers = await loadAllTransfers(orgId);
  const projectIds = new Set<string>();
  for (const t of transfers) {
    if (t.from_project_id) projectIds.add(t.from_project_id);
    if (t.to_project_id) projectIds.add(t.to_project_id);
  }

  let totalOutstanding = 0;
  const pairs: Array<{ from: string; to: string; amount: number; label?: string; sourceType: TransferSourceType }> = [];

  for (const projectId of projectIds) {
    const projectTransfers = transfers.filter(
      t => t.from_project_id === projectId || t.to_project_id === projectId,
    );
    const { owedTo } = buildDebtLists(projectTransfers, projectId);
    for (const debt of owedTo) {
      totalOutstanding += debt.amount;
      pairs.push({
        from: projectId,
        to: debt.sourceType === 'project' ? (debt.projectId || '') : debt.label,
        amount: debt.amount,
        label: debt.label,
        sourceType: debt.sourceType,
      });
    }
  }

  return { totalOutstanding, pairs };
}
