import type { LynkProduct } from "@/lib/checkout/products";
import { lynkProductLabel } from "@/lib/checkout/products";
import { trackEvent } from "@/lib/analytics/events";

/** Meta Pixel — Estimator landing (PageView via TrackingScripts). */
export const META_PIXEL_ID = "1530674178146899";

export function resolveMetaPixelId(settingsPixel?: string): string {
  const fromSettings = settingsPixel?.trim();
  if (fromSettings) return fromSettings;
  const fromEnv = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (fromEnv) return fromEnv;
  return META_PIXEL_ID;
}

export function trackMetaAddToCart(params: {
  content_name: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "AddToCart", {
      content_type: "product",
      content_name: params.content_name,
      content_ids: params.content_ids,
      value: params.value,
      currency: params.currency ?? "IDR",
    });
  } catch {
    /* ignore */
  }
}

/** Sebelum redirect ke Lynk checkout. */
export function trackLynkCheckoutIntent(
  product: LynkProduct,
  options?: { value?: number; planId?: string },
) {
  trackMetaAddToCart({
    content_name: lynkProductLabel(product),
    content_ids: [product],
    value: options?.value,
  });
  trackEvent("checkout_start", {
    product,
    plan: options?.planId,
    value: options?.value,
  });
}
