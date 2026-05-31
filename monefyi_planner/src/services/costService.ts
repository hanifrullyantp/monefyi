import { type DbCostRealization } from '../lib/adapters';
import { supabase } from '../lib/supabase';

export type CostRealization = DbCostRealization;

export async function loadCostRealizations(projectId: string): Promise<CostRealization[]> {
  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as CostRealization[];
}

export async function loadAllCosts(orgId: string): Promise<CostRealization[]> {
  const { data: projects } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .select('*')
    .in('project_id', ids)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as CostRealization[];
}

export async function createCostRealization(
  item: Omit<CostRealization, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await supabase
    .from('planner_cost_realizations')
    .insert(item)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: costs } = await supabase
    .from('planner_cost_realizations')
    .select('total_amount')
    .eq('project_id', item.project_id);

  const totalSpent = (costs || []).reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  await supabase
    .from('planner_projects')
    .update({ total_spent: totalSpent })
    .eq('id', item.project_id);

  return data as CostRealization;
}

export async function deleteCostRealization(id: string, projectId: string) {
  const { error } = await supabase.from('planner_cost_realizations').delete().eq('id', id);
  if (error) throw new Error(error.message);

  const { data: costs } = await supabase
    .from('planner_cost_realizations')
    .select('total_amount')
    .eq('project_id', projectId);

  const totalSpent = (costs || []).reduce((s, c) => s + (Number(c.total_amount) || 0), 0);
  await supabase.from('planner_projects').update({ total_spent: totalSpent }).eq('id', projectId);
}

export async function aggregateCashflow(orgId: string, days = 30) {
  const costs = await loadAllCosts(orgId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const byDay: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    byDay[d.toISOString().slice(0, 10)] = 0;
  }

  for (const c of costs) {
    const d = c.date;
    if (new Date(d) >= cutoff) {
      byDay[d] = (byDay[d] || 0) + (Number(c.total_amount) || 0);
    }
  }

  return Object.entries(byDay).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    amount: amount / 1_000_000,
  }));
}

export async function aggregateByProject(orgId: string) {
  const { data: projects } = await supabase
    .from('planner_projects')
    .select('id, name, total_budget, total_spent')
    .eq('org_id', orgId);

  return (projects || []).map(p => ({
    projectId: p.id,
    name: p.name,
    budget: Number(p.total_budget) || 0,
    spent: Number(p.total_spent) || 0,
  }));
}
