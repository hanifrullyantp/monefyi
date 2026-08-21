import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';
import { loadEntitlementSnapshot } from '../services/entitlementService';
import type { EntitlementSnapshot } from '../types/entitlement';
import { buildEntitlementSnapshot } from '../lib/entitlement';

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
  const { tenant, user, platformRole, projects } = useAppStore();
  const [entitlement, setEntitlement] = useState<EntitlementSnapshot>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!tenant?.id) {
      setEntitlement(EMPTY);
      setIsLoading(false);
      return;
    }

    if (isPlatformAdmin(platformRole, user?.email)) {
      const adminEntitlement = buildEntitlementSnapshot({
        subscription: null,
        orgPlan: 'enterprise',
        activeProjectCount: projects.filter(p => p.status !== 'archived' && p.status !== 'completed').length,
        memberCount: 1,
        hasEstimations: true,
      });
      setEntitlement({ ...adminEntitlement, tier: 'enterprise', canAccessEstimator: true, canAccessFinance: true, canCreateProject: true, hasPaid: true });
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
  }, [tenant?.id, tenant?.plan, platformRole, user?.email, projects]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => { void refresh(); };
    window.addEventListener('focus', onRefresh);
    window.addEventListener('monefyi:entitlement-invalidate', onRefresh);
    return () => {
      window.removeEventListener('focus', onRefresh);
      window.removeEventListener('monefyi:entitlement-invalidate', onRefresh);
    };
  }, [refresh]);

  return { ...entitlement, isLoading, refresh };
}

export type Entitlement = ReturnType<typeof useEntitlement>;
