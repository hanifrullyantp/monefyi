import { supabase } from '../../supabase';
import type { JournalLineEnriched, ReportFilters } from './types';
import type { AccountType } from '../../../types/financeV2';

export interface EnrichedJournalEntry {
  id: string;
  entry_date: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  lines: JournalLineEnriched[];
}

export async function loadEnrichedJournalLines(filters: ReportFilters): Promise<JournalLineEnriched[]> {
  const { data, error } = await supabase
    .from('planner_journal_entries')
    .select(`
      id,
      entry_date,
      description,
      reference_type,
      reference_id,
      lines:planner_journal_lines (
        account_id,
        debit,
        credit,
        account:planner_finance_accounts (
          id, name, type, category, project_id
        )
      )
    `)
    .eq('org_id', filters.orgId)
    .gte('entry_date', filters.dateFrom)
    .lte('entry_date', filters.dateTo)
    .order('entry_date', { ascending: true });

  if (error) throw new Error(error.message);

  const rows: JournalLineEnriched[] = [];
  for (const entry of data || []) {
    const lines = (entry.lines as Record<string, unknown>[]) || [];
    for (const line of lines) {
      const acc = line.account as Record<string, unknown> | null;
      if (!acc) continue;
      const projectId = (acc.project_id as string) || null;
      if (filters.projectId && projectId !== filters.projectId) continue;
      if (filters.accountId && acc.id !== filters.accountId) continue;

      rows.push({
        journalId: entry.id as string,
        entryDate: entry.entry_date as string,
        description: (entry.description as string) || null,
        referenceType: (entry.reference_type as string) || null,
        referenceId: (entry.reference_id as string) || null,
        accountId: acc.id as string,
        accountName: acc.name as string,
        accountType: acc.type as AccountType,
        accountCategory: acc.category as 'aktiva' | 'pasiva',
        projectId,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      });
    }
  }
  return rows;
}

export async function loadAllJournalLinesUpTo(orgId: string, asOfDate: string): Promise<JournalLineEnriched[]> {
  const { data, error } = await supabase
    .from('planner_journal_entries')
    .select(`
      id,
      entry_date,
      description,
      reference_type,
      reference_id,
      lines:planner_journal_lines (
        account_id,
        debit,
        credit,
        account:planner_finance_accounts (
          id, name, type, category, project_id
        )
      )
    `)
    .eq('org_id', orgId)
    .lte('entry_date', asOfDate)
    .order('entry_date', { ascending: true });

  if (error) throw new Error(error.message);

  const rows: JournalLineEnriched[] = [];
  for (const entry of data || []) {
    for (const line of (entry.lines as Record<string, unknown>[]) || []) {
      const acc = line.account as Record<string, unknown> | null;
      if (!acc) continue;
      rows.push({
        journalId: entry.id as string,
        entryDate: entry.entry_date as string,
        description: (entry.description as string) || null,
        referenceType: (entry.reference_type as string) || null,
        referenceId: (entry.reference_id as string) || null,
        accountId: acc.id as string,
        accountName: acc.name as string,
        accountType: acc.type as AccountType,
        accountCategory: acc.category as 'aktiva' | 'pasiva',
        projectId: (acc.project_id as string) || null,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
      });
    }
  }
  return rows;
}
