/**
 * Dual-brand config: Estimator (product LP/app) vs Monefyi (multi-product).
 * Single source for logos, theme-color, titles.
 */

export type BrandId = "estimator" | "planner";

export type BrandAssetSet = {
  mark: string;
  lockupLight: string;
  lockupDark: string;
  faviconSvg: string;
  favicon32: string;
  appleTouchIcon: string;
  icon192: string;
  icon512: string;
  iconMaskable512: string;
  ogImage: string;
};

export type BrandDefinition = {
  id: BrandId;
  name: string;
  shortName: string;
  titleSuffix: string;
  themeColor: string;
  backgroundColor: string;
  assets: BrandAssetSet;
};

const V = "2026-10-28";

export const BRANDS: Record<BrandId, BrandDefinition> = {
  estimator: {
    id: "estimator",
    name: "Monefyi Estimator",
    shortName: "Estimator",
    titleSuffix: "Estimator",
    themeColor: "#157F5F",
    backgroundColor: "#FFFFFF",
    assets: {
      mark: `/brand/estimator/mark.svg?v=${V}`,
      lockupLight: `/brand/estimator/lockup-light.svg?v=${V}`,
      lockupDark: `/brand/estimator/lockup-dark.svg?v=${V}`,
      faviconSvg: `/brand/estimator/favicon.svg?v=${V}`,
      favicon32: `/brand/estimator/favicon-32.png?v=${V}`,
      appleTouchIcon: `/brand/estimator/apple-touch-icon.png?v=${V}`,
      icon192: `/brand/estimator/icon-192.png?v=${V}`,
      icon512: `/brand/estimator/icon-512.png?v=${V}`,
      iconMaskable512: `/brand/estimator/icon-maskable-512.png?v=${V}`,
      ogImage: `/brand/estimator/og-image.png?v=${V}`,
    },
  },
  planner: {
    id: "planner",
    name: "Monefyi Planner",
    shortName: "Planner",
    titleSuffix: "Planner",
    themeColor: "#059669",
    backgroundColor: "#0f172a",
    assets: {
      mark: `/brand/planner/icon-192.png?v=${V}`,
      lockupLight: `/brand/planner/icon-192.png?v=${V}`,
      lockupDark: `/brand/planner/icon-192.png?v=${V}`,
      faviconSvg: `/brand/planner/icon-192.png?v=${V}`,
      favicon32: `/brand/planner/icon-192.png?v=${V}`,
      appleTouchIcon: `/brand/planner/icon-192.png?v=${V}`,
      icon192: `/brand/planner/icon-192.png?v=${V}`,
      icon512: `/brand/planner/icon-192.png?v=${V}`,
      iconMaskable512: `/brand/planner/icon-192.png?v=${V}`,
      ogImage: `/brand/planner/icon-192.png?v=${V}`,
    },
  },
};

export type BrandUserHint = {
  /** Product codes from user_product_entitlements */
  products?: string[];
  /** Org subscription tier if any */
  tier?: string | null;
};

/**
 * Resolve brand from hostname + optional entitlement.
 * Estimator-only → mark E. Punya Planner / Keuangan (monefyi) → logo Planner (bukan Ø).
 */
export function resolveBrand(
  hint?: BrandUserHint | null,
  hostname?: string,
): BrandDefinition {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "");

  const onEstimatorHost =
    host === "estimator.monefyi.com" || host.startsWith("estimator.");

  const products = hint?.products ?? [];
  const hasPlanner = products.includes("planner");
  const hasMonefyiFinance = products.includes("monefyi");
  const tier = hint?.tier ?? null;

  if (hasPlanner || hasMonefyiFinance || tier === "pro" || tier === "enterprise") {
    return BRANDS.planner;
  }

  if (onEstimatorHost) return BRANDS.estimator;

  return BRANDS.estimator;
}

/** First paint on estimator subdomain always Estimator (no flicker). */
export function defaultBrandForHost(hostname?: string): BrandDefinition {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "estimator.monefyi.com");
  if (host === "estimator.monefyi.com" || host.startsWith("estimator.")) {
    return BRANDS.estimator;
  }
  return BRANDS.planner;
}
