import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, resolveSupabaseEnv } from "./env";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const { url, anonKey } = resolveSupabaseEnv();
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
