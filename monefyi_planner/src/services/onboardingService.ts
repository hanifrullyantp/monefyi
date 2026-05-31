import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function createOwnerOrg(params: {
  org_name: string;
  industry?: string;
  team_size?: string;
  timezone?: string;
  currency?: string;
  business_type?: string;
  name?: string;
}) {
  return invokeFn<{ org: Record<string, unknown> }>(config.fnCreateOwnerOrg, params);
}

export async function validateInvitation(params: { token?: string; code?: string }) {
  return invokeFn<Record<string, unknown>>(config.fnValidateInvitation, params);
}

export async function acceptInvitation(params: { token?: string; code?: string; name?: string }) {
  return invokeFn<{ org_id: string; role: string; org_name?: string }>(
    config.fnAcceptInvitation,
    params,
  );
}

export async function completeOwnerOnboarding(orgId: string, updates: {
  logo_url?: string;
  brand_color?: string;
  timezone?: string;
}) {
  const { error } = await supabase
    .from('planner_organizations')
    .update({ ...updates, onboarding_completed: true })
    .eq('id', orgId);
  if (error) throw new Error(error.message);
}

export async function completeMemberOnboarding(userId: string, updates: {
  position?: string;
  department?: string;
  phone?: string;
  bio?: string;
}) {
  await supabase.from('planner_org_members').update(updates).eq('user_id', userId).eq('status', 'active');
  return supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
}

export async function tryDomainJoin() {
  return invokeFn<{ joined: boolean; org_id?: string }>(config.fnTryDomainJoin, {});
}

export async function updateLastActive(userId: string, orgId: string) {
  return supabase
    .from('planner_org_members')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('org_id', orgId);
}
