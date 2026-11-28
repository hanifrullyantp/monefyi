import type { SupabaseClient } from "@supabase/supabase-js";

export type CrmAdminAuthResult =
  | { ok: true; userId: string; email?: string }
  | { ok: false; status: 401 | 403; error: string };

export type PasswordValidationResult =
  | { ok: true; password: string }
  | { ok: false; status: 400; error: string };

const MIN_CRM_PASSWORD_LENGTH = 12;

/**
 * Verifikasi Bearer token via Supabase Auth (`auth.getUser`) lalu cek apakah user
 * memiliki peran `admin` pada tabel `public.profiles` (`role = 'admin'`).
 */
export async function verifyCrmAdmin(
  req: { headers: { get(name: string): string | null } },
  supabaseAdmin: Pick<SupabaseClient, "auth" | "from">,
): Promise<CrmAdminAuthResult> {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";

  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Token autentikasi wajib disertakan.",
    };
  }

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return {
      ok: false,
      status: 401,
      error: "Token tidak valid atau sesi telah kedaluwarsa.",
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || String(profile?.role || "").trim().toLowerCase() !== "admin") {
    return {
      ok: false,
      status: 403,
      error: "Akses ditolak: hanya admin yang diizinkan.",
    };
  }

  return {
    ok: true,
    userId: userData.user.id,
    email: userData.user.email ?? undefined,
  };
}

/**
 * Validasi password CRM: wajib terisi dan minimal 12 karakter (tanpa fallback default).
 */
export function validateCrmPassword(rawPassword: unknown): PasswordValidationResult {
  const clean = typeof rawPassword === "string" ? rawPassword.trim() : "";
  if (!clean || clean.length < MIN_CRM_PASSWORD_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Password wajib diisi minimal ${MIN_CRM_PASSWORD_LENGTH} karakter.`,
    };
  }
  return { ok: true, password: clean };
}

