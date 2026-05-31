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

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}

export function getAuthUser(): SupabaseUser | null {
  return supabase.auth.getUser().then(({ data }) => data.user);
}

export async function resetPasswordForEmail(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl('/login'),
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
