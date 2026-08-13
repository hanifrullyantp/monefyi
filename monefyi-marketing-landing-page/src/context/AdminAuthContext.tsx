import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { isAdminEmail } from '../lib/monefyi-config';
import { supabase } from '../lib/supabase';

const EDIT_MODE_OFF_KEY = 'monefyi_lp_edit_off';

interface AdminAuthContextValue {
  loading: boolean;
  user: User | null;
  isAdminUser: boolean;
  isEditMode: boolean;
  loginOpen: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  exitEditMode: () => void;
  openLogin: () => void;
  closeLogin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function readEditModeOff(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(EDIT_MODE_OFF_KEY) === '1';
}

function wantsAdminEntryFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('admin_mode') === 'true';
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [editModeOff, setEditModeOff] = useState(readEditModeOff);
  const [loginOpen, setLoginOpen] = useState(false);

  const isAdminUser = useMemo(() => isAdminEmail(user?.email), [user?.email]);
  const isEditMode = isAdminUser && !editModeOff;

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const exitEditMode = useCallback(() => {
    sessionStorage.setItem(EDIT_MODE_OFF_KEY, '1');
    setEditModeOff(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('admin_mode');
    window.history.replaceState({}, '', url.toString());
    window.dispatchEvent(new CustomEvent('admin-mode-change'));
  }, []);

  const enableEditMode = useCallback(() => {
    sessionStorage.removeItem(EDIT_MODE_OFF_KEY);
    setEditModeOff(false);
    window.dispatchEvent(new CustomEvent('admin-mode-change'));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const signedInUser = data.user;
    setUser(signedInUser);

    if (!isAdminEmail(signedInUser?.email)) {
      await supabase.auth.signOut();
      setUser(null);
      return { ok: false, error: 'Akun ini bukan admin landing Monefyi.' };
    }

    enableEditMode();
    closeLogin();

    const url = new URL(window.location.href);
    url.searchParams.delete('admin_mode');
    window.history.replaceState({}, '', url.toString());

    return { ok: true };
  }, [closeLogin, enableEditMode]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    exitEditMode();
    closeLogin();
  }, [closeLogin, exitEditMode]);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser && isAdminEmail(sessionUser.email)) {
        if (!readEditModeOff()) {
          enableEditMode();
        }
      } else if (wantsAdminEntryFromUrl()) {
        setLoginOpen(true);
      }

      setLoading(false);
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser && isAdminEmail(nextUser.email)) {
        if (!readEditModeOff()) {
          enableEditMode();
        }
        closeLogin();
        return;
      }

      if (!nextUser && wantsAdminEntryFromUrl()) {
        setLoginOpen(true);
      }
    });

    const onAdminModeChange = () => {
      setEditModeOff(readEditModeOff());
    };

    window.addEventListener('admin-mode-change', onAdminModeChange);
    window.addEventListener('storage', onAdminModeChange);

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      window.removeEventListener('admin-mode-change', onAdminModeChange);
      window.removeEventListener('storage', onAdminModeChange);
    };
  }, [closeLogin, enableEditMode]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      loading,
      user,
      isAdminUser,
      isEditMode,
      loginOpen,
      signIn,
      signOut,
      exitEditMode,
      openLogin,
      closeLogin,
    }),
    [loading, user, isAdminUser, isEditMode, loginOpen, signIn, signOut, exitEditMode, openLogin, closeLogin]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuthContext(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuthContext must be used within AdminAuthProvider');
  }
  return ctx;
}
