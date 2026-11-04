import { createClient } from "@supabase/supabase-js";

export type EstimatorLaunchPromoStatus = {
  used: number;
  limit: number;
  remaining: number;
  promoActive: boolean;
  promoPrice: number;
  listPrice: number;
};

function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalize(raw: unknown): EstimatorLaunchPromoStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const used = Number(o.used);
  const limit = Number(o.limit) || 100;
  if (!Number.isFinite(used)) return null;
  const promoPrice = Number(o.promoPrice) || 93_000;
  const listPrice = Number(o.listPrice) || 99_000;
  const remaining = Math.max(0, limit - used);
  const promoActive = o.promoActive === true || (o.promoActive !== false && used < limit);
  return { used, limit, remaining, promoActive, promoPrice, listPrice };
}

const FALLBACK: EstimatorLaunchPromoStatus = {
  used: 0,
  limit: 100,
  remaining: 100,
  promoActive: true,
  promoPrice: 93_000,
  listPrice: 99_000,
};

export async function loadEstimatorLaunchPromoStatus(): Promise<EstimatorLaunchPromoStatus> {
  const sb = supabaseAnon();
  if (!sb) return FALLBACK;
  const { data, error } = await sb.rpc("get_estimator_standard_launch_promo");
  if (error) {
    console.error("get_estimator_standard_launch_promo:", error.message);
    return FALLBACK;
  }
  return normalize(data) ?? FALLBACK;
}

export function resolveStandardCheckoutAmount(status: EstimatorLaunchPromoStatus): number {
  return status.promoActive ? status.promoPrice : status.listPrice;
}
