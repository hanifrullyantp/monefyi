import { fromProjectInsert, fromProjectUpdate, toProject, type DbProject } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import type { Project } from '../store/appStore';

export async function loadProjects(orgId: string, currency = 'IDR'): Promise<Project[]> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as DbProject[]).map(row => toProject(row, currency));
}

export async function getProject(projectId: string, currency = 'IDR'): Promise<Project | null> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toProject(data as DbProject, currency) : null;
}

export async function createProject(
  input: Parameters<typeof fromProjectInsert>[0],
  currency = 'IDR',
): Promise<Project> {
  const payload = fromProjectInsert(input);
  const { data, error } = await supabase
    .from('planner_projects')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProject(data as DbProject, currency);
}

export async function updateProject(projectId: string, data: Partial<Project>, currency = 'IDR') {
  const payload = fromProjectUpdate(data);
  const { data: row, error } = await supabase
    .from('planner_projects')
    .update(payload)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProject(row as DbProject, currency);
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from('planner_projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function getProjectStats(orgId: string) {
  const projects = await loadProjects(orgId);
  const active = projects.filter(p => p.status === 'active' || p.status === 'planning');
  const totalBudget = projects.reduce((s, p) => s + p.total_budget_planned, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent_amount, 0);
  const avgProgress = active.length
    ? active.reduce((s, p) => s + p.progress_percentage, 0) / active.length
    : 0;
  const atRisk = projects.filter(p => p.health_status === 'at_risk' || p.health_status === 'behind').length;

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalBudget,
    totalSpent,
    avgProgress,
    atRisk,
  };
}
