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
  const data = await invokeFn<{ request: JoinRequest }>(config.fnSubmitJoinRequest, {
    org_id: orgId,
    message: message || undefined,
  });
  return data.request;
}

export async function listJoinRequests(orgId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('planner_join_requests')
    .select('*, profiles!user_id(name)')
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
