import { supabase } from '../lib/supabase';
import { DEFAULT_PRICING_PLANS, normalizePlanSlug, type PricingPlan } from '../lib/pricingPlans';

function mapRow(row: Record<string, unknown>): PricingPlan {
  const features = row.features;
  const caps = row.capabilities;
  return {
    id: row.id as string,
    slug: row.slug as string,
    label: row.label as string,
    description: (row.description as string) || null,
    price_monthly_idr: Number(row.price_monthly_idr) || 0,
    projects_per_month: row.projects_per_month == null ? null : Number(row.projects_per_month),
    sort_order: Number(row.sort_order) || 0,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    features: Array.isArray(features) ? features.map(String) : [],
    capabilities: caps && typeof caps === 'object' ? caps as PricingPlan['capabilities'] : undefined,
  };
}

export async function loadPricingPlans(activeOnly = true): Promise<PricingPlan[]> {
  let q = supabase.from('planner_pricing_plans').select('*').order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error || !data?.length) return DEFAULT_PRICING_PLANS;
  return data.map(r => mapRow(r as Record<string, unknown>));
}

/** Semua paket termasuk nonaktif — Super Admin */
export async function loadAllPricingPlansAdmin(): Promise<PricingPlan[]> {
  const { data, error } = await supabase
    .from('planner_pricing_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  if (!data?.length) return DEFAULT_PRICING_PLANS;
  return data.map(r => mapRow(r as Record<string, unknown>));
}

export async function upsertPricingPlan(
  plan: Partial<PricingPlan> & { slug: string; label: string },
): Promise<PricingPlan> {
  const payload = {
    slug: plan.slug,
    label: plan.label,
    description: plan.description ?? null,
    price_monthly_idr: plan.price_monthly_idr ?? 0,
    projects_per_month: plan.projects_per_month ?? null,
    sort_order: plan.sort_order ?? 0,
    is_active: plan.is_active ?? true,
    is_default: plan.is_default ?? false,
    features: plan.features ?? [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('planner_pricing_plans')
    .upsert(payload, { onConflict: 'slug' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function updatePricingPlan(
  id: string,
  patch: Partial<Omit<PricingPlan, 'id' | 'slug'>>,
): Promise<PricingPlan> {
  const { data, error } = await supabase
    .from('planner_pricing_plans')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function countProjectsCreatedThisMonth(orgId: string): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from('planner_projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', start);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function assertCanCreateProject(orgId: string, planType?: string): Promise<void> {
  const plans = await loadPricingPlans(true);
  const slug = normalizePlanSlug(planType);
  const plan = plans.find(p => p.slug === slug) || plans.find(p => p.is_default) || DEFAULT_PRICING_PLANS[0];
  if (plan.projects_per_month == null) return;
  const used = await countProjectsCreatedThisMonth(orgId);
  if (used >= plan.projects_per_month) {
    throw new Error(
      `Kuota paket ${plan.label}: maksimal ${plan.projects_per_month} proyek baru per bulan. Upgrade paket untuk menambah proyek.`,
    );
  }
}
