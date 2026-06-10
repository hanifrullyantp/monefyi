import { fromProjectInsert, fromProjectUpdate, toProject, type DbProject } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import type { Project } from '../store/appStore';

export async function loadProjects(orgId: string, currency = 'IDR'): Promise<Project[]> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data || []) as DbProject[]).map(row => toProject(row, currency));
}

export interface ArchivedProjectRow {
  id: string;
  name: string;
  org_id: string;
  deleted_at: string;
  archive_purge_at: string | null;
  deleted_by: string | null;
  org_name?: string;
}

/** Arsipkan proyek (soft delete, 30 hari sebelum purge) */
export async function archiveProject(projectId: string, userId: string): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('planner_projects')
    .select('settings, status')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error('Proyek tidak ditemukan');

  const purgeAt = new Date();
  purgeAt.setDate(purgeAt.getDate() + 30);
  const settings = {
    ...((row.settings as Record<string, unknown>) || {}),
    archive_previous_status: row.status,
  };

  const { error } = await supabase
    .from('planner_projects')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
      archive_purge_at: purgeAt.toISOString(),
      status: 'cancelled',
      settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
}

/** Daftar proyek terarsip — hanya platform admin (RLS) */
export async function loadArchivedProjects(): Promise<ArchivedProjectRow[]> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('id, name, org_id, deleted_at, archive_purge_at, deleted_by, planner_organizations(name)')
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    org_id: r.org_id as string,
    deleted_at: r.deleted_at as string,
    archive_purge_at: (r.archive_purge_at as string) || null,
    deleted_by: (r.deleted_by as string) || null,
    org_name: (r.planner_organizations as { name?: string } | null)?.name,
  }));
}

/** Pulihkan proyek dari arsip — hanya platform admin */
export async function restoreArchivedProject(projectId: string): Promise<void> {
  const { data: row, error: fetchErr } = await supabase
    .from('planner_projects')
    .select('settings')
    .eq('id', projectId)
    .not('deleted_at', 'is', null)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) throw new Error('Proyek arsip tidak ditemukan');

  const settings = (row.settings as Record<string, unknown>) || {};
  const prevStatus = (settings.archive_previous_status as string) || 'planning';
  const { archive_previous_status: _, ...restSettings } = settings;

  const { error } = await supabase
    .from('planner_projects')
    .update({
      deleted_at: null,
      deleted_by: null,
      archive_purge_at: null,
      status: prevStatus,
      settings: restSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .not('deleted_at', 'is', null);

  if (error) throw new Error(error.message);
}

export async function getProject(projectId: string, currency = 'IDR'): Promise<Project | null> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('*')
    .eq('id', projectId)
    .is('deleted_at', null)
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
  if (data.type !== undefined) {
    const { data: existing } = await supabase
      .from('planner_projects')
      .select('settings')
      .eq('id', projectId)
      .maybeSingle();
    payload.settings = {
      ...((existing?.settings as Record<string, unknown>) || {}),
      type: data.type,
    };
  }
  const { data: row, error } = await supabase
    .from('planner_projects')
    .update(payload)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toProject(row as DbProject, currency);
}

/** @deprecated Gunakan archiveProject */
export async function deleteProject(projectId: string, userId?: string) {
  if (userId) {
    await archiveProject(projectId, userId);
    return;
  }
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
