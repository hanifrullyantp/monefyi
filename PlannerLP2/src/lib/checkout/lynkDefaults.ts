import { defaultContent } from "@/data/defaultContent";
import type { LynkProduct } from "./products";

/** URL Lynk resmi — fallback jika CMS/env kosong. */
export const DEFAULT_LYNK_CHECKOUT_URLS: Partial<Record<LynkProduct, string>> = {
  estimator_standard: defaultContent.pricing.lynkCheckoutUrls?.estimator_standard ?? "",
  estimator_pro: defaultContent.pricing.lynkCheckoutUrls?.estimator_pro ?? "",
  planner_pro: defaultContent.pricing.lynkCheckoutUrls?.planner_pro ?? "",
};

export function mergeLynkCheckoutUrlOverrides(
  overrides?: Partial<Record<LynkProduct, string>>,
): Partial<Record<LynkProduct, string>> {
  const merged: Partial<Record<LynkProduct, string>> = { ...DEFAULT_LYNK_CHECKOUT_URLS };
  if (!overrides) return merged;
  for (const [key, value] of Object.entries(overrides) as [LynkProduct, string][]) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) merged[key] = trimmed;
  }
  return merged;
}
