import { supabase } from '../lib/supabase';
import { resolveProjectIncomeTemplate, toRupiah } from '@domain/journal';

export type IncomeCategory = 'dp' | 'termin' | 'pelunasan' | 'retensi' | 'other';
export type IncomeStatus = 'received' | 'pending' | 'invoiced' | 'accrued' | 'cancelled';

export interface ProjectIncome {
  id: string;
  project_id: string;
  date: string;
  amount: number;
  category: IncomeCategory;
  description: string;
  payment_method?: string | null;
  client_ref?: string | null;
  invoice_ref?: string | null;
  status: IncomeStatus;
  recorded_by: string;
  journal_entry_id?: string | null;
  synced_at?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

function isRpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || error.code === '42883' || /does not exist|not found/i.test(error.message || '');
}

function isColumnMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' || error.code === 'PGRST204' || /column .* does not exist/i.test(error.message || '');
}

function isActiveIncomeRow(row: Record<string, unknown>): boolean {
  return row.deleted_at == null && row.status !== 'cancelled';
}

async function recalcTotalReceived(projectId: string) {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('total_received')
    .eq('id', projectId)
    .single();
  if (error) throw new Error(error.message);
  return Number(data?.total_received) || 0;
}

export async function loadProjectIncomes(projectId: string): Promise<ProjectIncome[]> {
  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((row) => isActiveIncomeRow(row as Record<string, unknown>))
    .map(row => ({
      ...row,
      amount: Number(row.amount) || 0,
    })) as ProjectIncome[];
}

export async function loadAllIncomes(orgId: string): Promise<ProjectIncome[]> {
  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('*')
    .in('project_id', ids)
    .eq('status', 'received')
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((row) => isActiveIncomeRow(row as Record<string, unknown>))
    .map(row => ({
      ...row,
      amount: Number(row.amount) || 0,
    })) as ProjectIncome[];
}

export async function createProjectIncome(
  item: Omit<ProjectIncome, 'id' | 'created_at' | 'updated_at'>,
  undoContext?: { orgId: string; actorId: string },
): Promise<{ income: ProjectIncome; undoActionId?: string }> {
  const amount = toRupiah(item.amount);
  const status = item.status || 'received';

  let savedRow: Record<string, unknown> | null = null;
  const { data: rpcRow, error: rpcErr } = await supabase.rpc('planner_create_project_income_atomic', {
    p_project_id: item.project_id,
    p_date: item.date,
    p_amount: amount,
    p_category: item.category,
    p_description: item.description,
    p_payment_method: item.payment_method ?? null,
    p_client_ref: item.client_ref ?? null,
    p_invoice_ref: item.invoice_ref ?? null,
    p_status: status,
    p_recorded_by: item.recorded_by,
  });

  if (!rpcErr && rpcRow) {
    savedRow = rpcRow as Record<string, unknown>;
  } else if (rpcErr && !isRpcMissing(rpcErr)) {
    throw new Error(rpcErr.message);
  } else {
    // Fallback atomik kompensasi ketika RPC belum ter-deploy di remote (BLOCKED remote).
    const { data, error } = await supabase
      .from('planner_project_incomes')
      .insert({
        ...item,
        amount,
        status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    savedRow = data as Record<string, unknown>;

    if (resolveProjectIncomeTemplate(item.category, status, amount).length > 0) {
      try {
        const { postProjectIncomeJournal } = await import('./financeV2/projectJournalBridge');
        const journalEntryId = await postProjectIncomeJournal({
          projectId: item.project_id,
          amount,
          description: `Pemasukan proyek: ${item.description || item.category}`,
          referenceId: savedRow.id as string,
          entryDate: item.date,
          createdBy: item.recorded_by,
          category: item.category,
          status,
        });
        if (!journalEntryId) {
          throw new Error('Jurnal pemasukan proyek gagal dibuat.');
        }
        const { error: linkErr } = await supabase
          .from('planner_project_incomes')
          .update({ journal_entry_id: journalEntryId, synced_at: new Date().toISOString() })
          .eq('id', savedRow.id);
        if (linkErr) throw new Error(linkErr.message);
        savedRow = { ...savedRow, journal_entry_id: journalEntryId };
      } catch (err) {
        await supabase.from('planner_project_incomes').delete().eq('id', savedRow.id);
        throw err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  await recalcTotalReceived(item.project_id);

  let undoActionId: string | undefined;
  if (undoContext) {
    const { recordReversibleAction } = await import('./undoService');
    const action = await recordReversibleAction({
      orgId: undoContext.orgId,
      actorId: undoContext.actorId,
      actionType: 'project_income_create',
      entityType: 'planner_project_incomes',
      entityId: savedRow.id as string,
      beforeState: null,
      afterState: savedRow,
    });
    undoActionId = action.id;
  }

  return {
    income: { ...savedRow, amount: Number(savedRow.amount) || 0 } as ProjectIncome,
    undoActionId,
  };
}

export async function deleteProjectIncome(
  id: string,
  projectId: string,
) {
  const { data: existing, error: fetchErr } = await supabase
    .from('planner_project_incomes')
    .select('id, journal_entry_id, description, category, status, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) return;

  if (existing.journal_entry_id) {
    const { reverseProjectJournal } = await import('./financeV2/projectJournalBridge');
    await reverseProjectJournal(
      existing.journal_entry_id as string,
      `Batal pemasukan proyek: ${(existing.description as string) || (existing.category as string) || ''}`.trim(),
    );
  }

  const now = new Date().toISOString();
  const { error: softErr } = await supabase
    .from('planner_project_incomes')
    .update({ status: 'cancelled', deleted_at: now, updated_at: now })
    .eq('id', id);

  if (softErr && isColumnMissing(softErr)) {
    const { error: fallbackErr } = await supabase
      .from('planner_project_incomes')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', id);
    if (fallbackErr) throw new Error(fallbackErr.message);
  } else if (softErr) {
    throw new Error(softErr.message);
  }

  await recalcTotalReceived(projectId);
}

export { recalcTotalReceived };
