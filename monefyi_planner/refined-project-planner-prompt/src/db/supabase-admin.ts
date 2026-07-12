import { config } from "dotenv";
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const globalForSupabase = globalThis as typeof globalThis & {
  __plannerSupabaseAdmin?: SupabaseClient | null;
};

function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (globalForSupabase.__plannerSupabaseAdmin === undefined) {
    globalForSupabase.__plannerSupabaseAdmin = createAdminClient();
  }
  return globalForSupabase.__plannerSupabaseAdmin;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseAdmin() !== null;
}
