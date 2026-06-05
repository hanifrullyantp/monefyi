import { supabase } from '../lib/supabase';
import { tagKey, type TagEntityType, type TaggableEntity } from '../lib/commandTags';

export interface CommandAlias {
  id: string;
  org_id: string;
  alias: string;
  label: string;
  entity_type: TagEntityType;
  entity_id: string | null;
  entity_name: string | null;
  hit_count: number;
}

/** Load custom org aliases as taggable entities. */
export async function loadAliases(orgId: string): Promise<TaggableEntity[]> {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from('planner_command_aliases')
    .select('*')
    .eq('org_id', orgId)
    .order('hit_count', { ascending: false });

  if (error || !data) return [];
  return (data as CommandAlias[]).map(a => ({
    type: a.entity_type,
    id: a.entity_id || undefined,
    name: a.entity_name || a.label,
    alias: a.alias,
  }));
}

/** Create or reinforce a custom alias. */
export async function upsertAlias(entry: {
  orgId: string;
  userId: string;
  alias: string;
  label: string;
  entityType: TagEntityType;
  entityId?: string;
  entityName?: string;
}): Promise<void> {
  const alias = tagKey(entry.alias);
  if (!entry.orgId || !alias) return;

  const { data: existing } = await supabase
    .from('planner_command_aliases')
    .select('id, hit_count')
    .eq('org_id', entry.orgId)
    .eq('alias', alias)
    .eq('entity_type', entry.entityType)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('planner_command_aliases')
      .update({
        hit_count: (existing.hit_count || 0) + 1,
        label: entry.label,
        entity_id: entry.entityId || null,
        entity_name: entry.entityName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return;
  }

  await supabase.from('planner_command_aliases').insert({
    org_id: entry.orgId,
    alias,
    label: entry.label,
    entity_type: entry.entityType,
    entity_id: entry.entityId || null,
    entity_name: entry.entityName || null,
    created_by: entry.userId,
    hit_count: 1,
  });
}
