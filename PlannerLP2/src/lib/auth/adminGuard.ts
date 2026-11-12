/**
 * Gerbang autentikasi untuk semua route Ads.
 * - Admin: header Authorization Bearer berisi access token Supabase. Token diverifikasi ke Supabase Auth,
 *   lalu email-nya harus ada di ADMIN_EMAILS.
 * - Cron/internal: header x-engine-secret harus sama dengan ENGINE_CRON_SECRET (hanya jika route mengizinkan).
 * Fail closed: jika konfigurasi tidak lengkap, akses ditolak.
 */

import { isAdminEmail } from "@/lib/config/admin";

export type EngineAuthResult =
  | { ok: true; via: "cron" | "admin"; email?: string }
  | { ok: false; status: number; error: string };

export async function requireEngineAuth(
  req: { headers: { get(name: string): string | null } },
  opts: { allowCron?: boolean } = {},
  fetchImpl: typeof fetch = fetch
): Promise<EngineAuthResult> {
  const secret = process.env.ENGINE_CRON_SECRET;
  if (opts.allowCron && secret && req.headers.get("x-engine-secret") === secret) {
    return { ok: true, via: "cron" };
  }

  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "Login admin diperlukan." };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Konfigurasi Supabase belum lengkap di server." };
  }

  let email = "";
  try {
    const res = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    } as RequestInit);
    if (!res.ok) return { ok: false, status: 401, error: "Sesi tidak valid atau sudah kedaluwarsa." };
    const user = await res.json();
    email = String(user?.email || "").trim().toLowerCase();
  } catch {
    return { ok: false, status: 503, error: "Gagal memverifikasi sesi. Coba lagi." };
  }

  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAllowed = !!email && (admins.includes(email) || isAdminEmail(email));
  if (!isAllowed) {
    return { ok: false, status: 403, error: "Akun ini tidak punya akses admin Ads." };
  }
  return { ok: true, via: "admin", email };
}
