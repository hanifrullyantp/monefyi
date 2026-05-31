import { type DbWorkItem } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

export type WorkItem = DbWorkItem;

export async function loadWorkItems(projectId: string): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from('planner_work_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as WorkItem[];
}

export async function createWorkItem(item: Omit<WorkItem, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('planner_work_items').insert(item).select().single();
  if (error) throw new Error(error.message);
  return data as WorkItem;
}

export async function updateWorkItem(id: string, item: Partial<WorkItem>) {
  const { data, error } = await supabase.from('planner_work_items').update(item).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as WorkItem;
}

export async function deleteWorkItem(id: string) {
  const { error } = await supabase.from('planner_work_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function loadWorkItemsForOrg(orgId: string): Promise<WorkItem[]> {
  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_work_items')
    .select('*')
    .in('project_id', ids)
    .order('planned_end', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as WorkItem[];
}

export async function updateProjectProgressFromWorkItems(projectId: string) {
  const items = await loadWorkItems(projectId);
  if (!items.length) return;
  const avg = items.reduce((s, wi) => s + (Number(wi.progress_pct) || 0), 0) / items.length;
  const { error } = await supabase.from('planner_projects').update({ progress_pct: avg }).eq('id', projectId);
  assertNoDbError(error);
  return avg;
}
