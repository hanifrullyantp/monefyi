import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './monefyi-config';

let client: SupabaseClient | null = null;

/** Browser Supabase client (singleton). */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const { url, anonKey } = getSupabaseConfig();
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
