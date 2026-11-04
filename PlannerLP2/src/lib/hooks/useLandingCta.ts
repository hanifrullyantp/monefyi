"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";
import { plannerAppPath, plannerPaymentReturnPath } from "@/lib/config/plannerApp";
import {
  getUpsellReason,
  isPlannerFeatureLocked,
  type PlannerLockedFeature,
} from "@/lib/permissions";
import type { User } from "@/lib/store/authStore";
import { planIdToLynkProduct } from "@/lib/checkout/products";
import { redirectToPlannerCheckout } from "@/lib/checkout/plannerCheckout";
import {
  loadEstimatorLaunchPromoStatus,
  resolveStandardCheckoutAmount,
} from "@/lib/services/launchPromoService";
import { ensureOwnerOrg } from "@/lib/services/orgService";
import { useContentStore } from "@/lib/store/contentStore";

export type LandingCtaVariant = "primary" | "outline" | "dark";

export function useLandingCta() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const orgId = useAuthStore((s) => s.orgId);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const setLoginModalOpen = useUIStore((s) => s.setLoginModalOpen);
  const { content } = useContentStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const lynkOverrides = content.pricing.lynkCheckoutUrls;
  const paymentProvider = content.pricing.plannerPaymentProvider;

  const checkoutParams = async (returnUrl?: string) => {
    if (!isAuthenticated || !user) {
      return returnUrl ? { returnUrl } : {};
    }
    let resolvedOrgId = orgId ?? user.orgId ?? null;
    if (!resolvedOrgId) {
      resolvedOrgId = await ensureOwnerOrg(user.id, user.name);
      await refreshUser();
      resolvedOrgId = resolvedOrgId ?? useAuthStore.getState().orgId;
    }
    return {
      orgId: resolvedOrgId ?? undefined,
      userId: user.id,
      email: user.email,
      ...(returnUrl ? { returnUrl } : {}),
    };
  };

  const startCheckout = async (planId: string) => {
    const product = planIdToLynkProduct(planId);
    if (!product) return;
    const params = await checkoutParams();
    const checkoutAmount =
      product === "estimator_standard"
        ? resolveStandardCheckoutAmount(await loadEstimatorLaunchPromoStatus())
        : undefined;
    await redirectToPlannerCheckout(
      product,
      { ...params, checkoutAmount },
      { lynkUrlOverrides: lynkOverrides, paymentProvider, checkoutAmount },
    );
  };

  const startPlannerProCheckout = async () => {
    await redirectToPlannerCheckout(
      "planner_pro",
      await checkoutParams(plannerPaymentReturnPath("app")),
      { lynkUrlOverrides: lynkOverrides, paymentProvider },
    );
  };

  const label = !isAuthenticated ? "Login" : "Masuk";

  const handleCtaClick = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }
    window.location.href = plannerAppPath("/app");
  };

  return {
    hydrated,
    isAuthenticated,
    user,
    label,
    handleCtaClick,
    startCheckout,
    startPlannerProCheckout,
    openLogin: () => setLoginModalOpen(true),
  };
}

export function openUpsell(_message?: string) {
  useUIStore.getState().setLoginModalOpen(true);
}

/** Cek fitur Planner yang dilock; buka UpsellModal jika perlu. */
export function tryLockedPlannerFeature(feature: PlannerLockedFeature, user: User | null): boolean {
  if (!isPlannerFeatureLocked(user, feature)) return true;
  openUpsell(getUpsellReason(user, "locked_feature", feature));
  return false;
}
