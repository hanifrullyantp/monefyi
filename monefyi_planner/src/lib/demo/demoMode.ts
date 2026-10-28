/** True hanya di route `/demo-embed` (sandbox landing). */
export function isDemoEmbedActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/demo-embed' || window.location.pathname.startsWith('/demo-embed/');
}

export const DEMO_ORG_ID = 'demo-org-embed';
export const DEMO_USER_ID = 'demo-user-embed';

export function isDemoOrgId(orgId: string | null | undefined): boolean {
  return orgId === DEMO_ORG_ID;
}
