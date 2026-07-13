import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import { getOrCreateProjectKasAccount } from './kasService';

async function resolveProjectOrg(projectId: string): Promise<{ orgId: string; name: string }> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('org_id, name')
    .eq('id', projectId)
    .single();
  if (error || !data) throw new Error('Proyek tidak ditemukan.');
  return { orgId: data.org_id as string, name: data.name as string };
}

/**
 * Post project income: Dr Kas Proyek / Cr Laba Periode
 */
export async function postProjectIncomeJournal(input: {
  projectId: string;
  amount: number;
  description: string;
  referenceId: string;
  entryDate?: string;
  createdBy?: string;
}): Promise<string | null> {
  if (input.amount <= 0) return null;

  const { orgId, name } = await resolveProjectOrg(input.projectId);
  const projectKas = await getOrCreateProjectKasAccount(orgId, input.projectId, name);
  const laba = await findSystemAccount(orgId, 'laba', 'periode');
  if (!laba) return null;

  const entry = await createJournalEntry({
    orgId,
    entryDate: input.entryDate,
    description: input.description,
    referenceType: 'project_income',
    referenceId: input.referenceId,
    createdBy: input.createdBy,
    lines: [
      { accountId: projectKas.id, debit: input.amount, credit: 0 },
      { accountId: laba.id, debit: 0, credit: input.amount },
    ],
  });

  return entry.id;
}

/**
 * Post project expense: Dr Laba (HPP) / Cr Kas Proyek
 */
export async function postProjectExpenseJournal(input: {
  projectId: string;
  amount: number;
  description: string;
  referenceId: string;
  entryDate?: string;
  createdBy?: string;
}): Promise<string | null> {
  if (input.amount <= 0) return null;

  const { orgId, name } = await resolveProjectOrg(input.projectId);
  const projectKas = await getOrCreateProjectKasAccount(orgId, input.projectId, name);
  const laba = await findSystemAccount(orgId, 'laba', 'periode');
  if (!laba) return null;

  const entry = await createJournalEntry({
    orgId,
    entryDate: input.entryDate,
    description: input.description,
    referenceType: 'project_expense',
    referenceId: input.referenceId,
    createdBy: input.createdBy,
    lines: [
      { accountId: laba.id, debit: input.amount, credit: 0 },
      { accountId: projectKas.id, debit: 0, credit: input.amount },
    ],
  });

  return entry.id;
}

/**
 * Idempotent backfill for historical incomes/costs without journal_entry_id.
 */
export async function backfillProjectJournalsForOrg(orgId: string, createdBy?: string): Promise<{
  incomesPosted: number;
  costsPosted: number;
}> {
  const { data: projects } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId)
    .is('deleted_at', null);

  const projectIds = (projects || []).map(p => p.id as string);
  if (!projectIds.length) return { incomesPosted: 0, costsPosted: 0 };

  let incomesPosted = 0;
  let costsPosted = 0;

  const { data: incomes } = await supabase
    .from('planner_project_incomes')
    .select('*')
    .in('project_id', projectIds)
    .eq('status', 'received')
    .is('journal_entry_id', null);

  for (const row of incomes || []) {
    const amount = Number(row.amount) || 0;
    if (amount <= 0) continue;
    try {
      const journalId = await postProjectIncomeJournal({
        projectId: row.project_id as string,
        amount,
        description: `Backfill pemasukan: ${row.description || ''}`.trim(),
        referenceId: row.id as string,
        entryDate: row.date as string,
        createdBy,
      });
      if (journalId) {
        await supabase
          .from('planner_project_incomes')
          .update({ journal_entry_id: journalId, synced_at: new Date().toISOString() })
          .eq('id', row.id);
        incomesPosted++;
      }
    } catch {
      /* skip row on failure — manual reconcile */
    }
  }

  const { data: costs } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .in('project_id', projectIds)
    .is('journal_entry_id', null);

  for (const row of costs || []) {
    const amount = Number(row.total_amount) || 0;
    if (amount <= 0) continue;
    try {
      const journalId = await postProjectExpenseJournal({
        projectId: row.project_id as string,
        amount,
        description: `Backfill biaya: ${row.description || ''}`.trim(),
        referenceId: row.id as string,
        entryDate: row.date as string,
        createdBy,
      });
      if (journalId) {
        await supabase
          .from('planner_cost_realizations')
          .update({ journal_entry_id: journalId, synced_at: new Date().toISOString() })
          .eq('id', row.id);
        costsPosted++;
      }
    } catch {
      /* skip */
    }
  }

  return { incomesPosted, costsPosted };
}
