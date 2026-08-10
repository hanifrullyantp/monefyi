import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const PRODUCT_MONEFYI = "monefyi";
export const PRODUCT_PLANNER = "planner";
export const PRODUCT_STAY = "stay";

export type ProductCode =
  | typeof PRODUCT_MONEFYI
  | typeof PRODUCT_PLANNER
  | typeof PRODUCT_STAY;

/**
 * Grant product access after registration, purchase, or org join.
 */
export async function grantProductEntitlement(
  sb: SupabaseClient,
  userId: string,
  product: ProductCode,
  source = "registration",
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await sb.rpc("grant_product_entitlement", {
    p_user_id: userId,
    p_product: product,
    p_source: source,
    p_metadata: metadata,
  });
  if (error) {
    console.error("grant_product_entitlement", product, userId, error.message);
    throw error;
  }
}
