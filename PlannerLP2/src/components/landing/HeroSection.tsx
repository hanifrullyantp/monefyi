"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, PlayCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { HeroLiveDemo } from "@/components/landing/HeroLiveDemo";
import { useAuthStore } from "@/lib/store/authStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";
import { navigateToPlannerApp, plannerAppPath } from "@/lib/config/plannerApp";
import { trackEvent } from "@/lib/analytics/events";
import {
  FREE_PLAN_ENABLED,
  getActiveHeroCopy,
  heroMicrocopy,
} from "@/lib/content/heroCopy";

export function HeroSection() {
  const copy = getActiveHeroCopy();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { openLogin } = useLandingCta();

  useEffect(() => {
    trackEvent("view_hero", { variant_id: copy.id });
  }, [copy.id]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  const primary = () => {
    trackEvent("hero_cta_primary_click", { variant_id: copy.id, source: "hero" });
    if (hydrated && isAuthenticated) {
      navigateToPlannerApp("/app/estimator");
      return;
    }
    if (FREE_PLAN_ENABLED) {
      trackEvent("free_signup", { source: "hero", variant_id: copy.id });
      window.location.href = plannerAppPath("/app/estimator?plan=free");
      return;
    }
    scrollTo("harga");
  };

  const demo = () => {
    trackEvent("hero_cta_demo_click", { variant_id: copy.id });
    scrollTo("tiga-step");
  };

  const login = () => {
    trackEvent("hero_login_link_click", { variant_id: copy.id });
    openLogin();
  };

  return (
    <section id="hero" className="lp-bleed relative overflow-visible bg-white">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ background: "var(--brand-gradient)" }} />
      <Container className="relative z-10 pt-6 pb-10 lg:pt-12 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(332px,40%)] gap-8 lg:gap-10 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left min-w-0">
            <p className="inline-flex items-center rounded-full bg-[var(--surface-soft)] border border-[var(--surface-alt)] px-3 py-1 text-[13px] font-semibold text-[var(--ink)] mb-3">
              {copy.eyebrow}
            </p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="font-extrabold text-[var(--ink)] tracking-tight"
              style={{
                fontSize: "var(--text-headline)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {copy.headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 text-[var(--muted)] text-[17px] md:text-[18px] leading-snug max-w-xl"
            >
              {copy.subheadline}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-4 grid gap-2 text-[15px] md:text-[16px] text-[var(--ink)] text-left w-full max-w-md"
            >
              {copy.points.map((t) => (
                <li key={t} className="flex gap-2 leading-snug">
                  <span className="text-[var(--brand-400)] font-bold shrink-0" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-col lg:flex-row gap-3 w-full lg:w-auto max-w-full"
            >
              <button
                type="button"
                onClick={primary}
                className="lp-btn-hero btn-brand w-full lg:w-auto"
              >
                {copy.ctaPrimary}
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={demo}
                className="lp-btn-hero border-2 border-[var(--surface-alt)] text-[var(--ink)] hover:border-[var(--brand-600)] w-full lg:w-auto bg-white"
              >
                <PlayCircle className="w-4 h-4 text-[var(--brand-600)] shrink-0" />
                {copy.ctaSecondary}
              </button>
            </motion.div>

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

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center min-w-0 overflow-visible"
          >
            <p className="text-[12px] font-semibold text-[var(--muted)] mb-3 text-center max-w-[332px]">
              Demo langsung — scroll & tambah rincian
            </p>
            <HeroLiveDemo />
            <button
              type="button"
              onClick={demo}
              className="mt-5 flex items-center gap-1 text-xs font-bold text-[var(--brand-600)]"
            >
              <ArrowDown className="w-4 h-4" /> Cara kerjanya
            </button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
