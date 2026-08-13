/**
 * Konfigurasi Supabase & URL Monefyi — mirror app/js/config.js
 * Override via NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

export const MONEFYI_APP_URL = 'https://monefyi.com/app/';
export const MONEFYI_HOME_URL = 'https://monefyi.com';
export const MONEFYI_TRIAL_URL = 'https://monefyi.com/#pricing';

export function getSupabaseConfig() {
  return {
    url:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://zzwqfmdyncxbolestkqp.supabase.co',
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI3OTQsImV4cCI6MjA4MTkxODc5NH0.qtvqzDicRmIixFh3A46ExuitpAXDWaYHmB7NVBxsc7w',
  };
}

export type MonefyiProduct = 'monefyi' | 'planner' | 'stay';
