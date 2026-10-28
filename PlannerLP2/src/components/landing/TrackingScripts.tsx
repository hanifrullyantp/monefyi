"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";

/**
 * Inject GA4 / Meta Pixel / GTM when admin settings have IDs.
 * No fake pixels — only loads if configured.
 */
export function TrackingScripts() {
  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    const ga = settings.googleAnalyticsId?.trim();
    const fb = settings.fbPixelId?.trim();
    const gtm = settings.gtmId?.trim();

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

    if (fb && !document.getElementById("fb-pixel")) {
      const s = document.createElement("script");
      s.id = "fb-pixel";
      s.innerHTML = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${fb.replace(/'/g, "")}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  }, [settings.googleAnalyticsId, settings.fbPixelId, settings.gtmId]);

  return null;
}
