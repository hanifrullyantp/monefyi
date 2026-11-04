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
 * Reverse an existing journal entry by posting an equal-and-opposite 'reversal' entry.
 * Idempotent per original journalEntryId because planner_post_journal deduplicates (org_id, 'reversal', journalEntryId).
 */
export async function reverseProjectJournal(
  journalEntryId: string | null | undefined,
  reason?: string,
): Promise<string | null> {
  if (!journalEntryId) return null;

  const { data: original, error: entryErr } = await supabase
    .from('planner_journal_entries')
    .select('id, org_id, entry_date, description, created_by')
    .eq('id', journalEntryId)
    .maybeSingle();

  if (entryErr || !original) return null;

  const { data: lines, error: linesErr } = await supabase
    .from('planner_journal_lines')
    .select('account_id, debit, credit, notes')
    .eq('journal_id', journalEntryId);

  if (linesErr || !lines || lines.length === 0) return null;

  const reversedLines = lines
    .map((line) => ({
      accountId: line.account_id as string,
      debit: Number(line.credit) || 0,
      credit: Number(line.debit) || 0,
      notes: line.notes ? `Pembalik: ${line.notes}` : 'Jurnal pembalik otomatis',
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);

  if (reversedLines.length < 2) return null;

  const reversal = await createJournalEntry({
    orgId: original.org_id as string,
    entryDate: new Date().toISOString().slice(0, 10),
    description: reason || `Jurnal pembalik: ${(original.description as string) || journalEntryId}`,
    referenceType: 'reversal',
    referenceId: journalEntryId,
    createdBy: (original.created_by as string) || undefined,
    lines: reversedLines,
  });

  return reversal.id;
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
