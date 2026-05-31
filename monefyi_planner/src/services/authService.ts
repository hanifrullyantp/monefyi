import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { agentDebugLog } from '../lib/agentDebugLog';
import { config } from '../lib/config';
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
  const redirectTo = authRedirectUrl('/login');
  const domain = email.trim().split('@')[1] || '';

  // #region agent log
  agentDebugLog('H3', 'authService.ts:signUp:before', 'signUp request', {
    domain,
    redirectTo,
    origin: typeof window !== 'undefined' ? window.location.origin : 'ssr',
    skipEmailVerify: config.skipEmailVerify,
    signupIntent: metadata.signup_intent ?? null,
  });
  // #endregion

  const result = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: metadata,
      emailRedirectTo: redirectTo,
    },
  });

  const user = result.data.user;
  // #region agent log
  agentDebugLog('H1', 'authService.ts:signUp:after', 'signUp response', {
    hasError: !!result.error,
    errorStatus: result.error?.status ?? null,
    errorCode: result.error?.code ?? null,
    errorMessage: result.error?.message ?? null,
    hasUser: !!user,
    hasSession: !!result.data.session,
    emailConfirmedAt: user?.email_confirmed_at ?? null,
    confirmedAt: user?.confirmed_at ?? null,
    identitiesCount: user?.identities?.length ?? 0,
    userCreatedAt: user?.created_at ?? null,
  });
  // #endregion

  return result;
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
  const redirectTo = authRedirectUrl('/login');
  const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  // #region agent log
  agentDebugLog('H2', 'authService.ts:resetPassword', 'reset password response', {
    domain: email.trim().split('@')[1] || '',
    redirectTo,
    hasError: !!result.error,
    errorMessage: result.error?.message ?? null,
  });
  // #endregion
  return result;
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}
