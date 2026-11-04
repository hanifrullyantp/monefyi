export type PlannerPaymentProvider = "lynk" | "mayar";

const PROVIDERS: PlannerPaymentProvider[] = ["lynk", "mayar"];

/** Active checkout provider for Planner / Estimator (env overrides CMS default). */
export function resolvePlannerPaymentProvider(
  platformSettings?: Record<string, unknown> | null,
): PlannerPaymentProvider {
  const fromEnv = (Deno.env.get("PLANNER_PAYMENT_PROVIDER") ?? "").trim().toLowerCase();
  if (PROVIDERS.includes(fromEnv as PlannerPaymentProvider)) {
    return fromEnv as PlannerPaymentProvider;
  }
  const fromSettings = String(platformSettings?.planner_payment_provider ?? "").trim().toLowerCase();
  if (PROVIDERS.includes(fromSettings as PlannerPaymentProvider)) {
    return fromSettings as PlannerPaymentProvider;
  }
  return "lynk";
}
