import { supabase } from '../../lib/supabase';
import type { DatabaseMeta, JobTemplate } from '../../types/rpp';
import { DEFAULT_JOB_TEMPLATES } from '../../lib/migration/default-templates';

export async function loadJobTemplates(orgId: string): Promise<JobTemplate[]> {
  const { data, error } = await supabase
    .from('rpp_app_config')
    .select('payload')
    .eq('org_id', orgId)
    .eq('key', 'job_templates')
    .maybeSingle();

  if (error) throw new Error(error.message);
  const payload = data?.payload;
  if (Array.isArray(payload) && payload.length > 0) {
    return payload as JobTemplate[];
  }
  return DEFAULT_JOB_TEMPLATES;
}

export async function upsertJobTemplates(orgId: string, templates: JobTemplate[]): Promise<void> {
  const { error } = await supabase.from('rpp_app_config').upsert(
    {
      org_id: orgId,
      key: 'job_templates',
      payload: templates,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,key' },
  );
  if (error) throw new Error(error.message);
}

export async function loadDatabaseMeta(orgId: string): Promise<DatabaseMeta> {
  const { data, error } = await supabase
    .from('rpp_app_config')
    .select('payload')
    .eq('org_id', orgId)
    .eq('key', 'database_meta')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.payload as DatabaseMeta) || { tools: [], vendors: [], clients: [] };
}

export async function upsertDatabaseMeta(orgId: string, meta: DatabaseMeta): Promise<void> {
  const { error } = await supabase.from('rpp_app_config').upsert(
    {
      org_id: orgId,
      key: 'database_meta',
      payload: meta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,key' },
  );
  if (error) throw new Error(error.message);
}
