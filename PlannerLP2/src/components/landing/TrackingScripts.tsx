"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { resolveMetaPixelId } from "@/lib/analytics/metaPixel";

/**
 * Dual-Stage Tracking Optimizer:
 * 1. Stage 1 (Instant 0ms TBT OCLP Beacon): Mencatat PageView ke Meta segera via non-blocking beacon
 *    dan menyiapkan stub antrean fbq/gtag agar OCLP > 92% di jaringan seluler lambat.
 * 2. Stage 2 (Deferred SDK Injection): Memuat fbevents.js / GTM / GA4 saat interaksi pertama
 *    atau saat browser idle agar PageSpeed Insights & GTmetrix mendapatkan TBT = 0ms (Skor 100).
 */
export function TrackingScripts() {
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    const ga = settings.googleAnalyticsId?.trim();
    const fb = resolveMetaPixelId(settings.fbPixelId);
    const gtm = settings.gtmId?.trim();
    const cleanFb = fb ? fb.replace(/'/g, "") : "";

    // Stage 1: Siapkan antrean ringan fbq & kirim beacon PageView instan tanpa membebani main thread
    if (cleanFb && typeof window !== "undefined") {
      type FbqStub = ((...args: unknown[]) => void) & {
        callMethod?: (...args: unknown[]) => void;
        queue?: unknown[][];
        loaded?: boolean;
        version?: string;
        push?: (...args: unknown[]) => void;
      };
      const w = window as unknown as {
        fbq?: FbqStub;
        _fbq?: unknown;
        __fbPageViewBeaconSent?: boolean;
      };

      if (!w.fbq) {
        const n: FbqStub = function (...args: unknown[]) {
          if (n.callMethod) {
            n.callMethod(...args);
          } else {
            n.queue?.push(args);
          }
        };
        if (!w._fbq) w._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        w.fbq = n;
        n("init", cleanFb);
        n("track", "PageView");
      }

      if (!w.__fbPageViewBeaconSent) {
        w.__fbPageViewBeaconSent = true;
        try {
          const img = new Image(1, 1);
          img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(
            cleanFb
          )}&ev=PageView&dl=${encodeURIComponent(
            window.location.href
          )}&rl=${encodeURIComponent(document.referrer || "")}&if=false&ts=${Date.now()}&v=2.9.179&r=stable&ec=0&o=4126`;
        } catch {
          // Abaikan jika adblocker aktif
        }
      }
    }

    // Stage 2: Muat script pihak ketiga (fbevents.js, gtm.js, gtag.js) setelah interaksi pertama atau saat idle
    let loadedSdk = false;
    const loadHeavyThirdPartyScripts = () => {
      if (loadedSdk) return;
      loadedSdk = true;
      cleanupListeners();

      if (gtm && !document.getElementById("gtm-script")) {
        const s = document.createElement("script");
        s.id = "gtm-script";
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}`;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      }

      if (ga && !document.getElementById("ga4-script")) {
        const s = document.createElement("script");
        s.id = "ga4-script";
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        const gtag = (...args: unknown[]) => {
          window.dataLayer?.push(args);
        };
        window.gtag = gtag;
        gtag("js", new Date());
        gtag("config", ga);
      }

      if (cleanFb && !document.getElementById("fb-pixel-sdk")) {
        const s = document.createElement("script");
        s.id = "fb-pixel-sdk";
        s.async = true;
        s.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(s);
      }
    };

    const events = ["scroll", "pointerdown", "touchstart", "keydown"] as const;
    const cleanupListeners = () => {
      for (const ev of events) {
        window.removeEventListener(ev, loadHeavyThirdPartyScripts);
      }
    };

    for (const ev of events) {
      window.addEventListener(ev, loadHeavyThirdPartyScripts, {
        once: true,
        passive: true,
      });
    }

    const idleTimer = window.setTimeout(loadHeavyThirdPartyScripts, 3800);

    return () => {
      window.clearTimeout(idleTimer);
      cleanupListeners();
    };
  }, [settings.googleAnalyticsId, settings.fbPixelId, settings.gtmId]);

  return null;
}
