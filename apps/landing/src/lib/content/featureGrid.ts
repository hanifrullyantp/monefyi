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
  const defaults = defaultContent.features.features.filter((feature) =>
    CORE_FEATURE_TITLES.includes(feature.title as (typeof CORE_FEATURE_TITLES)[number]),
  );
  const byTitle = new Map(items.map((feature) => [feature.title, feature]));

  return CORE_FEATURE_TITLES.map((title) => {
    const defaultFeature = defaults.find((feature) => feature.title === title);
    return (
      byTitle.get(title) ??
      items.find((feature) => feature.icon === defaultFeature?.icon) ??
      defaultFeature
    );
  }).filter((feature): feature is FeatureItem => Boolean(feature));
}
