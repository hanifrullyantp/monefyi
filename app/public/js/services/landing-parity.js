/**
 * Landing ↔ App feature parity registry & audit (Sprint 6).
 * @module services/landing-parity
 */

/** @typedef {'ok'|'warn'|'fail'} ParityStatus */

/**
 * Canonical promises marketed on landing / pricing vs app delivery.
 * @type {Array<object>}
 */
export const LANDING_PROMISES = [
  {
    id: 'smart_input',
    label: 'Input Cerdas (NL parse, batch, OCR)',
    landingSection: 'Fitur — Input Cerdas',
    minPlan: 'trial',
    featureFlag: null,
    entitlement: 'quick_text_parse',
    critical: true,
  },
  {
    id: 'budgeting',
    label: 'Budgeting per kategori + AI rekomendasi',
    landingSection: 'Fitur — Budgeting',
    minPlan: 'trial',
    featureFlag: null,
    entitlement: 'basic_budget',
    critical: true,
  },
  {
    id: 'monevisor',
    label: 'Monevisor AI Coach',
    landingSection: 'Fitur — Monevisor AI',
    minPlan: 'monthly',
    featureFlag: 'ai_coach_pro',
    entitlement: 'ai_coach',
    critical: true,
  },
  {
    id: 'dashboard_reports',
    label: 'Dashboard & Laporan PDF',
    landingSection: 'Fitur — Dashboard & Laporan',
    minPlan: 'monthly',
    featureFlag: null,
    entitlement: 'export_pdf',
    critical: true,
  },
  {
    id: 'household_mode',
    label: 'Household / Couple Mode',
    landingSection: 'Pricing — Couple Pack',
    minPlan: 'monthly',
    featureFlag: 'household_mode',
    entitlement: null,
    critical: true,
  },
  {
    id: 'weekly_digest',
    label: 'Weekly AI Digest',
    landingSection: 'Pricing — Pro+',
    minPlan: 'monthly',
    featureFlag: 'weekly_ai_digest',
    entitlement: null,
    critical: true,
  },
  {
    id: 'multiple_goals',
    label: 'Multiple Financial Goals',
    landingSection: 'Pricing — Pro+',
    minPlan: 'monthly',
    featureFlag: 'multiple_goals',
    entitlement: null,
    critical: true,
  },
  {
    id: 'debt_planner',
    label: 'Debt Payoff Planner',
    landingSection: 'Pricing — Pro+',
    minPlan: 'monthly',
    featureFlag: 'debt_payoff_planner',
    entitlement: null,
    critical: true,
  },
  {
    id: 'monthly_report',
    label: 'Monthly Report Auto-Generate',
    landingSection: 'Pricing — Pro+',
    minPlan: 'monthly',
    featureFlag: 'monthly_auto_report',
    entitlement: null,
    critical: false,
  },
  {
    id: 'in_app_marketing',
    label: 'In-App Marketing Engine',
    landingSection: 'Internal — upgrade flow',
    minPlan: 'trial',
    featureFlag: 'in_app_marketing',
    entitlement: null,
    critical: false,
  },
  {
    id: 'neraca_advanced',
    label: 'Neraca Advanced',
    landingSection: 'Pricing — Pro+',
    minPlan: 'monthly',
    featureFlag: 'neraca_advanced',
    entitlement: null,
    critical: false,
  },
  {
    id: 'what_if_simulator',
    label: 'What-If Financial Simulator',
    landingSection: 'Growth — Pro+',
    minPlan: 'monthly',
    featureFlag: null,
    entitlement: null,
    critical: false,
  },
  {
    id: 'community_forum',
    label: 'Community Q&A & Buddy',
    landingSection: 'Growth — Community',
    minPlan: 'trial',
    featureFlag: null,
    entitlement: null,
    critical: false,
  },
  {
    id: 'financial_health_score',
    label: 'Financial Health Score (6 komponen)',
    landingSection: 'Growth — Monthly Review',
    minPlan: 'trial',
    featureFlag: null,
    entitlement: null,
    critical: false,
  },
];

/**
 * @param {object|null|undefined} flag
 * @returns {ParityStatus}
 */
export function evaluateFeatureFlag(flag) {
  if (!flag) return 'ok';
  if (flag.status === 'off' || flag.enabled === false) return 'fail';
  if (flag.status === 'beta' || flag.status === 'testing') return 'warn';
  if (Number(flag.rollout_pct) < 100) return 'warn';
  return 'ok';
}

/**
 * @param {Record<string, object>} [flagsMap]
 * @returns {{ items: object[], score: number, criticalFails: number, ready: boolean }}
 */
export function auditLandingParity(flagsMap = {}) {
  const items = LANDING_PROMISES.map((p) => {
    let status = 'ok';
    let message = 'Tersedia di aplikasi';

    if (p.featureFlag) {
      const flag = flagsMap[p.featureFlag];
      status = evaluateFeatureFlag(flag);
      if (status === 'fail') {
        message = `Feature flag "${p.featureFlag}" nonaktif — janji landing belum terpenuhi`;
      } else if (status === 'warn') {
        message = `Flag "${p.featureFlag}" beta/testing atau rollout < 100%`;
      }
    }

    return {
      id: p.id,
      label: p.label,
      landingSection: p.landingSection,
      minPlan: p.minPlan,
      featureFlag: p.featureFlag,
      entitlement: p.entitlement,
      critical: p.critical,
      status,
      message,
    };
  });

  const okCount = items.filter((i) => i.status === 'ok').length;
  const criticalFails = items.filter((i) => i.critical && i.status === 'fail').length;
  const score = items.length ? Math.round((okCount / items.length) * 100) : 0;
  const ready = criticalFails === 0 && score >= 90;

  return { items, score, criticalFails, ready };
}

/**
 * User-facing parity summary for settings.
 * @returns {Promise<{ score: number, ready: boolean, criticalFails: number, topIssues: object[] }>}
 */
export async function getUserParitySummary() {
  const audit = await runLandingParityAudit();
  const topIssues = audit.items
    .filter((i) => i.status !== 'ok')
    .slice(0, 4);
  return {
    score: audit.score,
    ready: audit.ready,
    criticalFails: audit.criticalFails,
    topIssues,
  };
}

/**
 * Load flags from STATE/local cache and run audit.
 * @returns {Promise<{ items: object[], score: number, criticalFails: number, ready: boolean }>}
 */
export async function runLandingParityAudit() {
  let flagsMap = window.STATE?.featureFlags || {};
  if (!Object.keys(flagsMap).length) {
    try {
      const raw = localStorage.getItem('monefyi_feature_flags_v2');
      if (raw) flagsMap = JSON.parse(raw);
    } catch { /* ignore */ }
  }
  if (!Object.keys(flagsMap).length) {
    try {
      const { syncFeatureFlagsFromRemote } = await import('./feature-flag-store.js');
      await syncFeatureFlagsFromRemote();
      flagsMap = window.STATE?.featureFlags || flagsMap;
    } catch { /* offline */ }
  }
  return auditLandingParity(flagsMap);
}

if (typeof window !== 'undefined') {
  window.monefyiLandingParity = { LANDING_PROMISES, auditLandingParity, runLandingParityAudit, getUserParitySummary };
}
