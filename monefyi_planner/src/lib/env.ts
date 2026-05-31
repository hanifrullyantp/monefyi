/** Resolve Supabase client env from Vite, Vercel, or Supabase integration names. */
export function resolveSupabaseEnv(): { url: string; anonKey: string } {
  const env = import.meta.env as Record<string, string | undefined>;

  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = env[key]?.trim();
      if (value) return value;
    }
    return '';
  };

  const url = pick(
    'VITE_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
  );

  const anonKey = pick(
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
  );

  return { url, anonKey };
}
