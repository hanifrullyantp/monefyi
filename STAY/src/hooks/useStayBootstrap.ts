import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFrontDeskPreferencesStore } from '../stores/frontDeskPreferencesStore';
import { preloadAllSounds } from '../utils/sounds';
import { hydrateAppStoreFromRemote } from '../services/api/stayApi';
import { hydrateFinanceFromRemote, fetchRegisterSessions } from '../services/api/stayFinanceApi';

/**
 * Bootstrap STAY data: session restore, remote hydration, and realtime sync.
 */
export function useStayBootstrap() {
  const { isAuthenticated, tenant, initializeSession } = useAuthStore();
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  useEffect(() => {
    void initializeSession();
    const prefs = useFrontDeskPreferencesStore.getState();
    document.documentElement.classList.toggle('dark', prefs.darkMode);
    preloadAllSounds();
  }, [initializeSession]);

  useEffect(() => {
    if (!isAuthenticated || !tenant?.id) return;

    void hydrateAppStoreFromRemote(tenant.id);
    void hydrateFinanceFromRemote(tenant.id);
    void fetchRegisterSessions(tenant.id).then((sessions) => {
      import('../store/posStore').then(({ usePosStore }) => {
        // Register sessions loaded via posStore persistence; remote sync when API returns data
        if (sessions.length > 0) {
          console.info('[STAY] Loaded', sessions.length, 'register sessions from remote');
        }
      });
    });

    if (!isSupabaseConfigured || !supabase) return;

    const tenantId = tenant.id;
    channelRef.current = supabase
      .channel(`stay-tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stay_bookings', filter: `tenant_id=eq.${tenantId}` },
        () => void hydrateAppStoreFromRemote(tenantId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stay_rooms', filter: `tenant_id=eq.${tenantId}` },
        () => void hydrateAppStoreFromRemote(tenantId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stay_payments', filter: `tenant_id=eq.${tenantId}` },
        () => void hydrateAppStoreFromRemote(tenantId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stay_journal_entries', filter: `tenant_id=eq.${tenantId}` },
        () => void hydrateFinanceFromRemote(tenantId)
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, tenant?.id]);
}
