/**
 * Akses modul RAB: hanya super admin.
 * CATATAN: pemeriksaan ini hanya di sisi klien (UI). Penegakan sebenarnya WAJIB
 * di server host (sesi + RLS/403) — lihat INTEGRATION.md bagian "Akses super admin".
 */
export const RAB_SUPERADMIN_EMAILS: readonly string[] = ["hanif.rullyant@gmail.com"];

export function isRabSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return RAB_SUPERADMIN_EMAILS.includes(email.trim().toLowerCase());
}
