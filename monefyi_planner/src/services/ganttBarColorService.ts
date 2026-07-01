import { mergeOrgSettingsJson } from './orgService';
import { supabase } from '../lib/supabase';

const COLORS_KEY = 'gantt_bar_colors';

export async function loadBarColors(orgId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('planner_organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const settings = (data?.settings as Record<string, unknown>) || {};
  return (settings[COLORS_KEY] as Record<string, string>) || {};
}

export async function saveBarColors(orgId: string, colors: Record<string, string>): Promise<void> {
  await mergeOrgSettingsJson(orgId, { [COLORS_KEY]: colors });
}

export async function saveBarColor(orgId: string, taskId: string, color: string | null): Promise<Record<string, string>> {
  const current = await loadBarColors(orgId);
  const next = { ...current };
  if (color) next[taskId] = color;
  else delete next[taskId];
  await saveBarColors(orgId, next);
  return next;
}
