import { supabase } from './supabase';
import { updateProfileSettings } from '../services/profileService';
import {
  DEFAULT_MIGRATION_FLAGS,
  type MigrationFlags,
} from '../types/rpp';

const FLAG_KEYS = Object.keys(DEFAULT_MIGRATION_FLAGS) as (keyof MigrationFlags)[];

function parseFlags(settings: Record<string, unknown> | null | undefined): MigrationFlags {
  const raw = settings?.migration_flags;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MIGRATION_FLAGS };
  const obj = raw as Record<string, unknown>;
  return {
    project_view_v2: Boolean(obj.project_view_v2),
    database_master: Boolean(obj.database_master),
    create_project_smart: Boolean(obj.create_project_smart),
    finance_dashboard_v2: Boolean(obj.finance_dashboard_v2),
  };
}

export async function loadMigrationFlags(userId: string): Promise<MigrationFlags> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseFlags(data?.settings as Record<string, unknown> | null);
}

export async function setMigrationFlag(
  userId: string,
  key: keyof MigrationFlags,
  value: boolean,
): Promise<void> {
  const current = await loadMigrationFlags(userId);
  await updateProfileSettings(userId, {
    migration_flags: { ...current, [key]: value },
  });
}

export async function setMigrationFlags(
  userId: string,
  patch: Partial<MigrationFlags>,
): Promise<MigrationFlags> {
  const current = await loadMigrationFlags(userId);
  const merged = { ...current, ...patch };
  await updateProfileSettings(userId, { migration_flags: merged });
  return merged;
}

export function isMigrationFlagEnabled(
  flags: MigrationFlags | null | undefined,
  key: keyof MigrationFlags,
): boolean {
  return Boolean(flags?.[key]);
}

export { FLAG_KEYS };
