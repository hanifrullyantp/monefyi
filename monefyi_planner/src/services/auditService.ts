import { supabase } from '../lib/supabase';
import type { AuditLogEntry } from '../types/onboarding';

export async function listAuditLogs(orgId: string, limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('planner_audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as AuditLogEntry[];
}

export function exportAuditCsv(logs: AuditLogEntry[]): string {
  const header = 'created_at,action,user_id,target_user_id,metadata';
  const rows = logs.map(l =>
    [l.created_at, l.action, l.user_id || '', l.target_user_id || '', JSON.stringify(l.metadata || {})].join(','),
  );
  return [header, ...rows].join('\n');
}
