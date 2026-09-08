export type SubscriptionTier = 'free' | 'estimator' | 'pro' | 'enterprise';

export interface OrgSubscriptionRow {
  id: string;
  org_id: string;
  tier: SubscriptionTier;
  payment_provider: string | null;
  external_payment_id: string | null;
  amount_paid: number | null;
  currency: string;
  purchased_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  estimator_credit_available: boolean;
  estimator_credit_used_at: string | null;
  estimator_credit_amount: number;
  max_active_projects: number;
  max_members: number;
  metadata: Record<string, unknown> | null;
  estimator_variant?: 'standard' | 'pro' | null;
  created_at: string;
  updated_at: string;
}

export type UpgradeModalTrigger =
  | 'project_limit'
  | 'pro_feature'
  | 'estimator_pro_feature'
  | 'estimation_accepted'
  | 'manual'
  | 'estimator_paywall';

/** Super-admin preview: simulasi tier tanpa mengubah data org. */
export type EntitlementPreviewMode =
  | 'full'
  | 'free'
  | 'estimator_basic'
  | 'estimator_pro'
  | 'planner_pro'
  | 'enterprise';

export interface EntitlementSnapshot {
  tier: SubscriptionTier;
  canAccessEstimator: boolean;
  canCreateProject: boolean;
  canAccessFinance: boolean;
  canInviteMembers: boolean;
  maxActiveProjects: number;
  currentActiveProjects: number;
  remainingProjectSlots: number;
  maxMembers: number;
  currentMembers: number;
  estimatorCreditAvailable: boolean;
  estimatorCreditAmount: number;
  estimatorVariant: 'standard' | 'pro' | null;
  isEstimatorPro: boolean;
  isFree: boolean;
  isEstimator: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  hasPaid: boolean;
}
