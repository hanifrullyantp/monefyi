/** Shared with app/js/config.js — keep admin list in sync. */
export const MONEFYI_CONFIG = {
  supabaseUrl: 'https://zzwqfmdyncxbolestkqp.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDI3OTQsImV4cCI6MjA4MTkxODc5NH0.qtvqzDicRmIixFh3A46ExuitpAXDWaYHmB7NVBxsc7w',
  adminEmails: ['admin@asfin.app', 'hanif.rullyant@gmail.com'],
} as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return MONEFYI_CONFIG.adminEmails.some((entry) => entry.toLowerCase() === normalized);
}
