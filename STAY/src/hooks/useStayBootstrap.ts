import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { hydrateAppStoreFromRemote } from '../services/api/stayApi';

/**
 * Bootstrap STAY data: session restore, remote hydration, and realtime sync.
 */
export function useStayBootstrap() {
  const { isAuthenticated, tenant, initializeSession } = useAuthStore();
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isAuthenticated || !tenant?.id) return;

    void hydrateAppStoreFromRemote(tenant.id);

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
      .subscribe();

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, tenant?.id]);
}
