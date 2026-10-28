import type { FeatureItem } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";

/** Empat fitur inti — urutan tampil di LP (desktop 1 baris, mobile 2×2). */
export const CORE_FEATURE_TITLES = [
  "Smart Estimator",
  "Lead Screening WA",
  "PDF Penawaran Profesional",
  "PDF Tagihan & Kwitansi",
] as const;

export function pickCoreFeatures(items: FeatureItem[]): FeatureItem[] {
  const byTitle = new Map(items.map((f) => [f.title, f]));
  const picked = CORE_FEATURE_TITLES.map((title) => byTitle.get(title)).filter(
    (f): f is FeatureItem => Boolean(f),
  );
  if (picked.length === CORE_FEATURE_TITLES.length) return picked;
  const defaults = defaultContent.features.features.filter((f) =>
    CORE_FEATURE_TITLES.includes(f.title as (typeof CORE_FEATURE_TITLES)[number]),
  );
  const defaultMap = new Map(defaults.map((f) => [f.title, f]));
  return CORE_FEATURE_TITLES.map(
    (title) => byTitle.get(title) ?? defaultMap.get(title),
  ).filter((f): f is FeatureItem => Boolean(f));
}
