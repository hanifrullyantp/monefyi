import type { SiteContent } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";
import { resolveSectionOrder } from "@/lib/landingSections";
import { getSupabaseClient } from "@/lib/supabase/client";
import { resolveSupabaseEnv } from "@/lib/supabase/env";

export const LANDING_SLUG = "estimator-lp";
export const LANDING_CACHE_KEY = "monefyi_estimator_lp_cache_v1";

export type LandingContentFetchResult = {
  content: SiteContent;
  updatedAt: string | null;
  fromDatabase: boolean;
};

function landingFunctionHint(status: number): string {
  if (status === 404 || status === 502) {
    return " Pastikan edge function monefyi-landing-config sudah di-deploy.";
  }
  return "";
}

/** Merge remote payload dengan default — field yang hilang diisi default. */
export function mergeSiteContent(raw: Partial<SiteContent> | null | undefined): SiteContent {
  if (!raw || typeof raw !== "object") return { ...defaultContent };
  return {
    ...defaultContent,
    ...raw,
    navbar: { ...defaultContent.navbar, ...(raw.navbar || {}) },
    hero: { ...defaultContent.hero, ...(raw.hero || {}) },
    pricing: { ...defaultContent.pricing, ...(raw.pricing || {}) },
    footer: { ...defaultContent.footer, ...(raw.footer || {}) },
    sectionOrder: resolveSectionOrder(raw.sectionOrder),
    sectionVisibility: {
      ...defaultContent.sectionVisibility,
      ...(raw.sectionVisibility || {}),
    },
  };
}

export function readCachedContent(): SiteContent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LANDING_CACHE_KEY);
    if (!raw) return null;
    return mergeSiteContent(JSON.parse(raw) as Partial<SiteContent>);
  } catch {
    return null;
  }
}

export function writeCachedContent(content: SiteContent): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANDING_CACHE_KEY, JSON.stringify(content));
}

export async function fetchLandingContent(
  slug = LANDING_SLUG,
): Promise<LandingContentFetchResult | null> {
  const { url, anonKey } = resolveSupabaseEnv();
  if (!url || !anonKey) {
    const cached = readCachedContent();
    return cached
      ? { content: cached, updatedAt: null, fromDatabase: false }
      : null;
  }

  const res = await fetch(
    `${url.replace(/\/$/, "")}/functions/v1/monefyi-landing-config?slug=${encodeURIComponent(slug)}`,
    {
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[landing] GET failed HTTP ${res.status}.${landingFunctionHint(res.status)}`);
    }
    const cached = readCachedContent();
    return cached
      ? { content: cached, updatedAt: null, fromDatabase: false }
      : null;
  }

  const data = (await res.json()) as {
    content?: Partial<SiteContent> | null;
    updated_at?: string | null;
  };

  if (!data.content || Object.keys(data.content).length === 0) {
    return null;
  }

  const merged = mergeSiteContent(data.content);
  writeCachedContent(merged);
  return {
    content: merged,
    updatedAt: data.updated_at ?? null,
    fromDatabase: true,
  };
}

export async function saveLandingContent(
  content: SiteContent,
  slug = LANDING_SLUG,
): Promise<{ updatedAt: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    writeCachedContent(content);
    throw new Error(
      "Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY). Konten hanya tersimpan lokal.",
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error("Login Supabase diperlukan untuk menyimpan ke database.");
  }

  const { data, error } = await supabase.functions.invoke("monefyi-landing-config", {
    body: { slug, content },
  });

  if (error) {
    const msg = error.message || "Edge function error";
    const hint = /not found|failed to send|404|502/i.test(msg) ? landingFunctionHint(502) : "";
    throw new Error(`${msg}${hint}`);
  }
  if (data?.error) throw new Error(String(data.error));

  writeCachedContent(content);
  return { updatedAt: (data?.updated_at as string | undefined) ?? new Date().toISOString() };
}
