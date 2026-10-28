/**
 * Dual-brand config: Estimator (product LP/app) vs Monefyi (multi-product).
 * Single source for logos, theme-color, titles.
 */

export type BrandId = "estimator" | "monefyi";

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
  monefyi: {
    id: "monefyi",
    name: "Monefyi",
    shortName: "Monefyi",
    titleSuffix: "Monefyi",
    themeColor: "#74C05A",
    backgroundColor: "#030D17",
    assets: {
      mark: "/icons/monefyi-logo.png",
      lockupLight: "/icons/monefyi-logo.png",
      lockupDark: "/icons/monefyi-logo.png",
      faviconSvg: "/icons/favicon.png",
      favicon32: "/icons/icon-32.png",
      appleTouchIcon: "/icons/icon-180.png",
      icon192: "/icons/icon-192.png",
      icon512: "/icons/icon-512.png",
      iconMaskable512: "/icons/icon-maskable-512.png",
      ogImage: "/brand/estimator/og-image.png",
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
 * Default on estimator.* = estimator.
 * Multi-product (planner+monefyi or more) → monefyi mark for shared chrome.
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
  const hasMonefyi = products.includes("monefyi");
  const hasStay = products.includes("stay");
  const productCount = [hasPlanner, hasMonefyi, hasStay].filter(Boolean).length;

  // Multi-product user → Monefyi umbrella brand
  if (productCount > 1) return BRANDS.monefyi;

  // Estimator-only context
  if (onEstimatorHost) return BRANDS.estimator;
  if (hasPlanner && !hasMonefyi) return BRANDS.estimator;

  return onEstimatorHost ? BRANDS.estimator : BRANDS.monefyi;
}

/** First paint on estimator subdomain always Estimator (no flicker). */
export function defaultBrandForHost(hostname?: string): BrandDefinition {
  const host =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "estimator.monefyi.com");
  if (host === "estimator.monefyi.com" || host.startsWith("estimator.")) {
    return BRANDS.estimator;
  }
  return BRANDS.monefyi;
}
