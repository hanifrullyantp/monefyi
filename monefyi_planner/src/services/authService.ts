import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

function authRedirectUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  metadata: Record<string, unknown>,
) {
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: metadata,
      emailRedirectTo: authRedirectUrl('/login'),
    },
  });
}

export async function signOutGlobal() {
  return supabase.auth.signOut({ scope: 'global' });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function isRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { message?: unknown; code?: unknown };
  const code = String(err.code || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'refresh_token_not_found'
    || code === 'invalid_refresh_token'
    || msg.includes('invalid refresh token')
    || msg.includes('refresh token not found')
    || msg.includes('refresh_token_not_found')
  );
}

export async function clearLocalAuthSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}

export async function getSessionSafe(): Promise<{
  session: Session | null;
  error: unknown | null;
  staleCleared: boolean;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      let staleCleared = false;
      if (isRefreshTokenError(error)) {
        await clearLocalAuthSession();
        staleCleared = true;
      }
      return { session: null, error, staleCleared };
    }
    return { session: data.session ?? null, error: null, staleCleared: false };
  } catch (error) {
    let staleCleared = false;
    if (isRefreshTokenError(error)) {
      await clearLocalAuthSession();
      staleCleared = true;
    }
    return { session: null, error, staleCleared };
  }
}

export async function getSession(): Promise<Session | null> {
  const { session } = await getSessionSafe();
  return session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

export async function getAuthUser(): Promise<SupabaseUser | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function resetPasswordForEmail(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl('/reset-password'),
  });
}

export async function resendSignupVerification(email: string) {
  return supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: authRedirectUrl('/login') },
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}
