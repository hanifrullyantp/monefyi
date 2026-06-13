import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  last_sign_in_at?: string;
  plan_type: string;
  plan_status: string;
  expires_at?: string | null;
  ai_daily_limit?: number | null;
  profile_role?: string | null;
  is_planner_user?: boolean;
  planner_role?: string | null;
  planner_org_name?: string | null;
}

export interface CompanyType {
  id: string;
  slug: string;
  label: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UserAccountInfo {
  id: string;
  email?: string;
  email_verified: boolean;
  name?: string;
  phone?: string;
  status: string;
  has_gemini_key: boolean;
  gemini_key_hint?: string | null;
  plan_type: string;
  plan_expires_at?: string | null;
  ai_daily_limit: number;
  ai_used_today: number;
  ai_remaining: number;
  platform_fallback_used: number;
  platform_fallback_limit: number;
  gemini_source: string;
  email_notifications: boolean;
  push_notifications: boolean;
  active_orgs: number;
}

export function isPlatformAdmin(platformRole: string, email?: string) {
  if (platformRole === 'admin') return true;
  return config.adminEmails.some(e => e.toLowerCase() === (email || '').toLowerCase());
}

export async function fetchAdminUsers(params?: {
  q?: string;
  plan?: string;
  status?: string;
  planner?: 'all' | 'planner' | 'non_planner';
}) {
  return invokeFn<{ ok: boolean; items: AdminUserRow[] }>(config.fnAdminUsers, params || {});
}

export async function updateAdminUser(userId: string, patch: Record<string, unknown>) {
  return invokeFn<{ ok: boolean }>(config.fnAdminUpdateUser, { user_id: userId, ...patch });
}

export async function fetchPlatformStats() {
  return invokeFn<{
    ok: boolean;
    stats: {
      total_users: number;
      total_orgs: number;
      pending_join_requests: number;
      plan_breakdown: Record<string, number>;
    };
    app_config: Record<string, unknown>;
  }>(config.fnAdminPlatformStats, {});
}

export async function updateAppConfig(patch: Record<string, unknown>) {
  return invokeFn<{ ok: boolean; appConfig: Record<string, unknown> }>(config.fnAdminAppConfig, { patch });
}

export async function listCompanyTypes(includeInactive = false) {
  const { data, error } = await supabase.functions.invoke(config.fnAdminCompanyTypes, {
    body: { action: 'list', include_inactive: includeInactive },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return (data?.items || []) as CompanyType[];
}

export async function createCompanyType(row: { slug: string; label: string; description?: string; sort_order?: number }) {
  return invokeFn<{ ok: boolean; item: CompanyType }>(config.fnAdminCompanyTypes, { action: 'create', ...row });
}

export async function updateCompanyType(id: string, patch: Partial<CompanyType>) {
  return invokeFn<{ ok: boolean; item: CompanyType }>(config.fnAdminCompanyTypes, { action: 'update', id, ...patch });
}

export async function deleteCompanyType(id: string) {
  return invokeFn<{ ok: boolean }>(config.fnAdminCompanyTypes, { action: 'delete', id });
}

export async function getUserAccount() {
  return invokeFn<{ ok: boolean; account: UserAccountInfo }>(config.fnUserAccount, { action: 'get' });
}

export async function updateUserAccount(patch: Record<string, unknown>) {
  return invokeFn<{ ok: boolean }>(config.fnUserAccount, { action: 'update', ...patch });
}

export async function listCompanyTypesPublic() {
  const { data, error } = await supabase
    .from('company_types')
    .select('slug, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return data || [];
}

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  created_at?: string;
  planner_org_custom_domains?: { hostname: string; status: string }[];
}

export async function fetchAdminOrganizations(): Promise<AdminOrgRow[]> {
  const { data, error } = await supabase
    .from('planner_organizations')
    .select('id, name, slug, plan_type, created_at, planner_org_custom_domains(hostname, status)')
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []) as AdminOrgRow[];
}

export async function updateAdminOrgPlan(orgId: string, plan_type: string): Promise<void> {
  const { error } = await supabase
    .from('planner_organizations')
    .update({ plan_type, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (error) throw new Error(error.message);
}
