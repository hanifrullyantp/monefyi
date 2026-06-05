import { supabase } from './supabase';
import { updateProfileSettings } from '../services/profileService';
import type { FinanceVersion } from '../types/financeV2';

export async function loadFinanceVersion(userId: string): Promise<FinanceVersion> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const v = (data?.settings as Record<string, unknown> | null)?.finance_version;
  return v === 'v2' ? 'v2' : 'v1';
}

export async function setFinanceVersion(userId: string, version: FinanceVersion): Promise<void> {
  await updateProfileSettings(userId, { finance_version: version });
}
