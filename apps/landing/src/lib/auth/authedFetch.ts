/**
 * fetch untuk route /api/meta/* dan /api/engine/* di sisi klien.
 * Aplikasi dapat memanggil setAccessTokenProvider sekali saat admin layout dimuat, misalnya:
 *   setAccessTokenProvider(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);
 * Jika provider belum diset, authedFetch otomatis fallback ke getSupabaseClient() jika tersedia.
 * Jika sesi kosong, request tetap dikirim tanpa token dan server menolaknya (fail closed).
 */
import { getSupabaseClient } from "@/lib/supabase/client";

let tokenProvider: (() => Promise<string | null>) | null = null;

export function setAccessTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token: string | null = null;
  if (tokenProvider) {
    token = await tokenProvider().catch(() => null);
  } else {
    try {
      const client = getSupabaseClient();
      if (client) {
        const { data } = await client.auth.getSession();
        token = data.session?.access_token ?? null;
      }
    } catch {
      token = null;
    }
  }
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
