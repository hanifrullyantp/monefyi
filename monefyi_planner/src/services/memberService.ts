import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { MemberRole, MemberProfilePatch, OrgMember } from '../types/onboarding';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('planner_org_members')
    .select('*, profiles!user_id(name, avatar_url)')
    .eq('org_id', orgId)
    .neq('status', 'removed')
    .order('accepted_at', { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    org_id: row.org_id,
    user_id: row.user_id,
    role: row.role as MemberRole,
    status: row.status,
    position: row.position,
    department: row.department,
    phone: row.phone,
    bio: row.bio,
    employee_id: row.employee_id,
    address: row.address,
    employment_type: row.employment_type,
    bank_name: row.bank_name,
    bank_account: row.bank_account,
    bank_holder: row.bank_holder,
    joined_at: row.accepted_at || row.invited_at,
    last_active_at: row.last_active_at,
    profile: row.profiles as { name?: string; avatar_url?: string },
  }));
}

export async function updateMemberProfile(memberId: string, patch: MemberProfilePatch) {
  const { error } = await supabase
    .from('planner_org_members')
    .update(patch)
    .eq('id', memberId);
  assertNoDbError(error);
}

export async function changeMemberRole(memberId: string, role: MemberRole) {
  return invokeFn<{ ok: boolean }>(config.fnChangeMemberRole, { member_id: memberId, role });
}

export async function removeMember(memberId: string) {
  return invokeFn<{ ok: boolean }>(config.fnRemoveMember, { member_id: memberId });
}

export async function transferOwnership(orgId: string, targetMemberId: string) {
  return invokeFn<{ ok: boolean }>(config.fnTransferOwnership, {
    org_id: orgId,
    target_member_id: targetMemberId,
  });
}

export async function updateOrgAccessSettings(orgId: string, settings: {
  allow_join_request?: boolean;
  allow_email_domain_signup?: boolean;
  allowed_email_domains?: string[];
  default_role_for_domain?: string;
  is_public_discoverable?: boolean;
}) {
  const { error } = await supabase.from('planner_organizations').update(settings).eq('id', orgId);
  assertNoDbError(error);
}
