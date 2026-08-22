import type { ComponentType } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { ThreeStepSection } from "@/components/landing/ThreeStepSection";
import { TransitionSection } from "@/components/landing/TransitionSection";
import { RelatableSection } from "@/components/landing/RelatableSection";
import { CalculatorSection } from "@/components/landing/CalculatorSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { TransformationSection } from "@/components/landing/TransformationSection";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { FreeToolsSection } from "@/components/landing/FreeToolsSection";
import { UrgencySection } from "@/components/landing/UrgencySection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { GuaranteeSection } from "@/components/landing/GuaranteeSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FooterSection } from "@/components/landing/FooterSection";

export const LANDING_SECTIONS = [
  { key: "hero", label: "Hero Section", desc: "Headline, subheadline, CTA" },
  { key: "threeStep", label: "3 Step", desc: "Konten 3 langkah closing" },
  { key: "transition", label: "Transisi", desc: "Paragraf penghubung" },
  { key: "relatable", label: "Relatable Checklist", desc: "Daftar masalah" },
  { key: "calculator", label: "Kalkulator", desc: "Simulasi ROI / waktu" },
  { key: "features", label: "Fitur", desc: "Grid 12 fitur" },
  { key: "transformation", label: "Transformasi", desc: "5 skenario perbandingan" },
  { key: "testimonial", label: "Testimoni", desc: "Cerita & quote" },
  { key: "comparison", label: "Perbandingan", desc: "Manual vs digital" },
  { key: "freeTools", label: "Bonus Tools", desc: "Bonus aplikasi gratis" },
  { key: "urgency", label: "Urgensi", desc: "Countdown & scarcity" },
  { key: "pricing", label: "Harga", desc: "3 paket pricing" },
  { key: "trustBadges", label: "Trust Badges", desc: "Logo & social proof" },
  { key: "guarantee", label: "Garansi", desc: "7 hari uang kembali" },
  { key: "faq", label: "FAQ", desc: "Pertanyaan yang sering ditanya" },
  { key: "finalCta", label: "Final CTA", desc: "Section CTA penutup" },
  { key: "footer", label: "Footer", desc: "Link & kontak" },
] as const;

export type LandingSectionKey = (typeof LANDING_SECTIONS)[number]["key"];

const SECTION_COMPONENTS: Record<LandingSectionKey, ComponentType> = {
  hero: HeroSection,
  threeStep: ThreeStepSection,
  transition: TransitionSection,
  relatable: RelatableSection,
  calculator: CalculatorSection,
  features: FeaturesSection,
  transformation: TransformationSection,
  testimonial: TestimonialSection,
  comparison: ComparisonSection,
  freeTools: FreeToolsSection,
  urgency: UrgencySection,
  pricing: PricingSection,
  trustBadges: TrustBadges,
  guarantee: GuaranteeSection,
  faq: FAQSection,
  finalCta: FinalCTASection,
  footer: FooterSection,
};

/** Urutan section yang valid — gabung saved order + section baru di default. */
export function resolveSectionOrder(savedOrder: string[] | undefined): LandingSectionKey[] {
  const known = new Set(LANDING_SECTIONS.map((s) => s.key));
  const defaultOrder = LANDING_SECTIONS.map((s) => s.key);
  const base = savedOrder?.length ? savedOrder.filter((k): k is LandingSectionKey => known.has(k as LandingSectionKey)) : [];
  const merged = [...base];
  for (const key of defaultOrder) {
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
