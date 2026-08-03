import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { ChartAccount, JournalEntry, JournalLine } from '../../types/finance';

function mapAccount(row: Record<string, unknown>): ChartAccount {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    code: row.code as string,
    name: row.name as string,
    accountType: row.account_type as ChartAccount['accountType'],
    subType: row.sub_type as ChartAccount['subType'],
    parentId: (row.parent_id as string) || undefined,
    isSystem: Boolean(row.is_system),
    isActive: Boolean(row.is_active),
    currentBalance: Number(row.current_balance) || 0,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

function mapJournal(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    entryNumber: row.entry_number as string,
    entryDate: row.entry_date as string,
    description: (row.description as string) || '',
    source: row.source as JournalEntry['source'],
    referenceType: (row.reference_type as string) || undefined,
    referenceId: (row.reference_id as string) || undefined,
    status: row.status as JournalEntry['status'],
    totalAmount: Number(row.total_amount) || 0,
    voidReason: (row.void_reason as string) || undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function mapLine(row: Record<string, unknown>): JournalLine {
  return {
    id: row.id as string,
    journalId: row.journal_id as string,
    accountId: row.account_id as string,
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    notes: (row.notes as string) || undefined,
  };
}

export async function seedFinanceAccounts(tenantId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.rpc('stay_seed_finance_for_tenant', { p_tenant_id: tenantId });
}

export async function fetchFinanceData(tenantId: string) {
  if (!isSupabaseConfigured || !supabase) return null;

  await seedFinanceAccounts(tenantId);

  const [accountsRes, journalsRes] = await Promise.all([
    supabase.from('stay_chart_of_accounts').select('*').eq('tenant_id', tenantId).order('code'),
    supabase.from('stay_journal_entries').select('*').eq('tenant_id', tenantId).order('entry_date', { ascending: false }).limit(500),
  ]);

  if (accountsRes.error) {
    console.error('fetchFinanceData accounts:', accountsRes.error);
    return null;
  }

  const journalIds = (journalsRes.data ?? []).map((j) => j.id);
  let lines: JournalLine[] = [];

  if (journalIds.length > 0) {
    const linesRes = await supabase
      .from('stay_journal_entry_lines')
      .select('*')
      .in('journal_id', journalIds);
    if (!linesRes.error) {
      lines = (linesRes.data ?? []).map(mapLine);
    }
  }

  return {
    accounts: (accountsRes.data ?? []).map(mapAccount),
    journalEntries: (journalsRes.data ?? []).map(mapJournal),
    journalLines: lines,
  };
}

export async function hydrateFinanceFromRemote(tenantId: string): Promise<boolean> {
  const data = await fetchFinanceData(tenantId);
  if (!data || data.accounts.length === 0) return false;

  const { useFinanceStore } = await import('../../store/financeStore');
  useFinanceStore.getState().hydrateFromRemote(data);
  return true;
}

export async function syncJournalToApi(entry: JournalEntry, lines: JournalLine[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  const { error: entryErr } = await supabase.from('stay_journal_entries').upsert({
    id: entry.id,
    tenant_id: entry.tenantId,
    entry_number: entry.entryNumber,
    entry_date: entry.entryDate,
    description: entry.description,
    source: entry.source,
    reference_type: entry.referenceType,
    reference_id: entry.referenceId,
    status: entry.status,
    total_amount: entry.totalAmount,
    created_by: entry.createdBy,
  });

  if (entryErr) {
    console.error('syncJournal entry:', entryErr);
    return false;
  }

  const lineRows = lines.map((l) => ({
    id: l.id,
    journal_id: l.journalId,
    account_id: l.accountId,
    debit: l.debit,
    credit: l.credit,
    notes: l.notes,
  }));

  const { error: linesErr } = await supabase.from('stay_journal_entry_lines').upsert(lineRows);
  if (linesErr) {
    console.error('syncJournal lines:', linesErr);
    return false;
  }

  return true;
}

export async function syncAccountBalances(accounts: ChartAccount[]): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;

  for (const acc of accounts) {
    const { error } = await supabase
      .from('stay_chart_of_accounts')
      .update({ current_balance: acc.currentBalance, updated_at: new Date().toISOString() })
      .eq('id', acc.id);
    if (error) {
      console.error('syncAccountBalance:', error);
      return false;
    }
  }
  return true;
}

function mapRegisterToDb(s: Record<string, unknown>) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    shift_name: s.shiftName,
    opened_by: s.openedBy,
    closed_by: s.closedBy,
    opened_at: s.openedAt,
    closed_at: s.closedAt,
    opening_balance: s.openingBalance,
    closing_balance: s.closingBalance,
    expected_balance: s.expectedBalance,
    variance: s.variance,
    total_in: s.totalIn,
    total_out: s.totalOut,
    status: s.status,
    notes: s.notes,
  };
}

export async function syncRegisterSession(session: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase.from('stay_cash_register_sessions').upsert(mapRegisterToDb(session));
  if (error) {
    console.error('syncRegisterSession:', error);
    return false;
  }
  return true;
}

export async function fetchRegisterSessions(tenantId: string) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('stay_cash_register_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('opened_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    tenantId: r.tenant_id as string,
    shiftName: r.shift_name as string,
    openedBy: r.opened_by as string | undefined,
    closedBy: r.closed_by as string | undefined,
    openedAt: r.opened_at as string,
    closedAt: r.closed_at as string | undefined,
    openingBalance: Number(r.opening_balance) || 0,
    closingBalance: r.closing_balance != null ? Number(r.closing_balance) : undefined,
    expectedBalance: r.expected_balance != null ? Number(r.expected_balance) : undefined,
    variance: r.variance != null ? Number(r.variance) : undefined,
    totalIn: Number(r.total_in) || 0,
    totalOut: Number(r.total_out) || 0,
    status: r.status as 'open' | 'closed',
    notes: r.notes as string | undefined,
  }));
}
