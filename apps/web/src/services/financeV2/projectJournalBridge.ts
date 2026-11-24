import { supabase } from '../../lib/supabase';
import { toRupiah } from '../../../../../packages/domain/src/journal';
import { ensureChartOfAccounts, findSystemAccount } from './accountService';
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
 * Post project dividend as equity distribution:
 * - Cash payout: Dr Laba Ditahan / Cr Kas Proyek
 * - Owner receivable offset: Dr Laba Ditahan / Cr Piutang Usaha
 */
export async function postProjectDividendJournal(input: {
  orgId: string;
  projectId: string;
  partyName: string;
  cashAmount: number;
  offsetAmount: number;
  entryDate?: string;
  createdBy?: string;
  cashReferenceId?: string;
  offsetReferenceId?: string;
}): Promise<{ cashJournalId: string | null; offsetJournalId: string | null }> {
  const cashAmount = toRupiah(input.cashAmount);
  const offsetAmount = toRupiah(input.offsetAmount);
  if (cashAmount <= 0 && offsetAmount <= 0) {
    return { cashJournalId: null, offsetJournalId: null };
  }

  await ensureChartOfAccounts(input.orgId);
  const labaDitahan = await findSystemAccount(input.orgId, 'laba_ditahan');
  if (!labaDitahan) {
    throw new Error('Akun Laba Ditahan tidak ditemukan untuk mencatat dividen.');
  }

  let cashJournalId: string | null = null;
  let offsetJournalId: string | null = null;

  if (offsetAmount > 0) {
    const piutang = await findSystemAccount(input.orgId, 'piutang');
    if (!piutang) throw new Error('Akun Piutang Usaha tidak ditemukan untuk offset dividen.');
    const offsetEntry = await createJournalEntry({
      orgId: input.orgId,
      entryDate: input.entryDate,
      description: `Dividen (offset piutang): ${input.partyName}`,
      referenceType: 'dividend',
      referenceId: input.offsetReferenceId,
      createdBy: input.createdBy,
      lines: [
        { accountId: labaDitahan.id, debit: offsetAmount, credit: 0, projectId: input.projectId },
        { accountId: piutang.id, debit: 0, credit: offsetAmount, projectId: input.projectId },
      ],
    });
    offsetJournalId = offsetEntry.id;
  }

  if (cashAmount > 0) {
    const { name } = await resolveProjectOrg(input.projectId);
    const projectKas = await getOrCreateProjectKasAccount(input.orgId, input.projectId, name);
    const cashEntry = await createJournalEntry({
      orgId: input.orgId,
      entryDate: input.entryDate,
      description: `Dividen proyek: ${input.partyName}`,
      referenceType: 'dividend',
      referenceId: input.cashReferenceId,
      createdBy: input.createdBy,
      lines: [
        { accountId: labaDitahan.id, debit: cashAmount, credit: 0, projectId: input.projectId },
        { accountId: projectKas.id, debit: 0, credit: cashAmount, projectId: input.projectId },
      ],
    });
    cashJournalId = cashEntry.id;
  }

  return { cashJournalId, offsetJournalId };
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
    const status = String(row.status || 'recorded').toLowerCase();
    if (status === 'dividend' || status === 'cancelled' || row.deleted_at != null) continue;
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
