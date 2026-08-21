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
import { planIdToLynkProduct, type LynkProduct } from "@/lib/checkout/products";
import { redirectToLynkCheckout } from "@/lib/checkout/lynk";
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
  const setLoginModalOpen = useUiStore((s) => s.setLoginModalOpen);
  const setPendingCheckoutProduct = useUiStore((s) => s.setPendingCheckoutProduct);
  const { content } = useContentStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const lynkOverrides = content.pricing.lynkCheckoutUrls;

  const startCheckout = async (planId: string) => {
    const product = planIdToLynkProduct(planId);
    if (!product) return;

    if (!isAuthenticated || !user) {
      setPendingCheckoutProduct(product);
      setLoginModalOpen(true);
      return;
    }

    let resolvedOrgId = orgId ?? user.orgId ?? null;
    if (!resolvedOrgId) {
      resolvedOrgId = await ensureOwnerOrg(user.id, user.name);
      await refreshUser();
    }
    if (!resolvedOrgId) {
      setPendingCheckoutProduct(product);
      setLoginModalOpen(true);
      return;
    }

    redirectToLynkCheckout(
      product,
      {
        orgId: resolvedOrgId,
        userId: user.id,
        email: user.email,
      },
      lynkOverrides,
    );
  };

  const startPlannerProCheckout = async () => {
    const product: LynkProduct = "planner_pro";
    if (!isAuthenticated || !user) {
      setPendingCheckoutProduct(product);
      setLoginModalOpen(true);
      return;
    }
    let resolvedOrgId = orgId ?? user.orgId ?? null;
    if (!resolvedOrgId) {
      resolvedOrgId = await ensureOwnerOrg(user.id, user.name);
      await refreshUser();
    }
    if (!resolvedOrgId) {
      setPendingCheckoutProduct(product);
      setLoginModalOpen(true);
      return;
    }
    redirectToLynkCheckout(
      product,
      {
        orgId: resolvedOrgId,
        userId: user.id,
        email: user.email,
        returnUrl: plannerAppPath("?payment=success"),
      },
      lynkOverrides,
    );
  };

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
    startCheckout,
    startPlannerProCheckout,
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
