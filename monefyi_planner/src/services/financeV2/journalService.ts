import { supabase } from '../../lib/supabase';
import { validateBalancedEntry } from '../../lib/financeV2Calc';
import { orgToday } from '../../../../packages/domain/src/dates';
import type { CreateJournalInput, JournalEntry, JournalLine } from '../../types/financeV2';

function mapEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    entry_date: row.entry_date as string,
    description: (row.description as string) || null,
    reference_type: row.reference_type as JournalEntry['reference_type'],
    reference_id: (row.reference_id as string) || null,
    total_amount: Number(row.total_amount) || 0,
    created_by: (row.created_by as string) || null,
    created_at: row.created_at as string,
  };
}

function mapLine(row: Record<string, unknown>): JournalLine {
  return {
    id: row.id as string,
    journal_id: row.journal_id as string,
    account_id: row.account_id as string,
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    notes: (row.notes as string) || null,
  };
}

export async function loadJournalEntries(orgId: string, limit = 50): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('planner_journal_entries')
    .select('*')
    .eq('org_id', orgId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map(mapEntry);
}

export async function loadJournalLines(journalId: string): Promise<JournalLine[]> {
  const { data, error } = await supabase
    .from('planner_journal_lines')
    .select('*')
    .eq('journal_id', journalId);

  if (error) throw new Error(error.message);
  return (data || []).map(mapLine);
}

/**
 * Creates a balanced journal entry and updates account balances.
 * Rolls back inserted rows on failure.
 */
export async function createJournalEntry(input: CreateJournalInput): Promise<JournalEntry> {
  const lines = input.lines.map((line) => ({
    ...line,
    debit: Math.round(line.debit || 0),
    credit: Math.round(line.credit || 0),
  }));
  const check = validateBalancedEntry(lines);
  if (!check.ok) throw new Error(check.message);

  const { data: journalId, error } = await supabase.rpc('planner_post_journal', {
    p_org_id: input.orgId,
    p_entry_date: input.entryDate || orgToday(),
    p_description: input.description?.trim() || null,
    p_reference_type: input.referenceType || 'manual',
    p_reference_id: input.referenceId || null,
    p_lines: lines.map((line) => ({
      account_id: line.accountId,
      debit: line.debit,
      credit: line.credit,
      notes: line.notes?.trim() || null,
      party_id: line.partyId || null,
      project_id: line.projectId || null,
    })),
    p_created_by: input.createdBy || null,
  });

  if (error) throw new Error(error.message);

  const { data: entry, error: loadErr } = await supabase
    .from('planner_journal_entries')
    .select('*')
    .eq('id', journalId as string)
    .single();

  if (loadErr || !entry) throw new Error(loadErr?.message || 'Jurnal tidak terbaca setelah disimpan.');
  return mapEntry(entry);
}
