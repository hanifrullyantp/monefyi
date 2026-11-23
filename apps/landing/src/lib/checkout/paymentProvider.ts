export type PlannerPaymentProvider = "lynk" | "mayar";

const PROVIDERS: PlannerPaymentProvider[] = ["lynk", "mayar"];

export function resolvePaymentProvider(
  cmsOverride?: string | null,
): PlannerPaymentProvider {
  const fromCms = String(cmsOverride ?? "").trim().toLowerCase();
  if (PROVIDERS.includes(fromCms as PlannerPaymentProvider)) {
    return fromCms as PlannerPaymentProvider;
  }
  const fromEnv = (process.env.NEXT_PUBLIC_PLANNER_PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (PROVIDERS.includes(fromEnv as PlannerPaymentProvider)) {
    return fromEnv as PlannerPaymentProvider;
  }
  return "lynk";
}
