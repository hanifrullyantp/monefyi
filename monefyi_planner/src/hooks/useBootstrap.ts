import { useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { buildUser } from '../lib/adapters';
import { config } from '../lib/config';
import { onAuthStateChange } from '../services/authService';
import { loadOrg } from '../services/orgService';
import { loadProfile } from '../services/profileService';
import { loadProjects } from '../services/projectService';
import {
  updateLastActive,
  tryDomainJoin,
  createOwnerOrg,
  completeOwnerOnboarding,
} from '../services/onboardingService';
import { supabase } from '../lib/supabase';
import {
  getSignupIntent,
  isOwnerSignupIntent,
  parseOwnerOrgParamsFromMetadata,
} from '../lib/ownerSignup';
import {
  loadNotifications,
  subscribeNotifications,
  subscribeProjects,
} from '../services/notificationService';
import { isPlatformAdmin } from '../services/adminService';
import { logSessionExpired } from '../services/runtimeTracer';
import { useAppStore } from '../store/appStore';

function resolvePlatformRole(profile: { role?: string }, email?: string): 'user' | 'admin' {
  if (String(profile?.role || '').toLowerCase() === 'admin') return 'admin';
  if (config.adminEmails.some(e => e.toLowerCase() === (email || '').toLowerCase())) return 'admin';
  return 'user';
}

let bootstrapPromise: Promise<void> | null = null;

async function applyOrgContext(
  authUser: Session['user'],
  profile: { name?: string | null },
  orgCtx: NonNullable<Awaited<ReturnType<typeof loadOrg>>>,
) {
  const store = useAppStore.getState();
  const user = buildUser(authUser, String(profile.name || 'User'), orgCtx.org.id, orgCtx.role);
  store.setUser(user);
  store.setTenant(orgCtx.org);
  store.setAuthenticated(true);
  store.setHasMembership(true);
  store.setSignupIntent(null);
  store.setOnboardingCompleted(!!orgCtx.onboardingCompleted);

  const projects = await loadProjects(orgCtx.org.id, orgCtx.org.currency);
  store.setProjects(projects);

  const notifications = await loadNotifications(authUser.id);
  store.setNotifications(notifications);

  updateLastActive(authUser.id, orgCtx.org.id).catch(console.error);
  store.setLastSynced(new Date());
  store.setSyncStatus('synced');
}

async function bootstrapSession(session: Session) {
  const store = useAppStore.getState();
  const authUser = session.user;
  const metadata = authUser.user_metadata as Record<string, unknown>;
  const signupIntent = getSignupIntent(metadata) || null;

  store.setSyncStatus('syncing');
  store.setSignupIntent(signupIntent);
  store.setEmailVerified(
    !!authUser.email_confirmed_at ||
      config.skipEmailVerify ||
      isPlatformAdmin('user', authUser.email),
  );

  try {
    const profile = await loadProfile(
      authUser.id,
      authUser.email,
      metadata,
    );
    store.setPlatformRole(resolvePlatformRole(profile, authUser.email));

    let orgCtx = await loadOrg(authUser.id);

    if (!orgCtx) {
      await tryDomainJoin().catch(() => {});
      orgCtx = await loadOrg(authUser.id);
    }

    if (!orgCtx) {
      const ownerParams = parseOwnerOrgParamsFromMetadata(metadata);
      if (ownerParams) {
        try {
          await createOwnerOrg(ownerParams);
          orgCtx = await loadOrg(authUser.id);
        } catch (e) {
          console.error('Auto create owner org:', e);
        }
      }
    }

    const platformAdmin = resolvePlatformRole(profile, authUser.email) === 'admin';
    if (!orgCtx && platformAdmin) {
      const orgName =
        String(metadata.org_name || profile.name || 'Platform Admin Workspace').trim() ||
        'Platform Admin Workspace';
      try {
        await createOwnerOrg({
          org_name: orgName,
          name: String(profile.name || 'Admin'),
        });
        orgCtx = await loadOrg(authUser.id);
        if (orgCtx) {
          await completeOwnerOnboarding(orgCtx.org.id, {});
          await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', authUser.id);
        }
      } catch (e) {
        console.error('Auto create platform admin org:', e);
      }
    }

    if (orgCtx) {
      await applyOrgContext(authUser, profile, orgCtx);
      return;
    }

    store.setHasMembership(false);
    store.setUser({
      id: authUser.id,
      name: String(profile.name || 'User'),
      email: authUser.email || '',
      role: isOwnerSignupIntent(metadata) ? 'owner' : 'worker',
      tenant_id: '',
    });
    store.setTenant(null);
    store.setAuthenticated(true);
    store.setOnboardingCompleted(false);
    store.setProjects([]);
    store.setNotifications([]);
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

    const subscription = onAuthStateChange((event, session) => {
      if (useAppStore.getState().isDemoMode) {
        setAuthInitializing(false);
        return;
      }

      if (session?.user) {
        // Must NOT await bootstrap here — Supabase blocks signIn until this callback settles.
        void runBootstrap(session)
          .catch((e) => console.error('Bootstrap error:', e))
          .finally(() => setAuthInitializing(false));
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
        if (useAppStore.getState().user?.id) {
          let wasManual = false;
          try {
            wasManual = sessionStorage.getItem('monefyi_manual_logout') === '1';
            sessionStorage.removeItem('monefyi_manual_logout');
          } catch { /* ignore */ }
          logSessionExpired(wasManual);
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
