import { getSupabaseClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/config/admin";

/** Cek akses admin CMS (email allowlist atau profiles.role = admin). */
export async function resolveAdminAccess(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (isAdminEmail(email)) return true;

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("resolveAdminAccess:", error.message);
    return false;
  }

  return String(data?.role || "").toLowerCase() === "admin";
}
