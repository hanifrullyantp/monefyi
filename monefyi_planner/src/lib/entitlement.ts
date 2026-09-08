import type { EntitlementSnapshot, EntitlementPreviewMode, OrgSubscriptionRow, SubscriptionTier } from '../types/entitlement';
import { isPlatformAdmin } from '../services/adminService';

export const ESTIMATOR_PRICE_IDR = 99_000;
export const ESTIMATOR_PRO_PRICE_IDR = 199_000;
export const ESTIMATOR_UPGRADE_DELTA_IDR = ESTIMATOR_PRO_PRICE_IDR - ESTIMATOR_PRICE_IDR;
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
  return (
    snapshot.isEstimatorPro
    || snapshot.isPro
    || snapshot.isEnterprise
  );
}

/** Harga checkout Estimator Pro: selisih upgrade jika sudah punya Basic. */
export function computeEstimatorProCheckoutAmount(snapshot: EntitlementSnapshot): number {
  if (snapshot.isEstimator && snapshot.estimatorVariant === 'standard' && !snapshot.isEstimatorPro) {
    return ESTIMATOR_UPGRADE_DELTA_IDR;
  }
  return ESTIMATOR_PRO_PRICE_IDR;
}

export function isEstimatorProUpgrade(snapshot: EntitlementSnapshot): boolean {
  return snapshot.isEstimator
    && snapshot.estimatorVariant === 'standard'
    && !snapshot.isEstimatorPro;
}

export function isActiveProjectStatus(status?: string | null): boolean {
  return ACTIVE_PROJECT_STATUSES.has(String(status || 'planning'));
}

/** Super admin / platform admin: semua fitur terbuka tanpa paywall. */
export function buildFullAccessEntitlement(
  activeProjectCount = 0,
  memberCount = 1,
): EntitlementSnapshot {
  return {
    tier: 'enterprise',
    canAccessEstimator: true,
    canCreateProject: true,
    canAccessFinance: true,
    canInviteMembers: true,
    maxActiveProjects: 999,
    currentActiveProjects: activeProjectCount,
    remainingProjectSlots: 999,
    maxMembers: 999,
    currentMembers: memberCount,
    estimatorCreditAvailable: false,
    estimatorCreditAmount: ESTIMATOR_PRICE_IDR,
    estimatorVariant: 'pro',
    isEstimatorPro: true,
    isFree: false,
    isEstimator: false,
    isPro: true,
    isEnterprise: true,
    hasPaid: true,
  };
}

const PREVIEW_STORAGE_KEY = 'monefyi_entitlement_preview';

export const ENTITLEMENT_PREVIEW_OPTIONS: Array<{
  id: EntitlementPreviewMode;
  label: string;
  hint: string;
}> = [
  { id: 'full', label: 'Akses penuh', hint: 'Semua fitur — default admin' },
  { id: 'free', label: 'Free', hint: 'Paywall estimator & finance' },
  { id: 'estimator_basic', label: 'Estimator Basic', hint: 'Proyek + Estimator, tanpa kwitansi pro' },
  { id: 'estimator_pro', label: 'Estimator Pro', hint: 'Proyek + Estimator + kwitansi & template pro' },
  { id: 'planner_pro', label: 'Planner Pro', hint: 'Keuangan bisnis + 10 proyek' },
  { id: 'enterprise', label: 'Enterprise', hint: 'Kuota besar + semua modul' },
];

export function getStoredEntitlementPreview(): EntitlementPreviewMode {
  if (typeof sessionStorage === 'undefined') return 'full';
  const v = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
  if (
    v === 'free'
    || v === 'estimator_basic'
    || v === 'estimator_pro'
    || v === 'planner_pro'
    || v === 'enterprise'
    || v === 'full'
  ) {
    return v;
  }
  return 'full';
}

export function persistEntitlementPreview(mode: EntitlementPreviewMode): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PREVIEW_STORAGE_KEY, mode);
  }
}

function mockPreviewSubscription(
  partial: Partial<OrgSubscriptionRow> & Pick<OrgSubscriptionRow, 'tier'>,
): OrgSubscriptionRow {
  return {
    id: 'preview',
    org_id: 'preview',
    tier: partial.tier,
    payment_provider: null,
    external_payment_id: null,
    amount_paid: null,
    currency: 'IDR',
    purchased_at: null,
    activated_at: null,
    expires_at: null,
    estimator_credit_available: false,
    estimator_credit_used_at: null,
    estimator_credit_amount: 0,
    max_active_projects: partial.max_active_projects
      ?? (partial.tier === 'estimator' ? 1 : partial.tier === 'pro' ? 10 : partial.tier === 'enterprise' ? 999 : 0),
    max_members: partial.max_members
      ?? (partial.tier === 'pro' ? 5 : partial.tier === 'enterprise' ? 20 : 1),
    metadata: null,
    estimator_variant: partial.estimator_variant ?? null,
    created_at: '',
    updated_at: '',
  };
}

/** Bangun snapshot entitlement untuk skenario preview super admin. */
export function buildPreviewEntitlement(
  mode: EntitlementPreviewMode,
  activeProjectCount = 0,
  memberCount = 1,
): EntitlementSnapshot {
  if (mode === 'full') return buildFullAccessEntitlement(activeProjectCount, memberCount);

  const base = { activeProjectCount, memberCount, hasEstimations: false as boolean | undefined };

  switch (mode) {
    case 'free':
      return buildEntitlementSnapshot({ ...base, subscription: null, orgPlan: null });
    case 'estimator_basic':
      return buildEntitlementSnapshot({
        ...base,
        subscription: mockPreviewSubscription({ tier: 'estimator', estimator_variant: 'standard' }),
      });
    case 'estimator_pro':
      return buildEntitlementSnapshot({
        ...base,
        subscription: mockPreviewSubscription({ tier: 'estimator', estimator_variant: 'pro' }),
      });
    case 'planner_pro':
      return buildEntitlementSnapshot({
        ...base,
        subscription: mockPreviewSubscription({ tier: 'pro', max_active_projects: 10, max_members: 5 }),
      });
    case 'enterprise':
      return buildEntitlementSnapshot({
        ...base,
        subscription: mockPreviewSubscription({ tier: 'enterprise', max_active_projects: 999, max_members: 20 }),
      });
    default:
      return buildFullAccessEntitlement(activeProjectCount, memberCount);
  }
}

/** Admin dengan preview `full` saja yang melewati paywall/kuota. */
export function isAdminFullAccess(
  platformRole: string,
  email: string | undefined,
  preview: EntitlementPreviewMode = getStoredEntitlementPreview(),
): boolean {
  return isPlatformAdmin(platformRole, email) && preview === 'full';
}

export type PlannerNavModule = 'home' | 'projects' | 'database' | 'estimator' | 'finance' | 'hr';

/** Paket Estimator Basic/Pro — modul Planner terbatas (proyek + estimator). */
export function isEstimatorOnlyPlan(snapshot: Pick<EntitlementSnapshot, 'isEstimator'>): boolean {
  return snapshot.isEstimator;
}

export function canAccessPlannerNavModule(
  snapshot: EntitlementSnapshot,
  module: PlannerNavModule,
): boolean {
  if (isEstimatorOnlyPlan(snapshot)) {
    return module === 'projects' || module === 'estimator';
  }
  if (module === 'estimator') return snapshot.canAccessEstimator;
  if (module === 'finance') return snapshot.canAccessFinance;
  return true;
}

export function plannerNavModuleLabel(module: PlannerNavModule): string {
  switch (module) {
    case 'home': return 'Dashboard';
    case 'projects': return 'Proyek';
    case 'database': return 'Database';
    case 'estimator': return 'Estimator';
    case 'finance': return 'Keuangan Bisnis';
    case 'hr': return 'HR & Karyawan';
    default: return 'Fitur Planner';
  }
}
