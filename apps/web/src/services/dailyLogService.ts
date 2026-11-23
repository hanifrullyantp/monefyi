import { type DbDailyLog } from '../lib/adapters';
import { supabase } from '../lib/supabase';

export type DailyLog = DbDailyLog;

export async function loadDailyLogs(projectId: string): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from('planner_daily_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as DailyLog[];
}

export async function createDailyLog(item: Omit<DailyLog, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('planner_daily_logs').insert(item).select().single();
  if (error) throw new Error(error.message);
  return data as DailyLog;
}

export async function loadRecentLogs(orgId: string, limit = 5) {
  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_daily_logs')
    .select('*')
    .in('project_id', ids)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as DailyLog[];
}

export async function loadWorkerLogsForOrg(orgId: string, limit = 50): Promise<DailyLog[]> {
  const { data: projects, error: projErr } = await supabase
    .from('planner_projects')
    .select('id')
    .eq('org_id', orgId);
  if (projErr) throw new Error(projErr.message);

  const ids = (projects || []).map(p => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('planner_daily_logs')
    .select('*')
    .in('project_id', ids)
    .gt('workers_present', 0)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as DailyLog[];
}
