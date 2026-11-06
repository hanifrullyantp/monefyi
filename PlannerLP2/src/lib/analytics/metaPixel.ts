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

/**
 * Facebook Pixel: InitiateCheckout (IC)
 * Dipicu ketika user mengisi form di checkout page
 */
export function trackMetaInitiateCheckout(params: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  num_items?: number;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "InitiateCheckout", {
      content_name: params.content_name || "Monefyi Estimator",
      content_category: params.content_category || "SaaS / Digital",
      content_ids: params.content_ids || ["estimator"],
      value: params.value ?? 149000,
      currency: params.currency ?? "IDR",
      num_items: params.num_items ?? 1,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Facebook Pixel: AddPaymentInfo
 * Dipicu ketika user sudah checkout (memilih metode bayar / tagihan terbit) tapi belum bayar
 */
export function trackMetaAddPaymentInfo(params: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  payment_method?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "AddPaymentInfo", {
      content_name: params.content_name || "Monefyi Estimator",
      content_category: params.content_category || "SaaS / Digital",
      content_ids: params.content_ids || ["estimator"],
      value: params.value ?? 149000,
      currency: params.currency ?? "IDR",
      payment_method: params.payment_method || "qris",
    });
  } catch {
    /* ignore */
  }
}

/**
 * Facebook Pixel: Purchase
 * Dipicu ketika pembayaran berhasil dikonfirmasi atau aktivasi sukses
 */
export function trackMetaPurchase(params: {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  value: number;
  currency?: string;
  num_items?: number;
  order_id?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "Purchase", {
      content_name: params.content_name || "Monefyi Estimator",
      content_category: params.content_category || "SaaS / Digital",
      content_ids: params.content_ids || ["estimator"],
      value: params.value,
      currency: params.currency ?? "IDR",
      num_items: params.num_items ?? 1,
      ...(params.order_id ? { order_id: params.order_id } : {}),
    });
  } catch {
    /* ignore */
  }
}
