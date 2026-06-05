import { supabase } from '../../lib/supabase';
import type { OpexCategory, OpexRealization } from '../../types/financeV2';
import { DEFAULT_OPEX_CATEGORIES } from '../../types/financeV1Report';
import {
  createOpexCategory,
  createOpexRealization,
  loadOpexCategories,
} from '../financeV2/opexService';

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

export async function ensureDefaultOpexCategories(orgId: string): Promise<OpexCategory[]> {
  const existing = await loadOpexCategories(orgId);
  if (existing.length > 0) return existing;

  for (const name of DEFAULT_OPEX_CATEGORIES) {
    await createOpexCategory(orgId, name);
  }
  return loadOpexCategories(orgId);
}

export async function loadOpexRealizationsInRange(
  orgId: string,
  dateFrom: string,
  dateTo: string,
): Promise<OpexRealization[]> {
  const { data, error } = await supabase
    .from('planner_opex_realizations')
    .select('*')
    .eq('org_id', orgId)
    .gte('paid_date', dateFrom)
    .lte('paid_date', dateTo)
    .order('paid_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(mapRealization);
}

export async function recordV1Opex(input: {
  orgId: string;
  categoryId: string;
  amount: number;
  paidDate?: string;
  notes?: string;
  createdBy?: string;
}): Promise<OpexRealization> {
  return createOpexRealization({
    ...input,
    withJournal: false,
  });
}

export { createOpexCategory, loadOpexCategories };
