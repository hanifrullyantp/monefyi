/**
 * Konfigurasi Supabase & URL Monefyi — mirror app/js/config.js
 * Override via NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

export const MONEFYI_APP_URL = 'https://monefyi.com/app/';
export const MONEFYI_HOME_URL = 'https://monefyi.com';
export const MONEFYI_TRIAL_URL = 'https://monefyi.com/#pricing';
/** Etalase bonus (Planner LP / estimator domain). */
export const MONEFYI_BONUS_HUB_URL =
  process.env.NEXT_PUBLIC_MONEFYI_BONUS_HUB_URL || 'https://estimator.froyek.com/bonus';

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi.');
  }
  return { url, anonKey };
}

export type MonefyiProduct = 'monefyi' | 'planner' | 'stay';
