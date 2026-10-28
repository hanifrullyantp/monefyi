import type { ComponentType } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { RelatableSection } from "@/components/landing/RelatableSection";
import { ThreeStepSection } from "@/components/landing/ThreeStepSection";
import { CalculatorSection } from "@/components/landing/CalculatorSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { GuaranteeSection } from "@/components/landing/GuaranteeSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FooterSection } from "@/components/landing/FooterSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";

/**
 * Fase 2 order — one message per section.
 * Urgency/scarcity & irrelevant freeTools removed from default order.
 */
export const LANDING_SECTIONS = [
  { key: "hero", label: "Hero", desc: "Headline + CTA" },
  { key: "trustBadges", label: "Kepercayaan", desc: "Bukti sosial & garansi singkat" },
  { key: "relatable", label: "Masalah", desc: "Pain points" },
  { key: "threeStep", label: "Cara kerja", desc: "Saring → Hitung → Closing" },
  { key: "calculator", label: "Kalkulator", desc: "Cek efisiensi closing" },
  { key: "testimonial", label: "Testimoni", desc: "Cerita pengguna" },
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
  "features",
  "calculator",
  "testimonial",
  "pricing",
  "guarantee",
  "faq",
  "finalCta",
  "footer",
];

export function resolveSectionOrder(savedOrder: string[] | undefined): LandingSectionKey[] {
  const known = new Set(LANDING_SECTIONS.map((s) => s.key));
  const base = savedOrder?.length
    ? savedOrder.filter((k): k is LandingSectionKey => known.has(k as LandingSectionKey))
    : [];
  if (!base.length) return [...DEFAULT_SECTION_ORDER];
  const merged = [...base];
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!merged.includes(key)) merged.push(key);
  }
  return merged;
}

export function getSectionComponent(key: string): ComponentType | null {
  return SECTION_COMPONENTS[key as LandingSectionKey] ?? null;
}

export function getSectionMeta(key: string) {
  return LANDING_SECTIONS.find((s) => s.key === key);
}
