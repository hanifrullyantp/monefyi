/**
 * Katalog fitur pricing — sumber kebenaran untuk tabel perbandingan.
 * Setiap fitur punya minTier: paket itu ke atas otomatis dapat centang.
 * Ubah kebijakan Gratis cukup edit baris minTier: 'gratis'.
 */

export type PricingTier = 'gratis' | 'lifetime' | 'pro';

const TIER_RANK: Record<PricingTier, number> = {
  gratis: 0,
  lifetime: 1,
  pro: 2,
};

export interface PricingFeatureDef {
  id: string;
  text: string;
  minTier: PricingTier;
  highlight?: boolean;
}

/** Semua baris fitur untuk tabel "Pilih yang Paling Pas Untukmu" */
export const PRICING_FEATURE_CATALOG: PricingFeatureDef[] = [
  // ── Gratis (selamanya) ──
  { id: 'safe_spend_basic', text: 'Safe-to-Spend harian (basic)', minTier: 'gratis' },
  { id: 'quick_input', text: 'Catat transaksi + parse teks cepat', minTier: 'gratis' },
  { id: 'budget_basic', text: 'Budget dasar (1 kategori aktif)', minTier: 'gratis' },
  { id: 'dashboard', text: 'Dashboard & ringkasan keuangan', minTier: 'gratis' },
  { id: 'ai_insight_basic', text: 'AI insight harian (basic)', minTier: 'gratis' },
  { id: 'offline', text: 'Mode offline', minTier: 'gratis' },
  { id: 'sync_one', text: 'Sync 1 perangkat', minTier: 'gratis' },
  { id: 'support_email', text: 'Support via email', minTier: 'gratis' },

  // ── Lifetime ──
  { id: 'safe_spend_full', text: 'Safe-to-Spend penuh + prediksi cash flow', minTier: 'lifetime', highlight: true },
  { id: 'hero_situasi', text: 'Hero Situasi Hari Ini (runway & status AMAN/WASPADA)', minTier: 'lifetime' },
  { id: 'monevisor_coach', text: 'Monevisor AI Coach penuh', minTier: 'lifetime', highlight: true },
  { id: 'budget_unlimited', text: 'Budget unlimited kategori', minTier: 'lifetime' },
  { id: 'accounts_unlimited', text: 'Multi rekening (unlimited)', minTier: 'lifetime' },
  { id: 'debt_planner', text: 'Debt Freedom Planner & Goals', minTier: 'lifetime' },
  { id: 'weekly_digest', text: 'Weekly AI Digest personal', minTier: 'lifetime' },
  { id: 'email_import', text: 'Import mutasi via email', minTier: 'lifetime' },
  { id: 'export_pdf', text: 'Export PDF & CSV', minTier: 'lifetime' },
  { id: 'ocr_scan', text: 'Scan struk OCR (unlimited)', minTier: 'lifetime' },
  { id: 'push_notif', text: 'Push notification', minTier: 'lifetime' },
  { id: 'multi_device', text: 'Multi-device sync', minTier: 'lifetime' },
  { id: 'updates_forever', text: 'Update fitur selamanya', minTier: 'lifetime' },
  { id: 'priority_support', text: 'Priority support (respon <1 jam)', minTier: 'lifetime' },

  // ── Pro+ ──
  { id: 'household', text: 'Couple Mode / Household Bersama', minTier: 'pro', highlight: true },
  { id: 'ai_premium', text: 'AI Insight premium (analisis mendalam)', minTier: 'pro', highlight: true },
  { id: 'bank_sync', text: 'Integrasi bank otomatis', minTier: 'pro', highlight: true },
  { id: 'monthly_report', text: 'Laporan visual bulanan', minTier: 'pro' },
  { id: 'export_excel', text: 'Export Excel profesional', minTier: 'pro' },
  { id: 'beta_access', text: 'Akses fitur beta', minTier: 'pro' },
  { id: 'vip_support', text: 'Support VIP (respon cepat)', minTier: 'pro' },
];

export function planTierFromId(planId: string): PricingTier {
  if (planId === 'lifetime') return 'lifetime';
  if (planId === 'pro') return 'pro';
  return 'gratis';
}

/** Apakah plan ini include fitur? (progresif: tier atas inherit tier bawah) */
export function isFeatureIncludedForPlan(planId: string, feature: PricingFeatureDef): boolean {
  const planTier = planTierFromId(planId);
  return TIER_RANK[planTier] >= TIER_RANK[feature.minTier];
}

/** Untuk kartu pricing — fitur yang relevan per paket */
export function buildPlanFeaturesForCard(planId: string): {
  included: boolean;
  text: string;
  highlight?: boolean;
}[] {
  const tier = planTierFromId(planId);

  if (tier === 'gratis') {
    return PRICING_FEATURE_CATALOG.filter((f) => f.minTier === 'gratis').map((f) => ({
      text: f.text,
      included: true,
    }));
  }

  if (tier === 'lifetime') {
    const headline = { included: true, text: 'Semua fitur Gratis, PLUS:', highlight: true as const };
    const extras = PRICING_FEATURE_CATALOG.filter((f) => f.minTier === 'lifetime').slice(0, 6);
    return [
      headline,
      ...extras.map((f) => ({ text: f.text, included: true, highlight: f.highlight })),
    ];
  }

  const headline = { included: true, text: 'Semua fitur Lifetime, PLUS:', highlight: true as const };
  const extras = PRICING_FEATURE_CATALOG.filter((f) => f.minTier === 'pro');
  return [headline, ...extras.map((f) => ({ text: f.text, included: true, highlight: f.highlight }))];
}

/** Legacy shape untuk CMS / merge */
export function buildLegacyPlanFeatures(planId: string): { included: boolean; text: string; highlight?: boolean }[] {
  return PRICING_FEATURE_CATALOG.map((f) => ({
    text: f.text,
    included: isFeatureIncludedForPlan(planId, f),
    highlight: f.highlight && f.minTier === planTierFromId(planId),
  }));
}
