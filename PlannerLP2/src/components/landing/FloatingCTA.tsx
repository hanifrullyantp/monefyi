"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { ownsEstimator } from "@/lib/permissions";
import { trackEvent } from "@/lib/analytics/events";
import { plannerAppPath } from "@/lib/config/plannerApp";

/** Sticky bottom bar mobile — Coba Gratis setelah lewati hero */
export function FloatingCTA() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useLandingAdmin().isAdmin;

  const [pastHero, setPastHero] = useState(false);
  const [pricingVisible, setPricingVisible] = useState(false);

  const hasEstimator = ownsEstimator(user);
  const canShow =
    hydrated && !isAdmin && !hasEstimator && pastHero && !pricingVisible;

  useEffect(() => {
    const heroEl = document.getElementById("hero");
    const pricingEl = document.getElementById("harga");

    const heroObs = heroEl
      ? new IntersectionObserver(
          ([e]) => {
            if (e && !e.isIntersecting && e.boundingClientRect.top < 0) setPastHero(true);
            if (e?.isIntersecting) setPastHero(false);
          },
          { threshold: 0.05 },
        )
      : null;

    const priceObs = pricingEl
      ? new IntersectionObserver(([e]) => setPricingVisible(Boolean(e?.isIntersecting)), {
          threshold: 0.12,
        })
      : null;

    if (heroEl) heroObs?.observe(heroEl);
    if (pricingEl) priceObs?.observe(pricingEl);
    return () => {
      heroObs?.disconnect();
      priceObs?.disconnect();
    };
  }, []);

  const handleClick = () => {
    trackEvent("free_signup", { source: "sticky_cta" });
    if (isAuthenticated) {
      window.location.href = plannerAppPath("/app/estimator");
      return;
    }
    const el = document.getElementById("harga");
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {canShow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md md:hidden"
        >
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full items-center justify-center gap-2 btn-brand rounded-full shadow-2xl shadow-[var(--brand-600)]/40 text-sm"
          >
            Coba Gratis Sekarang
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
          <p className="text-center text-[10px] text-[var(--muted)] mt-1.5">Tanpa kartu · 3 estimasi gratis</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
