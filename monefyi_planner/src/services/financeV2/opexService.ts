import { supabase } from '../../lib/supabase';
import { findSystemAccount } from './accountService';
import { createJournalEntry } from './journalService';
import type { OpexBudget, OpexCategory, OpexComparisonRow, OpexRealization } from '../../types/financeV2';

function mapCategory(row: Record<string, unknown>): OpexCategory {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    name: row.name as string,
    is_active: Boolean(row.is_active),
    created_at: row.created_at as string,
  };
}

function mapBudget(row: Record<string, unknown>): OpexBudget {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    category_id: row.category_id as string,
    period_month: Number(row.period_month),
    period_year: Number(row.period_year),
    planned_amount: Number(row.planned_amount) || 0,
    notes: (row.notes as string) || null,
  };
}

function mapRealization(row: Record<string, unknown>): OpexRealization {
  return {
    id: row.id as string,
    org_id: row.org_id as string,
    category_id: row.category_id as string,
    paid_date: row.paid_date as string,
    amount: Number(row.amount) || 0,
    source_account_id: (row.source_account_id as string) || null,
    notes: (row.notes as string) || null,
    created_at: row.created_at as string,
  };
}

export async function loadOpexCategories(orgId: string): Promise<OpexCategory[]> {
  const { data, error } = await supabase
    .from('planner_opex_categories')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return (data || []).map(mapCategory);
}

export async function createOpexCategory(orgId: string, name: string): Promise<OpexCategory> {
  const { data, error } = await supabase
    .from('planner_opex_categories')
    .insert({ org_id: orgId, name: name.trim() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapCategory(data);
}

export async function loadOpexBudgets(
  orgId: string,
  month: number,
  year: number,
): Promise<OpexBudget[]> {
  const { data, error } = await supabase
    .from('planner_opex_budgets')
    .select('*')
    .eq('org_id', orgId)
    .eq('period_month', month)
    .eq('period_year', year);

  if (error) throw new Error(error.message);
  return (data || []).map(mapBudget);
}

export async function upsertOpexBudget(input: {
  orgId: string;
  categoryId: string;
  month: number;
  year: number;
  plannedAmount: number;
  notes?: string;
}): Promise<OpexBudget> {
  const { data, error } = await supabase
    .from('planner_opex_budgets')
    .upsert({
      org_id: input.orgId,
      category_id: input.categoryId,
      period_month: input.month,
      period_year: input.year,
      planned_amount: input.plannedAmount,
      notes: input.notes?.trim() || null,
    }, { onConflict: 'org_id,category_id,period_month,period_year' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapBudget(data);
}

export async function loadOpexRealizations(
  orgId: string,
  month: number,
  year: number,
): Promise<OpexRealization[]> {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('planner_opex_realizations')
    .select('*')
    .eq('org_id', orgId)
    .gte('paid_date', start)
    .lt('paid_date', end)
    .order('paid_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRealization);
}

export async function createOpexRealization(input: {
  orgId: string;
  categoryId: string;
  amount: number;
  paidDate?: string;
  sourceAccountId?: string;
  notes?: string;
  createdBy?: string;
  withJournal?: boolean;
}): Promise<OpexRealization> {
  if (input.amount <= 0) throw new Error('Nominal harus lebih dari 0.');

  const kas = input.sourceAccountId
    ? { id: input.sourceAccountId }
    : await findSystemAccount(input.orgId, 'kas', 'bisnis');
  const laba = await findSystemAccount(input.orgId, 'laba', 'periode');

  const { data, error } = await supabase
    .from('planner_opex_realizations')
    .insert({
      org_id: input.orgId,
      category_id: input.categoryId,
      paid_date: input.paidDate || new Date().toISOString().slice(0, 10),
      amount: input.amount,
      source_account_id: kas?.id || null,
      notes: input.notes?.trim() || null,
      created_by: input.createdBy || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const rec = mapRealization(data);

  if (input.withJournal !== false && kas && laba) {
    await createJournalEntry({
      orgId: input.orgId,
      entryDate: rec.paid_date,
      description: input.notes || 'Realisasi opex',
      referenceType: 'opex',
      referenceId: rec.id,
      createdBy: input.createdBy,
      lines: [
        { accountId: laba.id, debit: input.amount, credit: 0 },
        { accountId: kas.id, debit: 0, credit: input.amount },
      ],
    });
  }

  return rec;
}

export function buildOpexComparison(
  categories: OpexCategory[],
  budgets: OpexBudget[],
  realizations: OpexRealization[],
): OpexComparisonRow[] {
  const budgetMap = Object.fromEntries(budgets.map(b => [b.category_id, b.planned_amount]));
  const actualMap: Record<string, number> = {};
  for (const r of realizations) {
    actualMap[r.category_id] = (actualMap[r.category_id] || 0) + r.amount;
  }

  return categories.map(cat => {
    const planned = budgetMap[cat.id] || 0;
    const actual = Math.round((actualMap[cat.id] || 0) * 100) / 100;
    const variance = Math.round((planned - actual) * 100) / 100;
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      planned,
      actual,
      variance,
      pctUsed: planned > 0 ? Math.round((actual / planned) * 100) : null,
    };
  });
}

export async function deleteOpexCategory(id: string): Promise<void> {
  const { error } = await supabase.from('planner_opex_categories').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
}
