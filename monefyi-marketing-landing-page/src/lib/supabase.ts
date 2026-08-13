import { createClient } from '@supabase/supabase-js';
import { MONEFYI_CONFIG } from './monefyi-config';

export const supabase = createClient(MONEFYI_CONFIG.supabaseUrl, MONEFYI_CONFIG.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
