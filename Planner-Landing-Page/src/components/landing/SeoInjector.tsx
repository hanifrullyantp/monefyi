"use client";

import { useEffect } from "react";
import { useContentStore } from "@/lib/store/contentStore";

/** Sinkronkan meta tag landing dari contentStore (client-side CMS). */
export function SeoInjector() {
  const content = useContentStore((s) => s.content);
  const load = useContentStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const { seo, global } = content;
    if (seo.title) document.title = seo.title;

    const setMeta = (name: string, value: string, attr: "name" | "property" = "name") => {
      if (!value) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = value;
    };

    setMeta("description", seo.description);
    setMeta("keywords", seo.keywords);
    setMeta("og:title", seo.title, "property");
    setMeta("og:description", seo.description, "property");
    setMeta("og:image", seo.ogImage || global.logoUrl, "property");

    if (seo.googleAnalyticsId && !document.getElementById("ga-script")) {
      const script = document.createElement("script");
      script.id = "ga-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`;
      document.head.appendChild(script);
    }
  }, [content]);

  return null;
}
