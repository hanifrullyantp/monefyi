import type { Session, User } from '@supabase/supabase-js';
import type { MonefyiProduct } from './monefyi-config';
import { getSupabase } from './supabase-client';

export async function getMonefyiSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function signInMonefyi(email: string, password: string) {
  return getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
}

export async function signOutMonefyi() {
  return getSupabase().auth.signOut();
}

export async function userHasProduct(product: MonefyiProduct = 'monefyi'): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('user_has_product', {
    p_product: product,
  });
  if (error) {
    console.error('user_has_product', error.message);
    return false;
  }
  return data === true;
}

export function onMonefyiAuthChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = getSupabase().auth.onAuthStateChange(callback);
  return data.subscription;
}

export type AuthUser = User;
