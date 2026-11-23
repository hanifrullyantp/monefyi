import { createClient } from '@supabase/supabase-js';
import { assertSupabaseConfig, config } from './config';

assertSupabaseConfig();

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
