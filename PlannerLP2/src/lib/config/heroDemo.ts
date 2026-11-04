import type { HeroContent, HeroDemoVariant } from "@/lib/types/content";
import { defaultContent } from "@/data/defaultContent";

export type { HeroDemoVariant };

const VALID: HeroDemoVariant[] = ["animation", "live_embed"];

function parseEnvVariant(): HeroDemoVariant | null {
  const raw = (process.env.NEXT_PUBLIC_HERO_DEMO_VARIANT ?? "").trim().toLowerCase();
  if (raw === "animation" || raw === "live_embed") return raw;
  if (raw === "live" || raw === "iframe" || raw === "embed") return "live_embed";
  return null;
}

/** Hero kanan: animasi HTML (default) atau demo embed iframe (legacy). */
export function resolveHeroDemoVariant(hero?: Pick<HeroContent, "heroDemoVariant">): HeroDemoVariant {
  const fromEnv = parseEnvVariant();
  if (fromEnv) return fromEnv;
  const fromCms = hero?.heroDemoVariant ?? defaultContent.hero.heroDemoVariant;
  if (fromCms && VALID.includes(fromCms)) return fromCms;
  return "animation";
}

export const HERO_DEMO_VARIANT_LABELS: Record<HeroDemoVariant, string> = {
  animation: "Animasi alur (default)",
  live_embed: "Demo interaktif (iframe aplikasi)",
};
