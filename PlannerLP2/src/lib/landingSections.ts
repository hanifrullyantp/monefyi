import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/HeroSection";

const TrustBadges = dynamic(() => import("@/components/landing/TrustBadges").then((m) => m.TrustBadges));
const RelatableSection = dynamic(() => import("@/components/landing/RelatableSection").then((m) => m.RelatableSection));
const ThreeStepSection = dynamic(() => import("@/components/landing/ThreeStepSection").then((m) => m.ThreeStepSection));
const CalculatorSection = dynamic(() => import("@/components/landing/CalculatorSection").then((m) => m.CalculatorSection));
const TestimonialSection = dynamic(() => import("@/components/landing/TestimonialSection").then((m) => m.TestimonialSection));
const PricingSection = dynamic(() => import("@/components/landing/PricingSection").then((m) => m.PricingSection));
const GuaranteeSection = dynamic(() => import("@/components/landing/GuaranteeSection").then((m) => m.GuaranteeSection));
const FAQSection = dynamic(() => import("@/components/landing/FAQSection").then((m) => m.FAQSection));
const FinalCTASection = dynamic(() => import("@/components/landing/FinalCTASection").then((m) => m.FinalCTASection));
const FooterSection = dynamic(() => import("@/components/landing/FooterSection").then((m) => m.FooterSection));
const FeaturesSection = dynamic(() => import("@/components/landing/FeaturesSection").then((m) => m.FeaturesSection));
const ComparisonSection = dynamic(() => import("@/components/landing/ComparisonSection").then((m) => m.ComparisonSection));
const FreeToolsSection = dynamic(() => import("@/components/landing/FreeToolsSection").then((m) => m.FreeToolsSection));
const UrgencySection = dynamic(() => import("@/components/landing/UrgencySection").then((m) => m.UrgencySection));

/** Landing sections are configurable through CMS and default to the full conversion flow. */
export const LANDING_SECTIONS = [
  { key: "hero", label: "Hero", desc: "Headline + CTA" },
  { key: "trustBadges", label: "Kepercayaan", desc: "Bukti sosial & garansi singkat" },
  { key: "relatable", label: "Masalah", desc: "Pain points" },
  { key: "threeStep", label: "Cara kerja", desc: "Saring → Hitung → Closing" },
  { key: "calculator", label: "Kalkulator", desc: "Cek efisiensi closing" },
  { key: "testimonial", label: "Testimoni", desc: "Cerita pengguna" },
  { key: "freeTools", label: "Bonus Tools", desc: "Bonus aplikasi gratis" },
  { key: "urgency", label: "Promo Launch", desc: "Harga launch dan bonus terbatas" },
  { key: "pricing", label: "Harga", desc: "Gratis / Standard / Pro" },
  { key: "guarantee", label: "Garansi", desc: "7 hari uang kembali" },
  { key: "faq", label: "FAQ", desc: "Keberatan nyata" },
  { key: "finalCta", label: "CTA penutup", desc: "Closing section" },
  { key: "footer", label: "Footer", desc: "Link & kontak" },
  // Optional / de-emphasized (hidden by default via sectionVisibility)
  { key: "features", label: "Fitur", desc: "Grid fitur" },
  { key: "comparison", label: "Perbandingan", desc: "vs Excel/Trello" },
] as const;

export type LandingSectionKey = (typeof LANDING_SECTIONS)[number]["key"];

const SECTION_COMPONENTS: Record<LandingSectionKey, ComponentType> = {
  hero: HeroSection,
  trustBadges: TrustBadges,
  relatable: RelatableSection,
  threeStep: ThreeStepSection,
  calculator: CalculatorSection,
  testimonial: TestimonialSection,
  freeTools: FreeToolsSection,
  urgency: UrgencySection,
  pricing: PricingSection,
  guarantee: GuaranteeSection,
  faq: FAQSection,
  finalCta: FinalCTASection,
  footer: FooterSection,
  features: FeaturesSection,
  comparison: ComparisonSection,
};

/** Default order — only core conversion sections */
export const DEFAULT_SECTION_ORDER: LandingSectionKey[] = [
  "hero",
  "trustBadges",
  "relatable",
  "threeStep",
  "comparison",
  "features",
  "calculator",
  "testimonial",
  "freeTools",
  "urgency",
  "pricing",
  "faq",
  "finalCta",
  "footer",
];

export function resolveSectionOrder(savedOrder: string[] | undefined): LandingSectionKey[] {
  const known = new Set(LANDING_SECTIONS.map((s) => s.key));
  const base = savedOrder?.length
    ? savedOrder.filter((k): k is LandingSectionKey => known.has(k as LandingSectionKey))
    : [];
  const merged = base.length ? [...base] : [...DEFAULT_SECTION_ORDER];
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!merged.includes(key)) merged.push(key);
  }

  // Keep the bonus and launch-promo sections immediately before pricing,
  // including when an older custom section order was saved in the CMS.
  const beforePricing: LandingSectionKey[] = ["freeTools", "urgency"];
  const orderWithoutPromo = merged.filter((key) => !beforePricing.includes(key));
  const pricingIndex = orderWithoutPromo.indexOf("pricing");
  orderWithoutPromo.splice(pricingIndex < 0 ? orderWithoutPromo.length : pricingIndex, 0, ...beforePricing);
  return orderWithoutPromo;
}

export function getSectionComponent(key: string): ComponentType | null {
  return SECTION_COMPONENTS[key as LandingSectionKey] ?? null;
}

export function getSectionMeta(key: string) {
  return LANDING_SECTIONS.find((s) => s.key === key);
}
