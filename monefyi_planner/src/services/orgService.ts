import { toTenant, type DbOrganization } from '../lib/adapters';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { Tenant } from '../store/appStore';

export interface OrgContext {
  org: Tenant;
  role: string;
  memberStatus?: string;
  onboardingCompleted?: boolean;
  orgOnboardingCompleted?: boolean;
  profileOnboardingCompleted?: boolean;
}

export async function loadOrg(userId: string): Promise<OrgContext | null> {
  const { data: membership, error: membershipErr } = await supabase
    .from('planner_org_members')
    .select(`
      org_id, role, status,
      planner_organizations(*)
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (membershipErr) {
    console.warn('planner_org_members:', membershipErr);
  }

  if (!membership?.planner_organizations) {
    return null;
  }

  const orgRow = membership.planner_organizations as DbOrganization & {
    onboarding_completed?: boolean;
    logo_url?: string;
    brand_color?: string;
    timezone?: string;
    industry?: string;
  };

  const tenant = toTenant(orgRow);
  if (orgRow.logo_url) tenant.logo = orgRow.logo_url;

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle();

  return {
    org: tenant,
    role: membership.role,
    memberStatus: membership.status,
    orgOnboardingCompleted: orgRow.onboarding_completed ?? true,
    profileOnboardingCompleted: profile?.onboarding_completed ?? false,
    onboardingCompleted:
      membership.role === 'owner'
        ? (orgRow.onboarding_completed ?? true)
        : (profile?.onboarding_completed ?? false),
  };
}

export async function updateOrgName(orgId: string, name: string) {
  const { error } = await supabase.from('planner_organizations').update({ name }).eq('id', orgId);
  assertNoDbError(error);
}

export async function updateOrgSettings(orgId: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('planner_organizations').update(updates).eq('id', orgId);
  assertNoDbError(error);
}

export interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  team_size?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  timezone?: string | null;
  plan_type?: string | null;
  settings?: Record<string, unknown> | null;
}

export async function loadOrgDetails(orgId: string): Promise<OrgDetails> {
  const { data, error } = await supabase
    .from('planner_organizations')
    .select('id, name, slug, industry, team_size, logo_url, brand_color, timezone, plan_type, settings')
    .eq('id', orgId)
    .single();
  if (error) throw error;
  return data as OrgDetails;
}

export async function updateOrgFields(orgId: string, fields: {
  name?: string;
  timezone?: string;
  brand_color?: string;
  industry?: string;
}) {
  const { error } = await supabase.from('planner_organizations').update(fields).eq('id', orgId);
  assertNoDbError(error);
}

export async function mergeOrgSettingsJson(orgId: string, patch: Record<string, unknown>) {
  const { data: current, error: selErr } = await supabase
    .from('planner_organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();
  if (selErr) throw selErr;

  const merged = { ...(current?.settings as Record<string, unknown> || {}), ...patch };
  const { error } = await supabase.from('planner_organizations').update({ settings: merged }).eq('id', orgId);
  assertNoDbError(error);
}
