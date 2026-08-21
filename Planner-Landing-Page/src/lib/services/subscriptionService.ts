import { getSupabaseClient } from "@/lib/supabase/client";
import type { ProductId } from "@/lib/accounts";
import { PLANNER_TRIAL_MAX_PROJECTS } from "@/lib/permissions";

export type SubscriptionTier = "free" | "estimator" | "pro" | "enterprise";
export type EstimatorVariant = "standard" | "pro" | null;

export interface UserSubscriptionContext {
  orgId: string | null;
  subscriptionTier: SubscriptionTier;
  estimatorVariant: EstimatorVariant;
  ownedProducts: ProductId[];
  plannerTrialUses: number;
}

function mapOwnedProducts(tier: SubscriptionTier): ProductId[] {
  if (tier === "free") return [];
  if (tier === "estimator") return ["estimator"];
  if (tier === "pro" || tier === "enterprise") return ["estimator", "planner"];
  return [];
}

export async function loadUserSubscriptionContext(
  userId: string,
): Promise<UserSubscriptionContext> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      orgId: null,
      subscriptionTier: "free",
      estimatorVariant: null,
      ownedProducts: [],
      plannerTrialUses: 0,
    };
  }

  const { data: member } = await supabase
    .from("planner_org_members")
    .select("org_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const orgId = (member?.org_id as string | undefined) ?? null;
  if (!orgId) {
    return {
      orgId: null,
      subscriptionTier: "free",
      estimatorVariant: null,
      ownedProducts: [],
      plannerTrialUses: 0,
    };
  }

  const { data: sub } = await supabase
    .from("planner_org_subscriptions")
    .select("tier, estimator_variant, metadata, expires_at")
    .eq("org_id", orgId)
    .maybeSingle();

  const tier = (sub?.tier as SubscriptionTier | undefined) ?? "free";
  const metaVariant = (sub?.metadata as Record<string, unknown> | null)?.estimator_variant;
  const estimatorVariant =
    (sub?.estimator_variant as EstimatorVariant | undefined) ??
    (metaVariant === "pro" || metaVariant === "standard" ? metaVariant : null);

  const ownedProducts = mapOwnedProducts(tier);
  const plannerTrialUses =
    tier === "pro" || tier === "enterprise"
      ? 999
      : tier === "estimator"
        ? PLANNER_TRIAL_MAX_PROJECTS
        : 0;

  return {
    orgId,
    subscriptionTier: tier,
    estimatorVariant,
    ownedProducts,
    plannerTrialUses,
  };
}
