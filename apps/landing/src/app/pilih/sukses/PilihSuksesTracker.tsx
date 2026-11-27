"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackMetaPurchase } from "@/lib/analytics/metaPixel";

const PLAN_PRICES: Record<string, number> = {
  starter: 93000,
  standard: 93000,
  pro: 199000,
  enterprise: 299000,
};

export function PilihSuksesTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = (searchParams.get("plan") || "pro").toLowerCase();
    const orderId = searchParams.get("order_id") || searchParams.get("payment_id") || undefined;
    const rawAmt = Number(searchParams.get("amount") || 0);
    const amount = rawAmt > 0 ? rawAmt : PLAN_PRICES[plan] || 199000;

    const dedupKey = `froyek_pilih_purchase_${orderId || plan}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, "1");

    trackMetaPurchase({
      content_name: `Froyek ${plan}`,
      content_ids: [plan],
      value: amount,
      currency: "IDR",
      num_items: 1,
      order_id: orderId,
    });
  }, [searchParams]);

  return null;
}

