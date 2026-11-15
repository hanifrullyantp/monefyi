/** True hanya di route `/demo-embed` (sandbox landing). */
export function isDemoEmbedActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/demo-embed' || window.location.pathname.startsWith('/demo-embed/');
}

export const DEMO_ORG_ID = 'demo-org-embed';
export const DEMO_USER_ID = 'demo-user-embed';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDemoOrgId(orgId: string | null | undefined): boolean {
  return orgId === DEMO_ORG_ID;
}

export function isUuid(value?: string | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** True jika sesi demo aktif atau ID kosong / bukan UUID valid (menghindari query Supabase 22P02). */
export function isDemoOrInvalidUuid(id?: string | null, isDemoMode = false): boolean {
  if (isDemoMode) return true;
  if (!id || id === 'demo' || id.startsWith('demo-') || isDemoOrgId(id)) return true;
  return !isUuid(id);
}
