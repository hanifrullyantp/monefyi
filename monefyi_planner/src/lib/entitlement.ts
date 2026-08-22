import type { EntitlementSnapshot, OrgSubscriptionRow, SubscriptionTier } from '../types/entitlement';

export const ESTIMATOR_PRICE_IDR = 99_000;
export const ESTIMATOR_PRO_PRICE_IDR = 199_000;
export const PRO_PRICE_MONTHLY_IDR = 199_000;

const ACTIVE_PROJECT_STATUSES = new Set(['planning', 'active', 'on_hold']);

export function mapLegacyOrgPlan(plan?: string | null): SubscriptionTier | null {
  switch (plan) {
    case 'pro':
    case 'pro_plus':
      return 'pro';
    case 'enterprise':
      return 'enterprise';
    case 'starter':
      return 'estimator';
    default:
      return null;
  }
}

export function buildEntitlementSnapshot(input: {
  subscription: OrgSubscriptionRow | null;
  orgPlan?: string | null;
  hasEstimations?: boolean;
  activeProjectCount: number;
  memberCount: number;
}): EntitlementSnapshot {
  let tier: SubscriptionTier = input.subscription?.tier ?? 'free';

  if (!input.subscription) {
    const legacy = mapLegacyOrgPlan(input.orgPlan);
    if (legacy) tier = legacy;
    else if (input.hasEstimations) tier = 'estimator';
  }

  const maxActiveProjects = input.subscription?.max_active_projects
    ?? (tier === 'estimator' ? 1 : tier === 'pro' ? 10 : tier === 'enterprise' ? 999 : 0);
  const maxMembers = input.subscription?.max_members
    ?? (tier === 'pro' ? 5 : tier === 'enterprise' ? 20 : 1);

  const canAccessEstimator = tier !== 'free';
  const canAccessFinance = tier === 'pro' || tier === 'enterprise';
  const canInviteMembers = tier === 'pro' || tier === 'enterprise';
  const remainingProjectSlots = Math.max(0, maxActiveProjects - input.activeProjectCount);
  const canCreateProject = remainingProjectSlots > 0;

  const meta = input.subscription?.metadata ?? {};
  const estimatorVariant =
    (input.subscription?.estimator_variant as 'standard' | 'pro' | undefined) ??
    (meta.estimator_variant === 'pro' ? 'pro' : meta.estimator_variant === 'standard' ? 'standard' : null);
  const isEstimatorPro = tier === 'estimator' && estimatorVariant === 'pro';

  return {
    tier,
    canAccessEstimator,
    canCreateProject,
    canAccessFinance,
    canInviteMembers,
    maxActiveProjects,
    currentActiveProjects: input.activeProjectCount,
    remainingProjectSlots,
    maxMembers,
    currentMembers: input.memberCount,
    estimatorCreditAvailable: Boolean(input.subscription?.estimator_credit_available),
    estimatorCreditAmount: Number(input.subscription?.estimator_credit_amount ?? ESTIMATOR_PRICE_IDR),
    estimatorVariant,
    isEstimatorPro,
    isFree: tier === 'free',
    isEstimator: tier === 'estimator',
    isPro: tier === 'pro',
    isEnterprise: tier === 'enterprise',
    hasPaid: tier !== 'free',
  };
}

export function canGenerateKwitansi(snapshot: EntitlementSnapshot): boolean {
  return snapshot.isEstimatorPro;
}

export function isActiveProjectStatus(status?: string | null): boolean {
  return ACTIVE_PROJECT_STATUSES.has(String(status || 'planning'));
}
