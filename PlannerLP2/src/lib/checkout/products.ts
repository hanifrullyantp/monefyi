export type LynkProduct = "estimator_standard" | "estimator_pro" | "planner_pro";

/** Map pricing card ids in LP2 content to Lynk products. */
export const LYNK_PRODUCT_BY_PLAN_ID: Record<string, LynkProduct> = {
  "estimator-basic": "estimator_standard",
  "estimator-standard": "estimator_standard",
  "estimator-pro": "estimator_pro",
};

export function planIdToLynkProduct(planId: string): LynkProduct | null {
  return LYNK_PRODUCT_BY_PLAN_ID[planId] ?? null;
}

export function lynkProductLabel(product: LynkProduct): string {
  switch (product) {
    case "estimator_standard":
      return "Estimator Standard";
    case "estimator_pro":
      return "Estimator Pro";
    case "planner_pro":
      return "Planner Pro";
    default:
      return product;
  }
}
