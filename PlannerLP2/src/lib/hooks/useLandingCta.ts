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
import { isAdminEmail } from "@/lib/config/admin";
import { lynkProductLabel, planIdToLynkProduct, type LynkProduct } from "@/lib/checkout/products";
import { resolvePaymentProvider } from "@/lib/checkout/paymentProvider";
import { buildLynkCheckoutUrl, resolveLynkBaseUrl } from "@/lib/checkout/lynk";
import { mergeLynkCheckoutUrlOverrides } from "@/lib/checkout/lynkDefaults";
import { scrollToPricingSection } from "@/lib/navigation/scrollToPricing";
import {
  loadEstimatorLaunchPromoStatus,
  resolveStandardCheckoutAmount,
} from "@/lib/services/launchPromoService";
import { ensureOwnerOrg } from "@/lib/services/orgService";
import { useContentStore } from "@/lib/store/contentStore";
import { trackLynkCheckoutIntent, trackMetaAddToCart } from "@/lib/analytics/metaPixel";

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

  const lynkOverrides = mergeLynkCheckoutUrlOverrides(content.pricing.lynkCheckoutUrls);

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
    if (!product) {
      window.alert("Paket tidak dikenali. Pilih Standard atau Pro di halaman harga.");
      return;
    }

    const userEmail = user?.email?.toLowerCase().trim();
    const isHanifOrAdmin =
      userEmail === "hanif.rullyant@gmail.com" ||
      isAdminEmail(userEmail) ||
      (typeof window !== "undefined" && (
        localStorage.getItem("admin_override") === "true" ||
        localStorage.getItem("hanif_checkout") === "true" ||
        window.location.search.includes("admin=1") ||
        window.location.search.includes("hanif=1")
      ));

    const configuredProvider = content.pricing?.plannerPaymentProvider;
    const provider = resolvePaymentProvider(configuredProvider);
    const useMayar = provider === "mayar" || (isHanifOrAdmin && configuredProvider !== "lynk");

    if (useMayar) {
      const planQuery = planId.includes("pro") ? "pro" : "standard";
      trackMetaAddToCart({
        content_name: planQuery === "pro" ? "Estimator PRO" : "Estimator Standard",
        content_ids: [planId],
        value: planQuery === "pro" ? 199_000 : 93_000,
        currency: "IDR",
      });
      window.location.assign(`/checkout?plan=${planQuery}`);
      return;
    }

    const base = resolveLynkBaseUrl(product, lynkOverrides);
    if (!base) {
      window.alert(
        `Link checkout Lynk untuk ${lynkProductLabel(product)} belum tersedia. Hubungi admin — set URL di Admin → Pricing.`,
      );
      return;
    }

    try {
      const params = await checkoutParams();
      const checkoutAmount =
        product === "estimator_standard"
          ? resolveStandardCheckoutAmount(await loadEstimatorLaunchPromoStatus())
          : product === "estimator_pro"
            ? 199_000
            : undefined;
      trackLynkCheckoutIntent(product, {
        planId,
        value: checkoutAmount,
      });
      window.location.assign(
        buildLynkCheckoutUrl(product, { ...params, checkoutAmount }, lynkOverrides),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout gagal.";
      window.alert(msg);
    }
  };

  const startPlannerProCheckout = async () => {
    const product = "planner_pro" as const;
    const base = resolveLynkBaseUrl(product, lynkOverrides);
    if (!base) {
      window.alert("Link Lynk Planner Pro belum dikonfigurasi.");
      return;
    }
    const params = await checkoutParams(plannerPaymentReturnPath("app"));
    trackLynkCheckoutIntent(product);
    window.location.assign(buildLynkCheckoutUrl(product, params, lynkOverrides));
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

export { scrollToPricingSection };

export function openUpsell(_message?: string) {
  useUIStore.getState().setLoginModalOpen(true);
}

/** Cek fitur Planner yang dilock; buka UpsellModal jika perlu. */
export function tryLockedPlannerFeature(feature: PlannerLockedFeature, user: User | null): boolean {
  if (!isPlannerFeatureLocked(user, feature)) return true;
  openUpsell(getUpsellReason(user, "locked_feature", feature));
  return false;
}
