/**
 * Plan entitlements + grace/cap helpers for Monefyi Finance.
 * @module services/entitlements
 */

/** @typedef {'none'|'trial'|'monthly'|'lifetime'} PlanType */

export const PLAN_ENTITLEMENTS = {
  trial: {
    duration_days: 7,
    max_transactions: 50,
    max_accounts: 2,
    max_budgets: 3,
    max_ocr_scans: 5,
    features: {
      manual_input: true,
      quick_text_parse: true,
      basic_budget: true,
      basic_dashboard: true,
      category_management: true,
      offline_mode: true,
      ai_coach: false,
      ai_insights: false,
      email_import: false,
      ocr_scan: 'limited',
      export_pdf: false,
      export_csv: false,
      monevisor_advanced: false,
      push_notifications: false,
      multi_device_sync: false,
      priority_support: false,
      early_access: false,
    },
    show_upgrade_banner: true,
    show_feature_locks: true,
    grace_period_days: 3,
    redirect_to_pricing: false,
  },
  monthly: {
    duration_days: 30,
    max_transactions: -1,
    max_accounts: -1,
    max_budgets: -1,
    max_ocr_scans: 50,
    features: {
      manual_input: true,
      quick_text_parse: true,
      basic_budget: true,
      basic_dashboard: true,
      category_management: true,
      offline_mode: true,
      ai_coach: true,
      ai_insights: true,
      email_import: true,
      ocr_scan: true,
      export_pdf: true,
      export_csv: true,
      monevisor_advanced: true,
      push_notifications: true,
      multi_device_sync: true,
      priority_support: false,
      early_access: false,
    },
    show_upgrade_banner: false,
    show_feature_locks: false,
    grace_period_days: 7,
    redirect_to_pricing: false,
  },
  lifetime: {
    duration_days: null,
    max_transactions: -1,
    max_accounts: -1,
    max_budgets: -1,
    max_ocr_scans: -1,
    features: {
      manual_input: true,
      quick_text_parse: true,
      basic_budget: true,
      basic_dashboard: true,
      category_management: true,
      offline_mode: true,
      ai_coach: true,
      ai_insights: true,
      email_import: true,
      ocr_scan: true,
      export_pdf: true,
      export_csv: true,
      monevisor_advanced: true,
      push_notifications: true,
      multi_device_sync: true,
      priority_support: true,
      early_access: true,
    },
    show_upgrade_banner: false,
    show_feature_locks: false,
    grace_period_days: null,
    redirect_to_pricing: false,
  },
  none: {
    duration_days: 0,
    max_transactions: 0,
    max_accounts: 0,
    max_budgets: 0,
    max_ocr_scans: 0,
    features: {},
    show_upgrade_banner: true,
    show_feature_locks: true,
    grace_period_days: 0,
    redirect_to_pricing: true,
  },
};

const FEATURE_COPY = {
  ai_coach: {
    title: 'AI Financial Coach',
    body: 'Dapatkan saran keuangan personal dari AI yang memahami datamu.',
    preview: 'Saving rate kamu 15%, ideal 20%. Kurangi kategori Mau untuk naikkan skor.',
  },
  ai_insights: {
    title: 'AI Insights',
    body: 'Insight otomatis dari pola belanja dan budget kamu.',
    preview: 'Pengeluaran makan naik 22% minggu ini vs rata-rata.',
  },
  email_import: {
    title: 'Email Import',
    body: 'Impor transaksi otomatis dari email bank/e-wallet.',
    preview: 'Notifikasi transfer masuk langsung jadi draft transaksi.',
  },
  export_pdf: {
    title: 'Export PDF',
    body: 'Ekspor laporan keuangan rapi untuk arsip atau pajak.',
    preview: 'Laporan bulanan siap unduh dalam satu ketuk.',
  },
  export_csv: {
    title: 'Export CSV',
    body: 'Ekspor data transaksi untuk analisis di spreadsheet.',
    preview: 'Semua transaksi periode ini dalam satu file CSV.',
  },
  monevisor_advanced: {
    title: 'Monevisor Advanced',
    body: 'Skor kesehatan keuangan + rekomendasi mendalam.',
    preview: 'Skor 66/100 — fokusada. Fokus kurangi 3 kategori terbesar.',
  },
  ocr_scan: {
    title: 'OCR Scan',
    body: 'Foto struk → transaksi otomatis.',
    preview: 'Scan struk kopi jadi transaksi dalam detik.',
  },
  push_notifications: {
    title: 'Push Notifications',
    body: 'Pengingat budget & tip harian di perangkatmu.',
    preview: 'Budget Makan sudah 80% — waktunya slow down.',
  },
  multi_device_sync: {
    title: 'Multi-device Sync',
    body: 'Sinkron penuh antar HP dan desktop.',
    preview: 'Catat di HP, lanjut di desktop tanpa kehilangan data.',
  },
};

/**
 * @param {PlanType|string} planType
 * @param {object} [catalogOverride] from app_config.platform_settings.plans
 */
export function getEntitlements(planType, catalogOverride) {
  const key = ['trial', 'monthly', 'lifetime', 'none'].includes(planType) ? planType : 'none';
  const base = { ...PLAN_ENTITLEMENTS[key], features: { ...PLAN_ENTITLEMENTS[key].features } };
  const ov = catalogOverride?.[key];
  if (ov && typeof ov === 'object') {
    if (ov.max_transactions != null) base.max_transactions = Number(ov.max_transactions);
    if (ov.max_accounts != null) base.max_accounts = Number(ov.max_accounts);
    if (ov.max_budgets != null) base.max_budgets = Number(ov.max_budgets);
    if (ov.max_ocr_scans != null) base.max_ocr_scans = Number(ov.max_ocr_scans);
    if (ov.duration_days != null) base.duration_days = ov.duration_days;
    if (ov.grace_period_days != null) base.grace_period_days = ov.grace_period_days;
  }
  return base;
}

/**
 * @param {object} profile
 * @param {Date} [now]
 */
export function computeAccessState(profile, now = new Date()) {
  const planType = String(profile?.plan_type || 'none');
  const expiresRaw = profile?.plan_expires_at || null;
  const planExpiresAt = expiresRaw ? new Date(expiresRaw) : null;
  const ent = getEntitlements(planType);

  let expired = false;
  let daysLeft = null;
  let inGrace = false;
  let graceDaysLeft = 0;
  let readOnly = false;
  let premiumDisabled = false;

  if (planType === 'lifetime') {
    return {
      planType,
      planExpiresAt: null,
      expired: false,
      daysLeft: null,
      inGrace: false,
      graceDaysLeft: 0,
      readOnly: false,
      premiumDisabled: false,
      entitlements: ent,
      accessMode: 'full',
    };
  }

  if (planType === 'none') {
    return {
      planType,
      planExpiresAt,
      expired: true,
      daysLeft: 0,
      inGrace: false,
      graceDaysLeft: 0,
      readOnly: true,
      premiumDisabled: true,
      entitlements: ent,
      accessMode: 'blocked',
    };
  }

  if (planExpiresAt && now.getTime() >= planExpiresAt.getTime()) {
    expired = true;
    daysLeft = 0;
    const graceDays = Number(ent.grace_period_days) || 0;
    if (graceDays > 0) {
      const graceEnd = new Date(planExpiresAt.getTime() + graceDays * 86400000);
      if (now.getTime() < graceEnd.getTime()) {
        inGrace = true;
        graceDaysLeft = Math.max(1, Math.ceil((graceEnd.getTime() - now.getTime()) / 86400000));
        if (planType === 'trial') {
          // trial grace: still full
          readOnly = false;
          premiumDisabled = false;
        } else {
          // monthly grace: still full
          readOnly = false;
          premiumDisabled = false;
        }
      } else {
        // past grace
        if (planType === 'trial') {
          readOnly = true;
          premiumDisabled = true;
        } else {
          // monthly post-grace: degrade (premium off, data readable, writes limited to basic)
          readOnly = false;
          premiumDisabled = true;
        }
      }
    } else {
      readOnly = true;
      premiumDisabled = true;
    }
  } else if (planExpiresAt) {
    daysLeft = Math.ceil((planExpiresAt.getTime() - now.getTime()) / 86400000);
    if (daysLeft <= 0) daysLeft = 1;
  }

  let accessMode = 'full';
  if (readOnly) accessMode = 'readonly';
  else if (premiumDisabled) accessMode = 'degraded';
  else if (inGrace) accessMode = 'grace';

  return {
    planType,
    planExpiresAt,
    expired,
    daysLeft,
    inGrace,
    graceDaysLeft,
    readOnly,
    premiumDisabled,
    entitlements: ent,
    accessMode,
  };
}

/**
 * @param {string} featureKey
 * @param {ReturnType<typeof computeAccessState>} access
 */
export function canUseFeature(featureKey, access) {
  if (!access || access.accessMode === 'blocked') return false;
  if (access.readOnly && !['basic_dashboard'].includes(featureKey)) return false;
  if (access.premiumDisabled) {
    const premiumKeys = [
      'ai_coach', 'ai_insights', 'email_import', 'export_pdf', 'export_csv',
      'monevisor_advanced', 'push_notifications', 'multi_device_sync', 'ocr_scan',
    ];
    if (premiumKeys.includes(featureKey)) return false;
  }
  const val = access.entitlements?.features?.[featureKey];
  if (val === true || val === 'limited') return true;
  return false;
}

/**
 * @param {string} featureKey
 */
export function getFeatureCopy(featureKey) {
  return FEATURE_COPY[featureKey] || {
    title: 'Fitur Premium',
    body: 'Fitur ini tersedia di paket Monthly atau Lifetime.',
    preview: 'Upgrade untuk membuka semua kemampuan Monefyi.',
  };
}

/**
 * @param {number} current
 * @param {number} max
 * @returns {{ ok: boolean, remaining: number }}
 */
export function checkCap(current, max) {
  if (max == null || max < 0) return { ok: true, remaining: Infinity };
  const rem = max - Number(current || 0);
  return { ok: rem > 0, remaining: Math.max(0, rem) };
}

if (typeof window !== 'undefined') {
  window.__monefyiEntitlements = {
    PLAN_ENTITLEMENTS,
    getEntitlements,
    computeAccessState,
    canUseFeature,
    getFeatureCopy,
    checkCap,
  };
}
