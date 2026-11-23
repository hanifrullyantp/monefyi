"use client";

import { useEffect } from "react";
import {
  defaultBrandForHost,
  resolveBrand,
  type BrandDefinition,
  type BrandUserHint,
} from "@/lib/brand/brand.config";

type Props = {
  /** Optional entitlement hint after hydrate */
  userHint?: BrandUserHint | null;
  pageTitle?: string;
};

function applyBrandToDocument(brand: BrandDefinition, pageTitle?: string) {
  if (typeof document === "undefined") return;

  const ensureLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
    let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${attrs.sizes ? `[sizes="${attrs.sizes}"]` : ""}`);
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
  };

  ensureLink("icon", brand.assets.faviconSvg, { type: "image/svg+xml" });
  ensureLink("icon", brand.assets.favicon32, { sizes: "32x32", type: "image/png" });
  ensureLink("apple-touch-icon", brand.assets.appleTouchIcon);

  let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement("meta");
    theme.name = "theme-color";
    document.head.appendChild(theme);
  }
  theme.content = brand.themeColor;

  if (pageTitle) {
    const suffix = brand.titleSuffix;
    document.title = pageTitle.includes(suffix) ? pageTitle : `${pageTitle} - ${suffix}`;
  }
}

/**
 * Applies favicon + theme-color. First paint = Estimator on estimator host.
 * Re-runs when userHint arrives (Planner product → logo Planner).
 */
export function BrandHead({ userHint, pageTitle }: Props) {
  useEffect(() => {
    const first = defaultBrandForHost();
    applyBrandToDocument(first, pageTitle);
  }, [pageTitle]);

  useEffect(() => {
    if (!userHint) return;
    const brand = resolveBrand(userHint);
    applyBrandToDocument(brand, pageTitle);
  }, [userHint, pageTitle]);

  return null;
}
