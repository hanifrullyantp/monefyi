"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { ownsEstimator } from "@/lib/permissions";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

const ESTIMATOR_PRO_PLAN_ID = "estimator-pro";

export function FloatingCTA() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { startCheckout } = useLandingCta();

  const [bonusSectionSeen, setBonusSectionSeen] = useState(false);
  const [pricingVisible, setPricingVisible] = useState(false);

  const hasEstimator = ownsEstimator(user);
  const canShow =
    hydrated &&
    !hasEstimator &&
    !pricingVisible &&
    (isAuthenticated || bonusSectionSeen);

  useEffect(() => {
    const bonusEl = document.getElementById("bonus");
    const pricingEl = document.getElementById("harga");

    const bonusObserver = bonusEl
      ? new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) setBonusSectionSeen(true);
          },
          { threshold: 0.25 },
        )
      : null;

    const pricingObserver = pricingEl
      ? new IntersectionObserver(
          ([entry]) => {
            setPricingVisible(Boolean(entry?.isIntersecting));
          },
          { threshold: 0.15 },
        )
      : null;

    if (bonusEl) bonusObserver?.observe(bonusEl);
    if (pricingEl) pricingObserver?.observe(pricingEl);

    return () => {
      bonusObserver?.disconnect();
      pricingObserver?.disconnect();
    };
  }, []);

  const handleClick = () => {
    void startCheckout(ESTIMATOR_PRO_PLAN_ID);
  };

  return (
    <AnimatePresence>
      {canShow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md sm:w-auto sm:px-0"
        >
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full sm:w-auto items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-3 font-semibold shadow-2xl shadow-emerald-600/40 transition-all text-sm sm:text-base"
          >
            Ambil Estimator Lifetime — Rp 199.000
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
