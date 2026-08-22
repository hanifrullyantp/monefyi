export type ProductId = "estimator" | "planner" | "stay" | "finance";

export type SubscriptionTier = "free" | "estimator" | "pro" | "enterprise";
export type EstimatorVariant = "standard" | "pro" | null;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  orgId?: string | null;
  subscriptionTier?: SubscriptionTier;
  estimatorVariant?: EstimatorVariant;
  ownedProducts: ProductId[];
  plannerTrialUses: number;
  /** Akses CMS landing (/admin) & inline edit. */
  isAdmin?: boolean;
}
