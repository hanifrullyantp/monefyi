import { supabase } from '../lib/supabase';
import {
  normalizeLaunchPromoStatus,
  type EstimatorLaunchPromoStatus,
} from '../lib/estimatorLaunchPromo';

let cached: { at: number; data: EstimatorLaunchPromoStatus | null } | null = null;
const CACHE_MS = 60_000;

/**
 * Status promo 100 org pertama (Estimator Standard Rp 93.000).
 */
export async function loadEstimatorLaunchPromoStatus(options?: {
  forceRefresh?: boolean;
}): Promise<EstimatorLaunchPromoStatus | null> {
  const now = Date.now();
  if (!options?.forceRefresh && cached && now - cached.at < CACHE_MS) {
    return cached.data;
  }

  const { data, error } = await supabase.rpc('get_estimator_standard_launch_promo');
  if (error) {
    console.error('get_estimator_standard_launch_promo:', error.message);
    return cached?.data ?? null;
  }

  const normalized = normalizeLaunchPromoStatus(data);
  cached = { at: now, data: normalized };
  return normalized;
}
