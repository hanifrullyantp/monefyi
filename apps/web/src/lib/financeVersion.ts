import { supabase } from './supabase';
import { updateProfileSettings } from '../services/profileService';
import type { FinanceVersion } from '../types/financeV2';

/** Sandbox mockup UI (refined-project-planner-prompt) — route /app/finance-v2 */
export function isSandboxFinance(version: FinanceVersion): boolean {
  return version === 'v2' || version === 'v3';
}

export function normalizeFinanceVersion(raw: unknown): FinanceVersion {
  if (raw === 'v1') return 'v1';
  if (raw === 'v2' || raw === 'v3') return 'v3';
  return 'v3';
}

export async function loadFinanceVersion(userId: string): Promise<FinanceVersion> {
  const { data, error } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const v = (data?.settings as Record<string, unknown> | null)?.finance_version;
  return normalizeFinanceVersion(v);
}

export async function setFinanceVersion(userId: string, version: FinanceVersion): Promise<void> {
  const stored = version === 'v2' ? 'v3' : version;
  await updateProfileSettings(userId, { finance_version: stored });
}
