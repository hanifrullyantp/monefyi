import { type DbRapItem } from '../lib/adapters';
import { supabase } from '../lib/supabase';

export type RapItem = DbRapItem;

export async function loadRapItems(projectId: string): Promise<RapItem[]> {
  const { data, error } = await supabase
    .from('planner_rap_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as RapItem[];
}

export async function createRapItem(item: Omit<RapItem, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('planner_rap_items').insert(item).select().single();
  if (error) throw new Error(error.message);
  return data as RapItem;
}

export async function updateRapItem(id: string, item: Partial<RapItem>) {
  const { data, error } = await supabase.from('planner_rap_items').update(item).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as RapItem;
}

export async function deleteRapItem(id: string) {
  const { error } = await supabase.from('planner_rap_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function rapSummary(items: RapItem[]) {
  const byType: Record<string, { planned: number; actual: number }> = {};
  for (const item of items) {
    const total = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    if (!byType[item.type]) byType[item.type] = { planned: 0, actual: 0 };
    byType[item.type].planned += total;
  }
  return Object.entries(byType).map(([name, v]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    planned: v.planned / 1_000_000,
    actual: v.actual / 1_000_000,
  }));
}
