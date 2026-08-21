/** Resolve Supabase client env for Next.js landing. */
export function resolveSupabaseEnv(): { url: string; anonKey: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = resolveSupabaseEnv();
  return Boolean(url && anonKey);
}
