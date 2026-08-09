/**
 * Money personality test — 8 types, strategy mapping (Fase 8.1).
 * @module services/money-personality
 */

const LS_RESULT = 'monefyi_money_personality';

/** @type {object[]} */
export const PERSONALITY_QUESTIONS = [
  { id: 'q1', text: 'Saat dapat bonus, kamu biasanya…', options: [
    { label: 'Langsung belanja reward diri', scores: { spender: 2 } },
    { label: 'Sisihkan sebagian, sisanya enjoy', scores: { balanced: 1, spender: 1 } },
    { label: 'Masukkan ke tabungan/investasi', scores: { saver: 2 } },
    { label: 'Bayar utang dulu', scores: { debt_focused: 2 } },
  ]},
  { id: 'q2', text: 'Tracking pengeluaran untukmu…', options: [
    { label: 'Membosankan, jarang catat', scores: { avoider: 2 } },
    { label: 'Catat kalau ingat saja', scores: { spontaneous: 2 } },
    { label: 'Catat rutin, tapi fleksibel', scores: { balanced: 2 } },
    { label: 'Harus detail, kalau tidak anxiety', scores: { planner: 2 } },
  ]},
  { id: 'q3', text: 'Tentang risiko investasi…', options: [
    { label: 'Takut rugi, prefer tabungan', scores: { saver: 1, avoider: 1 } },
    { label: 'Moderat, mix RD + emas', scores: { balanced: 2 } },
    { label: 'Agresif, saham/crypto OK', scores: { investor: 2 } },
    { label: 'Fokus lunasi utang dulu', scores: { debt_focused: 2 } },
  ]},
  { id: 'q4', text: 'Belanja online saat flash sale…', options: [
    { label: 'Sering FOMO checkout', scores: { spender: 2 } },
    { label: 'Tambah keranjang, mikir dulu', scores: { spontaneous: 1, balanced: 1 } },
    { label: 'Hampir never, unless planned', scores: { planner: 2 } },
    { label: 'Cek budget dulu baru beli', scores: { saver: 1, planner: 1 } },
  ]},
  { id: 'q5', text: 'Utang/cicilan bagimu…', options: [
    { label: 'Tool normal, asal bisa bayar', scores: { spender: 1, spontaneous: 1 } },
    { label: 'Hindari sebisa mungkin', scores: { saver: 2 } },
    { label: 'Ada rencana pelunasan jelas', scores: { debt_focused: 2 } },
    { label: 'Stressful, sering diabaikan', scores: { avoider: 2 } },
  ]},
  { id: 'q6', text: 'Goals finansial jangka panjang…', options: [
    { label: 'Belum punya / vague', scores: { spontaneous: 2 } },
    { label: 'Punya tapi jarang review', scores: { balanced: 1, spontaneous: 1 } },
    { label: 'Punya target + timeline jelas', scores: { planner: 2 } },
    { label: 'Fokus grow wealth & passive income', scores: { investor: 2 } },
  ]},
  { id: 'q7', text: 'Saat teman ajak makan mahal…', options: [
    { label: 'Ikut, nanti mikir later', scores: { spender: 2 } },
    { label: 'Ikut tapi pilih menu murah', scores: { balanced: 2 } },
    { label: 'Tolak atau suggest tempat lebih murah', scores: { saver: 2 } },
    { label: 'Cek dulu sisa budget minggu ini', scores: { planner: 2 } },
  ]},
  { id: 'q8', text: 'Dana darurat ideal menurutmu…', options: [
    { label: 'Tidak pernah mikirin', scores: { avoider: 1, spontaneous: 1 } },
    { label: '1 bulan cukup', scores: { balanced: 1 } },
    { label: 'Minimal 3–6 bulan', scores: { saver: 2, planner: 1 } },
    { label: 'Sebanyak mungkin + invest sisanya', scores: { investor: 1, saver: 1 } },
  ]},
];

/** @type {Record<string, object>} */
export const PERSONALITY_TYPES = {
  saver: {
    id: 'saver', name: 'The Saver', icon: '🐢', tagline: 'Keamanan dulu',
    strategy: 'Pertahankan disiplin tabungan. Set target 20% income, review bulanan.',
    features: ['goal-tracker', 'health-score', 'weekly-digest'],
  },
  spender: {
    id: 'spender', name: 'The Spender', icon: '🛍️', tagline: 'Hidup di moment',
    strategy: 'Aktifkan impulse guard & budget harian ketat. Review top 3 kategori boros.',
    features: ['impulse-guard', 'budget-focus', 'smart-insights'],
  },
  planner: {
    id: 'planner', name: 'The Planner', icon: '📋', tagline: 'Struktur & kontrol',
    strategy: 'Manfaatkan budget template & monthly review. Track semua fixed bills.',
    features: ['recurring', 'monthly-review', 'debt-planner'],
  },
  investor: {
    id: 'investor', name: 'The Investor', icon: '📈', tagline: 'Grow the stack',
    strategy: 'Portfolio tracker + diversifikasi. Jangan abaikan dana darurat.',
    features: ['investment-tracker', 'what-if', 'health-score'],
  },
  debt_focused: {
    id: 'debt_focused', name: 'Debt Slayer', icon: '💳', tagline: 'Bebas utang',
    strategy: 'Debt payoff planner avalanche/snowball. Kurangi keinginan sementara.',
    features: ['debt-planner', 'budget-focus-debt', 'monevisor'],
  },
  balanced: {
    id: 'balanced', name: 'The Balanced', icon: '⚖️', tagline: 'Middle ground',
    strategy: 'Maintain saving rate 15–20%. Weekly check-in cukup.',
    features: ['weekly-digest', 'smart-insights', 'benchmark'],
  },
  spontaneous: {
    id: 'spontaneous', name: 'The Spontaneous', icon: '🎲', tagline: 'Go with flow',
    strategy: 'Catat transaksi same-day. Set reminder streak & safe-to-spend harian.',
    features: ['streak', 'impulse-guard', 'daily-hero'],
  },
  avoider: {
    id: 'avoider', name: 'The Avoider', icon: '🙈', tagline: 'Money anxiety',
    strategy: 'Mulai kecil: 1 transaksi/hari. Wellness check-in untuk reduce stress.',
    features: ['wellness', 'simple-home', 'monevisor-coach'],
  },
};

/**
 * @param {Record<string, string>} answers questionId -> optionIndex
 * @returns {object}
 */
export function computePersonalityResult(answers) {
  /** @type {Record<string, number>} */
  const totals = {};
  for (const q of PERSONALITY_QUESTIONS) {
    const idx = Number(answers[q.id]);
    const opt = q.options[idx];
    if (!opt?.scores) continue;
    for (const [k, v] of Object.entries(opt.scores)) {
      totals[k] = (totals[k] || 0) + v;
    }
  }

  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'balanced';
  const type = PERSONALITY_TYPES[top] || PERSONALITY_TYPES.balanced;

  return {
    type_id: top,
    ...type,
    scores: totals,
    completed_at: new Date().toISOString(),
  };
}

/**
 * @param {object} result
 */
export function savePersonalityResult(result) {
  localStorage.setItem(LS_RESULT, JSON.stringify(result));
  if (typeof window !== 'undefined' && window.STATE?.db?.userPreferences) {
    window.STATE.db.userPreferences.money_personality = result.type_id;
  }
  return result;
}

/**
 * @returns {object|null}
 */
export function loadPersonalityResult() {
  try {
    return JSON.parse(localStorage.getItem(LS_RESULT) || 'null');
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.monefyiPersonality = {
    PERSONALITY_QUESTIONS, PERSONALITY_TYPES, computePersonalityResult, savePersonalityResult, loadPersonalityResult,
  };
}
