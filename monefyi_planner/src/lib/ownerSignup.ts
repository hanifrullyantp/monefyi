export type OwnerOrgParams = {
  org_name: string;
  industry: string;
  team_size: string;
  timezone: string;
  currency: string;
  business_type: string;
  name: string;
};

export function getSignupIntent(metadata?: Record<string, unknown> | null): string {
  return String(metadata?.signup_intent || '').trim();
}

export function isOwnerSignupIntent(metadata?: Record<string, unknown> | null): boolean {
  return getSignupIntent(metadata) === 'create_org';
}

export function parseOwnerOrgParamsFromMetadata(
  metadata?: Record<string, unknown> | null,
): OwnerOrgParams | null {
  if (!isOwnerSignupIntent(metadata)) return null;
  const org_name = String(metadata?.org_name || '').trim();
  if (!org_name) return null;
  const industry = String(metadata?.industry || 'construction');
  return {
    org_name,
    industry,
    team_size: String(metadata?.team_size || '1-10'),
    timezone: String(metadata?.timezone || 'Asia/Jakarta'),
    currency: String(metadata?.currency || 'IDR'),
    business_type: String(metadata?.business_type || industry),
    name: String(metadata?.name || ''),
  };
}

export function ownerOrgParamsToForm(params: OwnerOrgParams) {
  return {
    name: params.name,
    businessName: params.org_name,
    industry: params.industry,
    teamSize: params.team_size,
    currency: params.currency,
    timezone: params.timezone,
  };
}
