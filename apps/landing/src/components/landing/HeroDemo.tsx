"use client";

import { HeroLiveDemo } from "@/components/landing/HeroLiveDemo";
import { HeroEstimatorDemoAnimation } from "@/components/landing/HeroEstimatorDemoAnimation";
import { resolveHeroDemoVariant } from "@/lib/config/heroDemo";
import { useContentStore } from "@/lib/store/contentStore";

type Props = {
  pulseToken?: number;
};

/** Kolom demo kanan hero — animasi (default) atau iframe live (legacy). */
export function HeroDemo({ pulseToken = 0 }: Props) {
  const hero = useContentStore((s) => s.content.hero);
  const variant = resolveHeroDemoVariant(hero);

  if (variant === "live_embed") {
    return <HeroLiveDemo pulseToken={pulseToken} />;
  }

  return <HeroEstimatorDemoAnimation pulseToken={pulseToken} />;
}
