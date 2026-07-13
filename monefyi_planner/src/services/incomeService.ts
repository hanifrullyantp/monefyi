import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export type IncomeCategory = 'dp' | 'termin' | 'pelunasan' | 'retensi' | 'other';
export type IncomeStatus = 'received' | 'pending' | 'cancelled';

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
  created_at?: string;
  updated_at?: string;
}

async function recalcTotalReceived(projectId: string) {
  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('amount')
    .eq('project_id', projectId)
    .eq('status', 'received');
  if (error) throw new Error(error.message);

  const total = (data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const { error: updErr } = await supabase
    .from('planner_projects')
    .update({ total_received: total, updated_at: new Date().toISOString() })
    .eq('id', projectId);
  assertNoDbError(updErr);
  return total;
}

export async function loadProjectIncomes(projectId: string): Promise<ProjectIncome[]> {
  const { data, error } = await supabase
    .from('planner_project_incomes')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
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
  return (data || []).map(row => ({
    ...row,
    amount: Number(row.amount) || 0,
  })) as ProjectIncome[];
}

export async function createProjectIncome(
  item: Omit<ProjectIncome, 'id' | 'created_at' | 'updated_at'>,
  undoContext?: { orgId: string; actorId: string },
): Promise<{ income: ProjectIncome; undoActionId?: string }> {
  const { data, error } = await supabase
    .from('planner_project_incomes')
    .insert({
      ...item,
      amount: item.amount,
      status: item.status || 'received',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await recalcTotalReceived(item.project_id);

  let journalEntryId: string | null = null;
  if ((item.status || 'received') === 'received' && item.amount > 0) {
    try {
      const { postProjectIncomeJournal } = await import('./financeV2/projectJournalBridge');
      journalEntryId = await postProjectIncomeJournal({
        projectId: item.project_id,
        amount: item.amount,
        description: `Pemasukan proyek: ${item.description || item.category}`,
        referenceId: data.id,
        entryDate: item.date,
        createdBy: item.recorded_by,
      });
      if (journalEntryId) {
        await supabase
          .from('planner_project_incomes')
          .update({ journal_entry_id: journalEntryId, synced_at: new Date().toISOString() })
          .eq('id', data.id);
      }
    } catch (e) {
      console.error('Journal income post failed:', e);
    }
  }

  let undoActionId: string | undefined;
  if (undoContext) {
    const { recordReversibleAction } = await import('./undoService');
    const action = await recordReversibleAction({
      orgId: undoContext.orgId,
      actorId: undoContext.actorId,
      actionType: 'project_income_create',
      entityType: 'planner_project_incomes',
      entityId: data.id,
      beforeState: null,
      afterState: data as Record<string, unknown>,
    });
    undoActionId = action.id;
  }

  return {
    income: { ...data, amount: Number(data.amount) || 0 } as ProjectIncome,
    undoActionId,
  };
}

export async function deleteProjectIncome(
  id: string,
  projectId: string,
) {
  const { error } = await supabase.from('planner_project_incomes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await recalcTotalReceived(projectId);
}

export { recalcTotalReceived };
