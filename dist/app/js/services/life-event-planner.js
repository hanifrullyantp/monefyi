/**
 * Life event financial planner (Growth Fase 5.5).
 * @module services/life-event-planner
 */

const LS_PLANS = 'monefyi_life_event_plans';

/** @type {object[]} */
export const LIFE_EVENT_TEMPLATES = [
  {
    id: 'wedding',
    title: 'Rencana Nikah',
    icon: '💍',
    default_months: 18,
    cost_range: { low: 50000000, mid: 150000000, high: 300000000 },
    checklist: ['Venue & catering', 'Dokumen & legal', 'Dana darurat post-nikah'],
  },
  {
    id: 'baby',
    title: 'Persiapan Bayi',
    icon: '👶',
    default_months: 9,
    cost_range: { low: 15000000, mid: 35000000, high: 80000000 },
    checklist: ['Persalinan & BPJS', 'Perlengkapan bayi', 'Dana darurat keluarga'],
  },
  {
    id: 'house',
    title: 'Beli Rumah',
    icon: '🏠',
    default_months: 60,
    cost_range: { low: 300000000, mid: 800000000, high: 2000000000 },
    checklist: ['DP 20%', 'Biaya notaris & PBB', 'Renovasi minimal'],
  },
  {
    id: 'career',
    title: 'Transisi Karir',
    icon: '💼',
    default_months: 18,
    cost_range: { low: 32000000, mid: 96000000, high: 150000000 },
    checklist: ['Emergency 12 bulan', 'Lunasi utang konsumtif', 'Side income experiment'],
  },
  {
    id: 'education',
    title: 'Dana Pendidikan Anak',
    icon: '🎓',
    default_months: 192,
    cost_range: { low: 200000000, mid: 500000000, high: 2000000000 },
    checklist: ['Reksadana pendidikan', 'Asuransi pendidikan', 'Review tahunan inflasi 6%'],
  },
];

/**
 * @returns {object[]}
 */
export function loadLifeEventPlans() {
  try {
    return JSON.parse(localStorage.getItem(LS_PLANS) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {string} templateId
 * @param {object} inputs
 * @returns {object}
 */
export function createLifeEventPlan(templateId, inputs = {}) {
  const tpl = LIFE_EVENT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) throw new Error('Template tidak ditemukan');

  const targetCost = Number(inputs.target_cost || tpl.cost_range.mid);
  const months = Number(inputs.months || tpl.default_months);
  const saved = Number(inputs.saved || 0);
  const gap = Math.max(0, targetCost - saved);
  const monthlyNeeded = months > 0 ? Math.ceil(gap / months) : gap;

  const plan = {
    id: `lep_${Date.now()}`,
    template_id: templateId,
    title: inputs.title || tpl.title,
    icon: tpl.icon,
    target_cost: targetCost,
    saved,
    gap,
    months,
    monthly_needed: monthlyNeeded,
    checklist: tpl.checklist.map((c) => ({ label: c, done: false })),
    created_at: new Date().toISOString(),
  };

  const plans = loadLifeEventPlans();
  plans.unshift(plan);
  localStorage.setItem(LS_PLANS, JSON.stringify(plans.slice(0, 10)));
  return plan;
}

/**
 * @param {string} planId
 * @param {object} patch
 */
export function updateLifeEventPlan(planId, patch) {
  const plans = loadLifeEventPlans();
  const idx = plans.findIndex((p) => p.id === planId);
  if (idx < 0) return null;
  plans[idx] = { ...plans[idx], ...patch };
  if (patch.saved != null || patch.target_cost != null) {
    const p = plans[idx];
    p.gap = Math.max(0, Number(p.target_cost) - Number(p.saved));
    p.monthly_needed = p.months > 0 ? Math.ceil(p.gap / p.months) : p.gap;
  }
  localStorage.setItem(LS_PLANS, JSON.stringify(plans));
  return plans[idx];
}

/**
 * @param {object} plan
 * @returns {object}
 */
export function summarizeLifeEventPlan(plan) {
  const progress = plan.target_cost > 0
    ? Math.min(100, Math.round((Number(plan.saved) / Number(plan.target_cost)) * 100))
    : 0;
  return {
    ...plan,
    progress,
    on_track: progress >= Math.min(100, Math.round((plan.months > 0 ? 1 : 0) * 10)),
  };
}

if (typeof window !== 'undefined') {
  window.monefyiLifeEventPlanner = {
    LIFE_EVENT_TEMPLATES,
    loadLifeEventPlans,
    createLifeEventPlan,
    updateLifeEventPlan,
    summarizeLifeEventPlan,
  };
}
