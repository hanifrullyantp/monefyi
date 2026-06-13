import { supabase } from '../lib/supabase';
import { config } from '../lib/config';

export interface CustomDomainRow {
  id: string;
  org_id: string;
  hostname: string;
  status: 'pending' | 'verified' | 'failed' | 'disabled';
  verification_token: string;
  verified_at: string | null;
  ssl_status: 'pending' | 'active' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ResolvedDomainContext {
  org_id: string;
  org_name: string;
  org_slug: string;
  brand_color: string | null;
  hostname: string;
}

const DEFAULT_HOSTS = [
  'localhost',
  '127.0.0.1',
  'monefyi.vercel.app',
];

export function isDefaultAppHost(hostname: string): boolean {
  const h = hostname.toLowerCase().split(':')[0];
  if (DEFAULT_HOSTS.includes(h)) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

export function currentHostname(): string {
  if (typeof window === 'undefined') return '';
  return window.location.hostname.toLowerCase();
}

export async function loadOrgCustomDomains(orgId: string): Promise<CustomDomainRow[]> {
  const { data, error } = await supabase
    .from('planner_org_custom_domains')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CustomDomainRow[];
}

export async function registerCustomDomain(orgId: string, hostname: string): Promise<CustomDomainRow> {
  const normalized = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!normalized || !normalized.includes('.')) {
    throw new Error('Hostname tidak valid. Contoh: planner.perusahaan.com');
  }

  const { data, error } = await supabase
    .from('planner_org_custom_domains')
    .insert({
      org_id: orgId,
      hostname: normalized,
      status: 'pending',
      ssl_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CustomDomainRow;
}

export async function verifyCustomDomain(domainId: string): Promise<CustomDomainRow> {
  const { data, error } = await supabase.functions.invoke('planner-verify-custom-domain', {
    body: { domain_id: domainId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data.domain as CustomDomainRow;
}

export async function resolveCustomDomain(hostname?: string): Promise<ResolvedDomainContext | null> {
  const host = (hostname || currentHostname()).toLowerCase();
  if (!host || isDefaultAppHost(host)) return null;

  const { data, error } = await supabase.functions.invoke('planner-resolve-domain', {
    body: { hostname: host },
  });
  if (error) throw new Error(error.message);
  if (data?.error || !data?.org_id) return null;
  return data as ResolvedDomainContext;
}

export function cnameTarget(): string {
  return (import.meta.env.VITE_CUSTOM_DOMAIN_CNAME as string) || 'cname.vercel-dns.com';
}

export const CUSTOM_DOMAIN_CTX_KEY = 'monefyi_custom_domain_ctx';

export function saveCustomDomainContext(ctx: ResolvedDomainContext | null): void {
  try {
    if (!ctx) sessionStorage.removeItem(CUSTOM_DOMAIN_CTX_KEY);
    else sessionStorage.setItem(CUSTOM_DOMAIN_CTX_KEY, JSON.stringify(ctx));
  } catch { /* ignore */ }
}

export function loadCustomDomainContext(): ResolvedDomainContext | null {
  try {
    const raw = sessionStorage.getItem(CUSTOM_DOMAIN_CTX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResolvedDomainContext;
  } catch {
    return null;
  }
}

export async function bootstrapCustomDomainContext(): Promise<ResolvedDomainContext | null> {
  const host = currentHostname();
  if (isDefaultAppHost(host)) {
    saveCustomDomainContext(null);
    return null;
  }
  const ctx = await resolveCustomDomain(host);
  saveCustomDomainContext(ctx);
  return ctx;
}
