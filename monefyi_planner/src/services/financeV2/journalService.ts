import { supabase } from '../../lib/supabase';
import {
  applyBalanceDelta,
  balanceDelta,
  sumDebits,
  validateBalancedEntry,
} from '../../lib/financeV2Calc';
import { loadAccountById, updateAccountBalance } from './accountService';
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
  const check = validateBalancedEntry(input.lines);
  if (!check.ok) throw new Error(check.message);

  const totalAmount = sumDebits(input.lines);
  const entryDate = input.entryDate || new Date().toISOString().slice(0, 10);

  const accountSnapshots: {
    id: string;
    originalBalance: number;
    category: 'aktiva' | 'pasiva';
  }[] = [];
  for (const line of input.lines) {
    const acc = await loadAccountById(line.accountId);
    if (!acc) throw new Error(`Akun tidak ditemukan: ${line.accountId}`);
    accountSnapshots.push({
      id: acc.id,
      originalBalance: acc.current_balance,
      category: acc.category,
    });
  }

  const { data: entry, error: entryErr } = await supabase
    .from('planner_journal_entries')
    .insert({
      org_id: input.orgId,
      entry_date: entryDate,
      description: input.description?.trim() || null,
      reference_type: input.referenceType || 'manual',
      reference_id: input.referenceId || null,
      total_amount: totalAmount,
      created_by: input.createdBy || null,
    })
    .select()
    .single();

  if (entryErr) throw new Error(entryErr.message);

  const journalId = entry.id as string;
  const lineRows = input.lines.map(l => ({
    journal_id: journalId,
    account_id: l.accountId,
    debit: l.debit || 0,
    credit: l.credit || 0,
    notes: l.notes?.trim() || null,
  }));

  const { error: linesErr } = await supabase.from('planner_journal_lines').insert(lineRows);

  if (linesErr) {
    await supabase.from('planner_journal_entries').delete().eq('id', journalId);
    throw new Error(linesErr.message);
  }

  const updatedBalances: { id: string; balance: number }[] = [];
  try {
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const snap = accountSnapshots[i];
      const prior = updatedBalances.find(u => u.id === snap.id)?.balance ?? snap.originalBalance;
      const delta = balanceDelta(snap.category, line.debit || 0, line.credit || 0);
      const newBalance = applyBalanceDelta(prior, delta);
      await updateAccountBalance(snap.id, newBalance);
      const existing = updatedBalances.find(u => u.id === snap.id);
      if (existing) existing.balance = newBalance;
      else updatedBalances.push({ id: snap.id, balance: newBalance });
    }
  } catch (balanceErr) {
    await supabase.from('planner_journal_lines').delete().eq('journal_id', journalId);
    await supabase.from('planner_journal_entries').delete().eq('id', journalId);
    for (const snap of accountSnapshots) {
      await updateAccountBalance(snap.id, snap.originalBalance);
    }
    throw balanceErr instanceof Error ? balanceErr : new Error('Gagal memperbarui saldo akun.');
  }

  return mapEntry(entry);
}
