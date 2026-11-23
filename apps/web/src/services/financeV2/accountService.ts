import { supabase } from '../../lib/supabase';
import type { AccountCategory, AccountType, FinanceAccount } from '../../types/financeV2';

function mapAccount(row: Record<string, unknown>): FinanceAccount {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    type: row.type as AccountType,
    category: row.category as AccountCategory,
    name: row.name as string,
    project_id: (row.project_id as string) || null,
    parent_id: (row.parent_id as string) || null,
    is_system: Boolean(row.is_system),
    is_active: Boolean(row.is_active),
    current_balance: Number(row.current_balance) || 0,
    metadata: (row.metadata as Record<string, unknown>) || {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function ensureChartOfAccounts(orgId: string): Promise<void> {
  const { error } = await supabase.rpc('seed_default_chart_of_accounts', { p_org_id: orgId });
  if (error) throw new Error(error.message);
}

export async function loadAccountsByType(
  orgId: string,
  type: AccountType,
  opts?: { projectId?: string | null; activeOnly?: boolean },
): Promise<FinanceAccount[]> {
  let q = supabase
    .from('planner_finance_accounts')
    .select('*')
    .eq('org_id', orgId)
    .eq('type', type)
    .order('name');

  if (opts?.activeOnly !== false) q = q.eq('is_active', true);
  if (opts?.projectId === null) q = q.is('project_id', null);
  else if (opts?.projectId) q = q.eq('project_id', opts.projectId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(mapAccount);
}

export async function findSystemAccount(
  orgId: string,
  type: AccountType,
  nameHint?: string,
): Promise<FinanceAccount | null> {
  const accounts = await loadAccountsByType(orgId, type, { activeOnly: true });
  if (nameHint) {
    const match = accounts.find(a => a.is_system && a.name.toLowerCase().includes(nameHint.toLowerCase()));
    if (match) return match;
  }
  return accounts.find(a => a.is_system && !a.project_id) || accounts[0] || null;
}

export async function loadAccounts(orgId: string, opts?: { activeOnly?: boolean }): Promise<FinanceAccount[]> {
  let q = supabase
    .from('planner_finance_accounts')
    .select('*')
    .eq('org_id', orgId)
    .order('category')
    .order('name');

  if (opts?.activeOnly !== false) {
    q = q.eq('is_active', true);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(mapAccount);
}

export async function loadAccountById(accountId: string): Promise<FinanceAccount | null> {
  const { data, error } = await supabase
    .from('planner_finance_accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapAccount(data) : null;
}

export async function createAccount(input: {
  orgId: string;
  type: AccountType;
  category: AccountCategory;
  name: string;
  projectId?: string;
  parentId?: string;
}): Promise<FinanceAccount> {
  const { data, error } = await supabase
    .from('planner_finance_accounts')
    .insert({
      org_id: input.orgId,
      type: input.type,
      category: input.category,
      name: input.name.trim(),
      project_id: input.projectId || null,
      parent_id: input.parentId || null,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAccount(data);
}

export async function updateAccount(
  accountId: string,
  patch: { name?: string; is_active?: boolean; metadata?: Record<string, unknown> },
): Promise<FinanceAccount> {
  const { data, error } = await supabase
    .from('planner_finance_accounts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapAccount(data);
}

export async function updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
  const { error } = await supabase
    .from('planner_finance_accounts')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', accountId);

  if (error) throw new Error(error.message);
}

export function rollupByCategory(accounts: FinanceAccount[]): { aktiva: number; pasiva: number } {
  let aktiva = 0;
  let pasiva = 0;
  for (const a of accounts) {
    if (a.category === 'aktiva') aktiva += a.current_balance;
    else pasiva += a.current_balance;
  }
  return {
    aktiva: Math.round(aktiva * 100) / 100,
    pasiva: Math.round(pasiva * 100) / 100,
  };
}
