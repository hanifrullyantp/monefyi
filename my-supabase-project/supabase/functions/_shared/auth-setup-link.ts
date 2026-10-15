import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * One-time link for new Lynk purchasers to set password (Supabase recovery link).
 * Do not email plain-text passwords.
 */
export async function generateSetupPasswordUrl(
  supa: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<string | null> {
  const { data, error } = await supa.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) {
    console.error("generateSetupPasswordUrl:", error.message);
    return null;
  }
  return data?.properties?.action_link ?? null;
}
