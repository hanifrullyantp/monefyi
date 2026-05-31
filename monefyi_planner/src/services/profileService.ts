import { supabase } from '../lib/supabase';

export type PlatformRole = 'user' | 'admin';

export async function loadProfile(userId: string, email?: string, metadata?: Record<string, unknown>) {
  const { data, error: selErr } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, settings, onboarding_completed, role, status, gemini_key, phone')
    .eq('id', userId)
    .maybeSingle();

  if (selErr) console.warn('profiles select:', selErr);

  if (data) return data;

  const name = String(metadata?.name || email?.split('@')[0] || 'User');
  const { data: newProfile, error: upErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, name, settings: {} })
    .select()
    .single();

  if (upErr) {
    throw new Error(`Tabel profil belum siap (${upErr.message}). Jalankan migrasi Supabase.`);
  }

  return newProfile || { name };
}

export async function updateProfileName(userId: string, name: string) {
  return supabase.from('profiles').update({ name }).eq('id', userId);
}

export async function loadProfileWithSettings(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, avatar_url, settings, onboarding_completed')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileSettings(userId: string, patch: Record<string, unknown>) {
  const { data: current, error: selErr } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .maybeSingle();
  if (selErr) throw selErr;

  const merged = { ...(current?.settings as Record<string, unknown> || {}), ...patch };
  return supabase.from('profiles').update({ settings: merged }).eq('id', userId);
}
