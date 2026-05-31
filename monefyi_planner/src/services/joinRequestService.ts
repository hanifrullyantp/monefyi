import { supabase } from '../lib/supabase';
import { config } from '../lib/config';
import type { CompanySearchResult, JoinRequest } from '../types/onboarding';

async function invokeFn<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  const { data, error } = await supabase.functions.invoke(config.fnSearchCompanies, {
    body: { q: query },
  });
  if (error) throw error;
  return (data?.companies || []) as CompanySearchResult[];
}

export async function createJoinRequest(orgId: string, message?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('planner_join_requests')
    .insert({
      org_id: orgId,
      user_id: user.id,
      requested_role: 'worker',
      message: message || null,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: org } = await supabase
    .from('planner_organizations')
    .select('name, owner_id')
    .eq('id', orgId)
    .single();

  if (org?.owner_id) {
    await supabase.from('planner_notifications').insert({
      user_id: org.owner_id,
      org_id: orgId,
      type: 'join_request',
      title: 'Permintaan bergabung',
      message: `${user.email} ingin bergabung ke ${org.name}.`,
      action_url: '/app?tab=hr',
    });
  }

  return data;
}

export async function listJoinRequests(orgId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('planner_join_requests')
    .select('*, profiles(name)')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as JoinRequest[];
}

export async function approveJoinRequest(requestId: string) {
  return invokeFn<{ ok: boolean }>(config.fnApproveJoinRequest, { request_id: requestId });
}

export async function rejectJoinRequest(requestId: string, reason?: string) {
  return invokeFn<{ ok: boolean }>(config.fnRejectJoinRequest, {
    request_id: requestId,
    reject_reason: reason,
  });
}
