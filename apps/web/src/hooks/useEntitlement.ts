import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';
import { loadEntitlementSnapshot } from '../services/entitlementService';
import type { EntitlementSnapshot } from '../types/entitlement';
import { buildEntitlementSnapshot, buildFullAccessEntitlement, buildPreviewEntitlement } from '../lib/entitlement';

const EMPTY: EntitlementSnapshot = buildEntitlementSnapshot({
  subscription: null,
  activeProjectCount: 0,
  memberCount: 0,
  hasEstimations: false,
});

let cache: { orgId: string; data: EntitlementSnapshot; at: number } | null = null;
const CACHE_MS = 60_000;

export function invalidateEntitlementCache(): void {
  cache = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('monefyi:entitlement-invalidate'));
  }
}

export function useEntitlement() {
  const {
    tenant, user, platformRole, projects, authInitializing, entitlementPreviewMode, isDemoMode,
  } = useAppStore();
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isPlatformAdmin(platformRole, user?.email)) {
      const activeCount = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').length;
      const snap = entitlementPreviewMode === 'full'
        ? buildFullAccessEntitlement(activeCount, 1)
        : buildPreviewEntitlement(entitlementPreviewMode, activeCount, 1);
      setEntitlement(snap);
      setIsLoading(false);
      return;
    }

    if (isDemoMode || tenant?.id === 'demo') {
      const activeCount = projects.filter(p => p.status !== 'archived' && p.status !== 'completed').length;
      const snap = buildEntitlementSnapshot({
        subscription: null,
        orgPlan: tenant?.plan ?? 'pro',
        activeProjectCount: activeCount,
        memberCount: 3,
        hasEstimations: true,
      });
      setEntitlement(snap);
      setIsLoading(false);
      return;
    }

    if (authInitializing) {
      setIsLoading(true);
      return;
    }

    if (!tenant?.id) {
      setEntitlement(EMPTY);
      setIsLoading(false);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const now = Date.now();
      if (cache && cache.orgId === tenant.id && now - cache.at < CACHE_MS) {
        setEntitlement(cache.data);
        return;
      }
      const data = await loadEntitlementSnapshot(tenant.id, tenant.plan);
      cache = { orgId: tenant.id, data, at: now };
      setEntitlement(data);
    } catch {
      setEntitlement(buildEntitlementSnapshot({
        subscription: null,
        orgPlan: tenant.plan,
        activeProjectCount: projects.length,
        memberCount: 1,
        hasEstimations: false,
      }));
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [tenant?.id, tenant?.plan, platformRole, user?.email, projects, authInitializing, entitlementPreviewMode, isDemoMode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => { void refresh(); };
    const onInvalidate = () => {
      cache = null;
      void refresh();
    };
    window.addEventListener('focus', onRefresh);
    window.addEventListener('monefyi:entitlement-invalidate', onInvalidate);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('monefyi:entitlement-invalidate', onInvalidate);
    };
  }, [refresh]);

  return { ...entitlement, isLoading, refresh };
}

export type Entitlement = ReturnType<typeof useEntitlement>;
