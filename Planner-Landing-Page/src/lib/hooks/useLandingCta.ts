"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUiStore } from "@/lib/store/uiStore";
import { plannerAppPath } from "@/lib/config/plannerApp";
import {
  getUpsellReason,
  isPlannerFeatureLocked,
  ownsEstimator,
  type PlannerLockedFeature,
} from "@/lib/permissions";
import type { User } from "@/lib/store/authStore";

export type LandingCtaVariant = "primary" | "outline" | "dark";

export function useLandingCta() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useUiStore((s) => s.setLoginModalOpen);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const label = !isAuthenticated
    ? "Login"
    : ownsEstimator(user)
      ? "Masuk Dashboard"
      : "Login";

  const handleCtaClick = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    if (ownsEstimator(user)) {
      window.location.href = "/dashboard";
    }
  };

  return {
    hydrated,
    isAuthenticated,
    user,
    label,
    handleCtaClick,
    openLogin: () => setLoginModalOpen(true),
  };
}

export function openUpsell(message?: string) {
  useUiStore.getState().openUpsell(message);
}

/** Cek fitur Planner yang dilock; buka UpsellModal jika perlu. */
export function tryLockedPlannerFeature(feature: PlannerLockedFeature, user: User | null): boolean {
  if (!isPlannerFeatureLocked(user, feature)) return true;
  openUpsell(getUpsellReason(user, "locked_feature", feature));
  return false;
}
