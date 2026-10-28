/**
 * Funnel analytics — fires to GA4 / Meta / TikTok when IDs present on window.
 * Safe no-op if pixels not loaded.
 */

export type FunnelEvent =
  | "view_hero"
  | "hero_cta_primary_click"
  | "hero_cta_demo_click"
  | "hero_login_link_click"
  | "calc_start"
  | "calc_complete"
  | "lead_submit"
  | "free_signup"
  | "first_estimate_created"
  | "first_pdf_exported"
  | "upgrade_modal_view"
  | "checkout_start"
  | "purchase"
  | "refund_request";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, params?: EventParams) => void };
    dataLayer?: unknown[];
  }
}

export function trackEvent(name: FunnelEvent, params: EventParams = {}) {
  if (typeof window === "undefined") return;

  try {
    window.dataLayer?.push({ event: name, ...params });
    window.gtag?.("event", name, params);
    window.fbq?.("trackCustom", name, params);
    window.ttq?.track(name, params);
  } catch {
    /* ignore */
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, params);
  }
}

export function captureUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = q.get(k);
    if (v) out[k] = v;
  }
  if (document.referrer) out.referrer = document.referrer;
  return out;
}
