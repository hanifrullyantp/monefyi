/**
 * Personalized coaching plans (Growth Fase 3.4).
 * @module services/coaching-plans
 */

const LS_ENROLLMENT = 'monefyi_coaching_enrollment';
const LS_PROGRESS = 'monefyi_coaching_progress';

/** @type {object[]} */
export const COACHING_PLANS = [
  {
    id: 'debt_recovery',
    title: 'Bangkit dari Utang',
    icon: '💳',
    target: 'Utang > 50% income',
    duration_days: 90,
    success_rate: 78,
    weeks: [
      { label: 'Minggu 1-2', focus: 'Analisis utang & buat plan pelunasan' },
      { label: 'Minggu 3-4', focus: 'Kurangi spending discretionary 20%' },
      { label: 'Minggu 5-8', focus: 'Extra payment ke utang bunga tertinggi' },
      { label: 'Minggu 9-12', focus: 'Bangun emergency fund kecil' },
    ],
  },
  {
    id: 'emergency_fund',
    title: 'Building Emergency Fund',
    icon: '🛡️',
    target: 'Belum punya dana darurat',
    duration_days: 180,
    success_rate: 85,
    weeks: [
      { label: 'Bulan 1', focus: 'Target Rp 500rb starter fund' },
      { label: 'Bulan 2-3', focus: 'Nabung Rp 1jt/bulan konsisten' },
      { label: 'Bulan 4-6', focus: 'Naikkan gradually ke 3 bulan expense' },
    ],
  },
  {
    id: 'mindful_spending',
    title: 'Mindful Spending',
    icon: '🧘',
    target: 'Sering impulsive buy',
    duration_days: 30,
    success_rate: 72,
    weeks: [
      { label: 'Hari 1-7', focus: 'Awareness — catat semua tanpa judgment' },
      { label: 'Hari 8-14', focus: '24-hour rule untuk belanja > Rp 100rb' },
      { label: 'Hari 15-21', focus: 'Envelope system per kategori' },
      { label: 'Hari 22-30', focus: 'Weekly review + adjust budget' },
    ],
  },
  {
    id: 'ready_invest',
    title: 'Ready to Invest',
    icon: '📈',
    target: 'Sudah punya emergency fund',
    duration_days: 60,
    success_rate: 90,
    weeks: [
      { label: 'Minggu 1-2', focus: 'Edukasi dasar investasi & risiko' },
      { label: 'Minggu 3-4', focus: 'Setup rekening investasi' },
      { label: 'Minggu 5-6', focus: 'Investasi pertama (kecil & rutin)' },
      { label: 'Minggu 7-8', focus: 'Automasi nabung investasi bulanan' },
    ],
  },
  {
    id: 'money_detox',
    title: 'Money Detox',
    icon: '🌿',
    target: 'Overspending & stress finansial',
    duration_days: 21,
    success_rate: 68,
    weeks: [
      { label: 'Minggu 1', focus: 'No non-essential purchase' },
      { label: 'Minggu 2', focus: 'Track every rupiah' },
      { label: 'Minggu 3', focus: 'Rebuild dengan mindfulness' },
    ],
  },
];

/**
 * @returns {object|null}
 */
export function loadActiveEnrollment() {
  try {
    return JSON.parse(localStorage.getItem(LS_ENROLLMENT) || 'null');
  } catch {
    return null;
  }
}

/**
 * @param {string} planId
 * @returns {object}
 */
export function enrollCoachingPlan(planId) {
  const plan = COACHING_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Plan tidak ditemukan');

  const enrollment = {
    plan_id: planId,
    started_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + plan.duration_days * 86400000).toISOString(),
    current_week: 1,
    checkins: [],
  };
  localStorage.setItem(LS_ENROLLMENT, JSON.stringify(enrollment));
  return enrollment;
}

/**
 * @returns {object|null}
 */
export function getActivePlanWithProgress() {
  const enrollment = loadActiveEnrollment();
  if (!enrollment) return null;

  const plan = COACHING_PLANS.find((p) => p.id === enrollment.plan_id);
  if (!plan) return null;

  const started = new Date(enrollment.started_at);
  const day = Math.floor((Date.now() - started.getTime()) / 86400000) + 1;
  const progress = Math.min(100, Math.round((day / plan.duration_days) * 100));
  const weekIdx = Math.min(
    plan.weeks.length - 1,
    Math.floor((day / plan.duration_days) * plan.weeks.length),
  );

  return {
    plan,
    enrollment,
    day,
    progress,
    currentFocus: plan.weeks[weekIdx],
  };
}

/**
 * @param {object} [state]
 * @returns {string|null}
 */
export function recommendPlanId(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const prefs = state.db?.userPreferences || {};
  const debt = Number(prefs.debt_amount || 0);
  const income = Number(prefs.monthly_income || state.db?.profile?.monthly_income || 0);
  if (debt > 0 && income > 0 && debt / income > 0.5) return 'debt_recovery';

  const emergency = Number(prefs.emergency_fund || 0);
  if (emergency < income * 0.5) return 'emergency_fund';

  const personality = localStorage.getItem('monefyi_money_personality');
  if (personality && /spender|spontaneous/i.test(personality)) return 'mindful_spending';

  if (emergency >= income * 3) return 'ready_invest';
  return 'money_detox';
}

/**
 * @param {string} note
 */
export function recordCoachingCheckin(note = '') {
  const enrollment = loadActiveEnrollment();
  if (!enrollment) return null;
  enrollment.checkins = enrollment.checkins || [];
  enrollment.checkins.unshift({
    at: new Date().toISOString(),
    note: String(note).slice(0, 200),
  });
  localStorage.setItem(LS_ENROLLMENT, JSON.stringify(enrollment));
  return enrollment;
}

/**
 * Cancel active plan.
 */
export function cancelCoachingPlan() {
  localStorage.removeItem(LS_ENROLLMENT);
  localStorage.removeItem(LS_PROGRESS);
}

if (typeof window !== 'undefined') {
  window.monefyiCoachingPlans = {
    COACHING_PLANS,
    loadActiveEnrollment,
    enrollCoachingPlan,
    getActivePlanWithProgress,
    recommendPlanId,
    recordCoachingCheckin,
    cancelCoachingPlan,
  };
}
