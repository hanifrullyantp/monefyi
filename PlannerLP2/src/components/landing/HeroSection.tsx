"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, PlayCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { EditableText } from "@/components/shared/EditableText";
import { EditableHeroQuickPoint } from "@/components/shared/EditableHeroQuickPoint";
import { AnimatedHeadline } from "@/components/landing/AnimatedHeadline";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { resolveHeroDemoVariant } from "@/lib/config/heroDemo";
import { useContentStore } from "@/lib/store/contentStore";
import { useAuthStore } from "@/lib/store/authStore";
import { canClaimBonusApps } from "@/lib/permissions";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import Link from "next/link";
import { navigateToPlannerApp, plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";
import { defaultContent } from "@/data/defaultContent";
import {
  FREE_PLAN_ENABLED,
  getActiveHeroCopy,
  heroMicrocopy,
} from "@/lib/content/heroCopy";

function orFallback(cms: string, fallback: string): string {
  return cms.trim() || fallback;
}

export function HeroSection() {
  const copy = getActiveHeroCopy();
  const { content } = useContentStore();
  const { hero } = content;
  const headlineConfig = hero.headlineAnimated ?? defaultContent.hero.headlineAnimated;
  const hasAnimatedHeadline = headlineConfig.rotatingWords.some((w) => w.trim());

  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const canClaimBonus = Boolean(hydrated && isAuthenticated && canClaimBonusApps(user));
  const { openLogin } = useLandingCta();
  const [demoPulse, setDemoPulse] = useState(0);
  const pulseLock = useRef(false);

  const heroDemoVariant = resolveHeroDemoVariant(hero);
  const pointCount = Math.max(
    hero.quickPoints.length,
    copy.points.length,
    3,
  );

  useEffect(() => {
    trackEvent("view_hero", { variant_id: copy.id });
  }, [copy.id]);

  const headerOffset = () => {
    const root = getComputedStyle(document.documentElement);
    const isLg = window.matchMedia("(min-width: 1024px)").matches;
    const raw = parseFloat(
      root.getPropertyValue(isLg ? "--header-h-desktop" : "--header-h-mobile"),
    );
    return (Number.isFinite(raw) ? raw : isLg ? 64 : 56) + 8;
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const pulseDemo = () => {
    if (pulseLock.current) return;
    pulseLock.current = true;
    setDemoPulse((n) => n + 1);
    window.setTimeout(() => {
      pulseLock.current = false;
    }, 1200);
  };

  const focusHeroDemo = () => {
    const el = document.getElementById("hero-demo");
    if (!el) {
      scrollTo("tiga-step");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(pulseDemo, 200);
  };

  const primary = () => {
    trackEvent("hero_cta_primary_click", { variant_id: copy.id, source: "hero" });
    window.location.href = "/checkout?plan=free";
  };

  const demo = () => {
    trackEvent("hero_cta_demo_click", { variant_id: copy.id });
    focusHeroDemo();
  };

  const howItWorks = () => {
    scrollTo("tiga-step");
  };

  const login = () => {
    trackEvent("hero_login_link_click", { variant_id: copy.id });
    openLogin();
  };

  return (
    <section id="hero" className="lp-bleed relative overflow-visible bg-white">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: "var(--brand-gradient)" }} />
      <Container className="relative z-10 pt-8 pb-12 lg:min-h-[calc(100svh-var(--header-h-desktop))] lg:py-16 lg:flex lg:items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8 lg:gap-12 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left min-w-0">
            <p className="inline-flex items-center rounded-full bg-[var(--surface-soft)] border border-[var(--surface-alt)] px-3 py-1 text-[13px] font-semibold text-[var(--ink)] mb-3">
              <EditableText
                section="hero"
                field="badge"
                value={orFallback(hero.badge, copy.eyebrow)}
              />
            </p>

            <h1
              className="font-extrabold text-[var(--ink)] tracking-tight"
              style={{
                fontSize: "var(--text-headline)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {hasAnimatedHeadline ? (
                <AnimatedHeadline config={headlineConfig} />
              ) : (
                <EditableText
                  section="hero"
                  field="headline"
                  value={orFallback(hero.headline, copy.headline)}
                  multiline
                />
              )}
            </h1>

            <p
              className="mt-3 text-[var(--muted)] text-[17px] md:text-[18px] leading-snug max-w-xl"
            >
              <EditableText
                section="hero"
                field="subheadline"
                value={orFallback(hero.subheadline, copy.subheadline)}
                multiline
              />
            </p>

            <ul
              className="mt-4 grid gap-2 text-[15px] md:text-[16px] text-[var(--ink)] text-left w-full max-w-md"
            >
              {Array.from({ length: pointCount }, (_, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-[var(--brand-400)] font-bold shrink-0" aria-hidden>
                    ✓
                  </span>
                  <EditableHeroQuickPoint
                    index={i}
                    value={hero.quickPoints[i] ?? ""}
                    fallback={copy.points[i] ?? ""}
                  />
                </li>
              ))}
            </ul>

            <div
              className="mt-6 flex flex-col lg:flex-row gap-3 w-full lg:w-auto max-w-full"
            >
              {hydrated && isAuthenticated ? (
                <>
                  <a
                    href={plannerAppPath("/app")}
                    className="lp-btn-hero btn-brand w-full lg:w-auto"
                  >
                    <ArrowRight className="w-4 h-4 shrink-0" /> Masuk ke Aplikasi
                  </a>
                  {canClaimBonus && (
                    <Link
                      href="/bonus"
                      className="lp-btn-hero border-2 border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500 w-full lg:w-auto"
                    >
                      <ArrowRight className="w-4 h-4 shrink-0" /> Klaim Bonus
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={primary}
                    className="lp-btn-hero btn-brand w-full lg:w-auto"
                  >
                    <EditableText
                      section="hero"
                      field="ctaPrimary"
                      value={orFallback(hero.ctaPrimary, copy.ctaPrimary)}
                    />
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={demo}
                    className="lp-btn-hero border-2 border-[var(--surface-alt)] text-[var(--ink)] hover:border-[var(--brand-600)] w-full lg:w-auto bg-white"
                  >
                    <PlayCircle className="w-4 h-4 text-[var(--brand-600)] shrink-0" />
                    <EditableText
                      section="hero"
                      field="ctaSecondary"
                      value={orFallback(hero.ctaSecondary, copy.ctaSecondary)}
                    />
                  </button>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <button
                type="button"
                onClick={login}
                className="mt-3 text-[14px] font-semibold text-[var(--brand-600)] hover:underline"
              >
                {copy.loginLink}
              </button>
            )}
            <p className="mt-2 text-[14px] text-[var(--muted)]">{heroMicrocopy()}</p>
          </div>

          <div
            className="flex flex-col items-center min-w-0 overflow-visible"
          >
            <p className="text-[12px] font-semibold text-[var(--muted)] mb-3 text-center max-w-[min(100%,460px)]">
              {heroDemoVariant === "live_embed"
                ? "Demo langsung — scroll & tambah rincian"
                : "Demo alur — dari daftar estimasi hingga kirim WA"}
            </p>
            <HeroDemo pulseToken={demoPulse} />
            <button
              type="button"
              onClick={howItWorks}
              className="mt-5 flex items-center gap-1 text-xs font-bold text-[var(--brand-600)]"
            >
              <ArrowDown className="w-4 h-4" /> Cara kerjanya
            </button>
          </div>
        </div>
      </Container>
    </section>
  );
}
