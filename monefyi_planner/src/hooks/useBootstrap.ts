import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { buildUser } from '../lib/adapters';
import { config } from '../lib/config';
import { onAuthStateChange } from '../services/authService';
import { loadOrg } from '../services/orgService';
import { loadProfile } from '../services/profileService';
import { loadProjects } from '../services/projectService';
import { updateLastActive, tryDomainJoin } from '../services/onboardingService';
import {
  loadNotifications,
  subscribeNotifications,
  subscribeProjects,
} from '../services/notificationService';
import { isPlatformAdmin } from '../services/adminService';
import { useAppStore } from '../store/appStore';

function resolvePlatformRole(profile: { role?: string }, email?: string): 'user' | 'admin' {
  if (String(profile?.role || '').toLowerCase() === 'admin') return 'admin';
  if (config.adminEmails.some(e => e.toLowerCase() === (email || '').toLowerCase())) return 'admin';
  return 'user';
}

let bootstrapPromise: Promise<void> | null = null;

async function bootstrapSession(session: Session) {
  const store = useAppStore.getState();
  const authUser = session.user;

  store.setSyncStatus('syncing');
  store.setEmailVerified(
    !!authUser.email_confirmed_at ||
      config.skipEmailVerify ||
      isPlatformAdmin('user', authUser.email),
  );

  try {
    const profile = await loadProfile(
      authUser.id,
      authUser.email,
      authUser.user_metadata as Record<string, unknown>,
    );
    store.setPlatformRole(resolvePlatformRole(profile, authUser.email));

    const orgCtx = await loadOrg(authUser.id);

    if (!orgCtx) {
      await tryDomainJoin().catch(() => {});
      const retryCtx = await loadOrg(authUser.id);
      if (!retryCtx) {
      store.setHasMembership(false);
      store.setUser({
        id: authUser.id,
        name: String(profile.name || 'User'),
        email: authUser.email || '',
        role: 'worker',
        tenant_id: '',
      });
      store.setTenant(null);
      store.setAuthenticated(true);
      store.setOnboardingCompleted(false);
      store.setProjects([]);
      store.setNotifications([]);
      store.setSyncStatus('synced');
      return;
      }

      const user = buildUser(authUser, String(profile.name || 'User'), retryCtx.org.id, retryCtx.role);
      store.setUser(user);
      store.setTenant(retryCtx.org);
      store.setAuthenticated(true);
      store.setHasMembership(true);
      store.setOnboardingCompleted(!!retryCtx.onboardingCompleted);
      const projects = await loadProjects(retryCtx.org.id, retryCtx.org.currency);
      store.setProjects(projects);
      const notifications = await loadNotifications(authUser.id);
      store.setNotifications(notifications);
      updateLastActive(authUser.id, retryCtx.org.id).catch(console.error);
      store.setLastSynced(new Date());
      store.setSyncStatus('synced');
      return;
    }

    const user = buildUser(authUser, String(profile.name || 'User'), orgCtx.org.id, orgCtx.role);
    store.setUser(user);
    store.setTenant(orgCtx.org);
    store.setAuthenticated(true);
    store.setHasMembership(true);
    store.setOnboardingCompleted(!!orgCtx.onboardingCompleted);

    const projects = await loadProjects(orgCtx.org.id, orgCtx.org.currency);
    store.setProjects(projects);

    const notifications = await loadNotifications(authUser.id);
    store.setNotifications(notifications);

    updateLastActive(authUser.id, orgCtx.org.id).catch(console.error);

    store.setLastSynced(new Date());
    store.setSyncStatus('synced');
  } catch (e) {
    console.error('Bootstrap error:', e);
    store.setSyncStatus('error');
    store.setAuthError(e instanceof Error ? e.message : 'Gagal memuat data');
    throw e;
  }
}

export function useBootstrap() {
  const initialized = useRef(false);
  const {
    setAuthenticated,
    setUser,
    setTenant,
    setProjects,
    setNotifications,
    setAuthInitializing,
    user,
    tenant,
    refreshData,
  } = useAppStore();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setAuthInitializing(true);

    const subscription = onAuthStateChange(async (event, session) => {
      if (useAppStore.getState().isDemoMode) {
        setAuthInitializing(false);
        return;
      }
      if (session?.user) {
        if (!bootstrapPromise) {
          bootstrapPromise = bootstrapSession(session).finally(() => {
            bootstrapPromise = null;
          });
        }
        try {
          await bootstrapPromise;
        } catch {
          /* authError set in bootstrap */
        }
      } else if (event === 'SIGNED_OUT' || !session) {
        if (useAppStore.getState().isDemoMode) {
          setAuthInitializing(false);
          return;
        }
        setUser(null);
        setTenant(null);
        setAuthenticated(false);
        setProjects([]);
        setNotifications([]);
      }
      setAuthInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, [
    setAuthenticated,
    setUser,
    setTenant,
    setProjects,
    setNotifications,
    setAuthInitializing,
  ]);

  useEffect(() => {
    if (!user?.id || !tenant?.id || useAppStore.getState().isDemoMode) return;

    const unsubs: Array<() => void> = [];
    unsubs.push(subscribeNotifications(user.id, () => refreshData()));
    unsubs.push(subscribeProjects(tenant.id, () => refreshData()));

    return () => unsubs.forEach(u => u());
  }, [user?.id, tenant?.id, refreshData]);
}

export async function runBootstrap(session: Session) {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapSession(session).finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}
