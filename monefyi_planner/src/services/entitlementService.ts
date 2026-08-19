import { buildEntitlementSnapshot } from '../lib/entitlement';
import { supabase } from '../lib/supabase';
import type { EntitlementSnapshot, OrgSubscriptionRow } from '../types/entitlement';
import { isActiveProjectStatus } from '../lib/entitlement';

export async function loadOrgSubscription(orgId: string): Promise<OrgSubscriptionRow | null> {
  const { data, error } = await supabase
    .from('planner_org_subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return null;
    }
    throw new Error(error.message);
  }
  return (data as OrgSubscriptionRow) || null;
}

async function countActiveProjects(orgId: string): Promise<number> {
  const { data, error } = await supabase
    .from('planner_projects')
    .select('status')
    .eq('org_id', orgId)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  return (data || []).filter(row => isActiveProjectStatus(row.status as string)).length;
}

async function countActiveMembers(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('planner_org_members')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function orgHasEstimations(orgId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('planner_estimations')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function loadEntitlementSnapshot(
  orgId: string,
  orgPlan?: string | null,
): Promise<EntitlementSnapshot> {
  const [subscription, activeProjectCount, memberCount, hasEstimations] = await Promise.all([
    loadOrgSubscription(orgId),
    countActiveProjects(orgId),
    countActiveMembers(orgId),
    orgHasEstimations(orgId),
  ]);

  return buildEntitlementSnapshot({
    subscription,
    orgPlan,
    hasEstimations,
    activeProjectCount,
    memberCount,
  });
}

export async function assertCanCreateProjectByEntitlement(
  orgId: string,
  orgPlan?: string | null,
): Promise<EntitlementSnapshot> {
  const entitlement = await loadEntitlementSnapshot(orgId, orgPlan);
  if (!entitlement.canCreateProject) {
    if (entitlement.tier === 'free') {
      throw new Error('Beli Estimator untuk membuat proyek pertama Anda.');
    }
    throw new Error(
      `Kuota proyek aktif tercapai (${entitlement.currentActiveProjects}/${entitlement.maxActiveProjects}). Upgrade ke Planner Pro untuk lebih banyak proyek.`,
    );
  }
  return entitlement;
}
