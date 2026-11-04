'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getMonefyiSession,
  onMonefyiAuthChange,
  signInMonefyi,
  signOutMonefyi,
  userHasProduct,
} from '@/lib/monefyi-auth';

type AuthStatus = 'loading' | 'guest' | 'no-product' | 'ready';

interface MonefyiAuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  hasProduct: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const MonefyiAuthContext = createContext<MonefyiAuthContextValue | null>(null);

async function resolveAuthState(): Promise<{
  session: Session | null;
  hasProduct: boolean;
}> {
  const session = await getMonefyiSession();
  if (!session) return { session: null, hasProduct: false };
  const hasProduct = await userHasProduct('monefyi');
  return { session, hasProduct };
}

export function MonefyiAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [hasProduct, setHasProduct] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await resolveAuthState();
      setSession(next.session);
      setHasProduct(next.hasProduct);
      if (!next.session) setStatus('guest');
      else if (!next.hasProduct) setStatus('no-product');
      else setStatus('ready');
    } catch {
      setSession(null);
      setHasProduct(false);
      setStatus('guest');
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = onMonefyiAuthChange(() => {
      refresh();
    });
    return () => sub.unsubscribe();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await signInMonefyi(email, password);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await signOutMonefyi();
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      hasProduct,
      signIn,
      signOut,
      refresh,
    }),
    [status, session, hasProduct, signIn, signOut, refresh],
  );

  return (
    <MonefyiAuthContext.Provider value={value}>{children}</MonefyiAuthContext.Provider>
  );
}

export function useMonefyiAuth() {
  const ctx = useContext(MonefyiAuthContext);
  if (!ctx) throw new Error('useMonefyiAuth must be used within MonefyiAuthProvider');
  return ctx;
}
