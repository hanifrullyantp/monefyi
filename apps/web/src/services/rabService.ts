import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

const EDGE_BASE = config.supabaseUrl.replace(/\/$/, '') + '/functions/v1/rab-api';

async function bearerToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function rabRequest(path: string, init: RequestInit = {}): Promise<{ data: unknown; error?: string | null }> {
  const token = await bearerToken();
  const res = await fetch(`${EDGE_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors
  }
  if (!res.ok) {
    return {
      data,
      error: (data as { error?: string } | null)?.error ?? `HTTP ${res.status}`,
    };
  }
  return { data, error: null };
}

export interface RabRecord {
  id?: string;
  [key: string]: unknown;
}

export const rabService = {
  list: (table: string) => rabRequest(`/rab/${table}`),
  get: (table: string, id: string) => rabRequest(`/rab/${table}/${id}`),
  create: (table: string, body: unknown) =>
    rabRequest(`/rab/${table}`, { method: 'POST', body: JSON.stringify(body) }),
  update: (table: string, id: string, body: unknown) =>
    rabRequest(`/rab/${table}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (table: string, id: string) =>
    rabRequest(`/rab/${table}/${id}`, { method: 'DELETE' }),
};
