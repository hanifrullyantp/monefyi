import { getSupabaseClient } from "@/lib/supabase/client";
import type { LynkProduct } from "./products";
import { buildLynkCheckoutUrl, type LynkCheckoutParams } from "./lynk";
import { resolvePaymentProvider } from "./paymentProvider";

export async function redirectToPlannerCheckout(
  product: LynkProduct,
  params: LynkCheckoutParams,
  options?: {
    lynkUrlOverrides?: Partial<Record<LynkProduct, string>>;
    paymentProvider?: string | null;
    checkoutAmount?: number;
    upgradeFrom?: "estimator_standard";
    creditAmount?: number;
  },
): Promise<void> {
  const provider = resolvePaymentProvider(options?.paymentProvider);

  if (provider === "mayar") {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase belum dikonfigurasi untuk checkout Mayar");
    }
    if (!params.email?.includes("@")) {
      throw new Error("Login dulu — email diperlukan untuk checkout Mayar");
    }

    const { data, error } = await supabase.functions.invoke("planner-checkout", {
      body: {
        provider: "mayar",
        product,
        orgId: params.orgId,
        userId: params.userId,
        email: params.email,
        returnUrl: params.returnUrl,
        checkoutAmount: options?.checkoutAmount ?? params.checkoutAmount,
        upgradeFrom: options?.upgradeFrom,
        creditAmount: options?.creditAmount,
      },
    });

    if (error) throw new Error(error.message || "Checkout Mayar gagal");
    const redirectUrl = String((data as { redirectUrl?: string })?.redirectUrl ?? "").trim();
    if (!redirectUrl) {
      throw new Error(String((data as { error?: string })?.error ?? "URL checkout Mayar kosong"));
    }
    window.location.href = redirectUrl;
    return;
  }

  window.location.href = buildLynkCheckoutUrl(product, params, options?.lynkUrlOverrides);
}
