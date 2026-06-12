export interface PricingPlan {
  id?: string;
  slug: string;
  label: string;
  description: string | null;
  price_monthly_idr: number;
  /** null = tanpa batas */
  projects_per_month: number | null;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  features: string[];
}

/** Fallback jika DB belum ter-deploy / kosong */
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    slug: 'free',
    label: 'Gratis',
    description: 'Cocok untuk mencoba — 2 proyek baru per bulan.',
    price_monthly_idr: 0,
    projects_per_month: 2,
    sort_order: 0,
    is_active: true,
    is_default: true,
    features: ['2 proyek/bulan', 'Estimator & RAP', '1 organisasi'],
  },
  {
    slug: 'starter',
    label: 'Starter',
    description: 'Untuk tim kecil — Rp 99.000/bulan.',
    price_monthly_idr: 99000,
    projects_per_month: null,
    sort_order: 1,
    is_active: true,
    is_default: false,
    features: ['Proyek tanpa batas', 'Semua fitur Gratis', 'Dukungan email'],
  },
  {
    slug: 'pro',
    label: 'Pro',
    description: 'Untuk perusahaan — Rp 299.000/bulan.',
    price_monthly_idr: 299000,
    projects_per_month: null,
    sort_order: 2,
    is_active: true,
    is_default: false,
    features: ['Proyek tanpa batas', 'HR & absensi', 'Prioritas dukungan'],
  },
];

export function formatPlanPriceIdr(amount: number): string {
  if (amount <= 0) return 'Gratis';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Map legacy org plan_type ke slug paket baru */
export function normalizePlanSlug(planType?: string): string {
  if (!planType || planType === 'free') return 'free';
  if (planType === 'starter') return 'starter';
  if (planType === 'pro' || planType === 'enterprise' || planType === 'lifetime') return 'pro';
  return planType;
}

export function planForOrg(planType?: string, plans: PricingPlan[] = DEFAULT_PRICING_PLANS): PricingPlan {
  const slug = normalizePlanSlug(planType);
  return plans.find(p => p.slug === slug && p.is_active)
    || plans.find(p => p.is_default)
    || DEFAULT_PRICING_PLANS[0];
}
