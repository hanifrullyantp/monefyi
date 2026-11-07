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
 * Facebook Pixel: CompleteRegistration
 * Dipicu saat registrasi akun gratis berhasil (BUKAN Purchase karena Rp 0 / tidak ada uang keluar)
 */
export function trackMetaCompleteRegistration(params?: {
  content_name?: string;
  status?: string;
  currency?: string;
  value?: number;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "CompleteRegistration", {
      content_name: params?.content_name || "Monefyi Estimator Free Trial",
      status: params?.status || "completed",
      currency: params?.currency || "IDR",
      value: params?.value ?? 0,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Facebook Pixel: Purchase
 * HANYA boleh dipicu ketika PEMBAYARAN SUDAH BENAR-BENAR BERHASIL DIBAYAR (uang riil > Rp 0).
 * JANGAN PERNAH panggil Purchase saat user baru checkout/pending, atau untuk akun gratis Rp 0.
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

  // KEAMANAN KETAT: JANGAN PERNAH mengirim event Purchase jika nominal <= 0 atau belum bayar!
  if (!params.value || params.value <= 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Meta Pixel] Event Purchase DITOLAK: Nominal Rp 0 atau belum bayar. Purchase hanya untuk transaksi berhasil."
      );
    }
    return;
  }

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

export type MetaPixelFunnelStage = "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "CompleteRegistration";

/**
 * Helper untuk admin membaca stage Pixel yang terdata untuk setiap lead
 */
export function getLeadPixelStage(lead: {
  status: string;
  checkoutStep?: number;
  amount?: number;
  planTier?: string;
  paymentMethod?: string;
}): { stage: MetaPixelFunnelStage; label: string; badgeClass: string; desc: string } {
  const amt = Number(lead.amount || 0);

  // 1. Purchase: Transaksi lunas dengan uang riil (> Rp 0)
  if (lead.status === "won" && amt > 0) {
    return {
      stage: "Purchase",
      label: "Purchase (Lunas)",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      desc: "Pembayaran terverifikasi lunas di Mayar / gateway",
    };
  }

  // 2. Akun Free: Registrasi gratis (Bukan Purchase)
  if (lead.status === "won" && (amt === 0 || lead.planTier === "free")) {
    return {
      stage: "CompleteRegistration",
      label: "Reg. Free",
      badgeClass: "bg-teal-100 text-teal-800 border-teal-300",
      desc: "User aktivasi akun gratis (bukan transaksi Purchase)",
    };
  }

  // 3. AddPaymentInfo: User sudah checkout / buka QRIS tapi belum bayar
  if (
    lead.status === "pending_payment" ||
    (lead.checkoutStep && lead.checkoutStep >= 4) ||
    Boolean(lead.paymentMethod)
  ) {
    return {
      stage: "AddPaymentInfo",
      label: "Add Payment Info",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
      desc: "Sudah checkout & tagihan terbit, menunggu pembayaran",
    };
  }

  // 4. InitiateCheckout: User mengisi form checkout
  return {
    stage: "InitiateCheckout",
    label: "Initiate Checkout (IC)",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    desc: "User mengisi form pendaftaran / checkout",
  };
}
