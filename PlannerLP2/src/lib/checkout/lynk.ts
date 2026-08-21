import { plannerAppPath } from "@/lib/config/plannerApp";
import type { LynkProduct } from "./products";

export interface LynkCheckoutParams {
  orgId: string;
  userId: string;
  email: string;
  returnUrl?: string;
}

const ENV_KEYS: Record<LynkProduct, string> = {
  estimator_standard: "NEXT_PUBLIC_LYNK_ESTIMATOR_STANDARD",
  estimator_pro: "NEXT_PUBLIC_LYNK_ESTIMATOR_PRO",
  planner_pro: "NEXT_PUBLIC_LYNK_PLANNER_PRO",
};

/** Lynk checkout URLs from env or CMS content overrides. */
export function resolveLynkBaseUrl(
  product: LynkProduct,
  overrides?: Partial<Record<LynkProduct, string>>,
): string {
  const fromOverride = overrides?.[product]?.trim();
  if (fromOverride) return fromOverride;

  const envKey = ENV_KEYS[product];
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return fromEnv;

  return "";
}

export function buildLynkCheckoutUrl(
  product: LynkProduct,
  params: LynkCheckoutParams,
  overrides?: Partial<Record<LynkProduct, string>>,
): string {
  const base = resolveLynkBaseUrl(product, overrides);
  if (!base) {
    throw new Error(`Checkout URL belum dikonfigurasi untuk ${product}. Set env ${ENV_KEYS[product]}.`);
  }

  const returnUrl =
    params.returnUrl ??
    plannerAppPath("/estimator?payment=success");

  const url = new URL(base);
  url.searchParams.set("org_id", params.orgId);
  url.searchParams.set("user_id", params.userId);
  url.searchParams.set("product", product);
  url.searchParams.set("customer_email", params.email);
  url.searchParams.set("return_url", returnUrl);
  return url.toString();
}

export function redirectToLynkCheckout(
  product: LynkProduct,
  params: LynkCheckoutParams,
  overrides?: Partial<Record<LynkProduct, string>>,
): void {
  window.location.href = buildLynkCheckoutUrl(product, params, overrides);
}
