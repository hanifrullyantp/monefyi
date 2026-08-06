/**
 * Generate personalized 7-day first-week plan from onboarding answers.
 * @module services/onboarding-plan-generator
 */

/** @typedef {import('./onboarding-prefs.js').OnboardingPrefsInput} OnboardingPrefsInput */

export const FINANCIAL_PROBLEMS = [
  { id: 'salary_gone_early', label: 'Gaji habis sebelum akhir bulan' },
  { id: 'unknown_spending', label: 'Tidak tahu uang pergi ke mana' },
  { id: 'has_debt', label: 'Ada utang yang belum lunas' },
  { id: 'no_savings', label: 'Belum punya tabungan sama sekali' },
  { id: 'uncontrolled_spending', label: 'Pengeluaran sering tidak terkontrol' },
  { id: 'invest_confused', label: 'Ingin mulai investasi tapi bingung' },
];

export const NEAR_TERM_GOALS = [
  { id: 'safe_until_payday', label: 'Tidak tekor sebelum gajian' },
  { id: 'emergency_fund_3mo', label: 'Punya dana darurat minimal 3 bulan pengeluaran' },
  { id: 'pay_off_debt', label: 'Lunas utang' },
  { id: 'start_investing', label: 'Mulai investasi rutin' },
  { id: 'vacation_no_debt', label: 'Bisa liburan tanpa utang' },
  { id: 'custom', label: 'Lainnya (tulis sendiri)' },
];

const PROBLEM_PRIORITY = [
  'salary_gone_early',
  'has_debt',
  'uncontrolled_spending',
  'unknown_spending',
  'no_savings',
  'invest_confused',
];

/** @type {Record<string, { day: number, title: string, hint: string, auto_key: string }[]>} */
const BASE_PLANS = {
  salary_gone_early: [
    { day: 1, title: 'Masukkan semua tagihan wajib bulan ini', hint: 'Pastikan cicilan, kontrakan, listrik tercatat di budget.', auto_key: 'add_fixed_bills' },
    { day: 2, title: 'Catat semua pengeluaran hari ini', hint: 'Berapapun kecilnya — kopi, parkir, jajan.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Lihat 3 kategori pengeluaran terbesar', hint: 'Buka Monevisor untuk lihat ke mana uangmu pergi.', auto_key: 'view_top_categories' },
    { day: 4, title: 'Set batas pengeluaran harian', hint: 'Buka budget dan tentukan batas fleksibel harian.', auto_key: 'set_daily_limit' },
    { day: 5, title: 'Review — ada yang bisa dikurangi?', hint: 'Scroll transaksi minggu ini, tandai yang bisa ditahan.', auto_key: 'review_spending' },
    { day: 6, title: 'Sisihkan pertama kali (Rp10.000 pun cukup)', hint: 'Catat pemasukan/tabungan kecil ke kategori Simpan.', auto_key: 'first_saving' },
    { day: 7, title: 'Buka Monevisor, lihat kondisi pertamamu', hint: 'Lihat skor dan insight dari data 6 hari ini.', auto_key: 'open_monevisor' },
  ],
  unknown_spending: [
    { day: 1, title: 'Catat 3 pengeluaran terakhir yang kamu ingat', hint: 'Mulai dari yang paling fresh di ingatan.', auto_key: 'log_today_spending' },
    { day: 2, title: 'Catat semua pengeluaran hari ini', hint: 'Satu hari penuh tanpa skip.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Lihat 3 kategori pengeluaran terbesar', hint: 'Surprise — biasanya bukan yang kamu kira.', auto_key: 'view_top_categories' },
    { day: 4, title: 'Masukkan tagihan wajib bulan ini', hint: 'Pisahkan yang wajib vs yang fleksibel.', auto_key: 'add_fixed_bills' },
    { day: 5, title: 'Review transaksi 3 hari terakhir', hint: 'Ada pola yang bisa dikurangi?', auto_key: 'review_spending' },
    { day: 6, title: 'Set budget untuk kategori terbesar', hint: 'Batasi kategori yang paling boros.', auto_key: 'set_daily_limit' },
    { day: 7, title: 'Buka Monevisor, lihat kondisi pertamamu', hint: 'Bandingkan rencana vs realisasi.', auto_key: 'open_monevisor' },
  ],
  has_debt: [
    { day: 1, title: 'Catat semua utang aktif + cicilan bulanan', hint: 'Masukkan ke tagihan wajib di budget.', auto_key: 'add_fixed_bills' },
    { day: 2, title: 'Catat pengeluaran hari ini', hint: 'Tanpa data lengkap, utang sulit dilunasi.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Lihat berapa sisa setelah tagihan wajib', hint: 'Buka budget — sisanya untuk hidup + bayar utang.', auto_key: 'set_daily_limit' },
    { day: 4, title: 'Review pengeluaran non-wajib', hint: 'Apa yang bisa dialihkan ke cicilan utang?', auto_key: 'review_spending' },
    { day: 5, title: 'Lihat breakdown kategori di Monevisor', hint: 'Temukan 1 kategori untuk dipangkas.', auto_key: 'view_top_categories' },
    { day: 6, title: 'Sisihkan untuk cicilan ekstra (sekecil apapun)', hint: 'Catat alokasi ke utang atau tabungan.', auto_key: 'first_saving' },
    { day: 7, title: 'Buka Monevisor, cek progress utangmu', hint: 'Lihat estimasi lunas dari pola saat ini.', auto_key: 'open_monevisor' },
  ],
  no_savings: [
    { day: 1, title: 'Masukkan tagihan wajib dulu', hint: 'Tahu sisa = tahu berapa yang bisa disisihkan.', auto_key: 'add_fixed_bills' },
    { day: 2, title: 'Catat semua pengeluaran hari ini', hint: 'Awareness dulu, tabungan menyusul.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Buat kategori Simpan di budget', hint: 'Walau Rp50rb/bulan — mulai dari situ.', auto_key: 'set_daily_limit' },
    { day: 4, title: 'Review — ada jajan yang bisa ditunda?', hint: 'Cari Rp10–50rb yang bisa pindah ke tabungan.', auto_key: 'review_spending' },
    { day: 5, title: 'Lihat kategori pengeluaran terbesar', hint: 'Kurangi sedikit = tabungan naik.', auto_key: 'view_top_categories' },
    { day: 6, title: 'Sisihkan pertama kali (Rp10.000 pun cukup)', hint: 'Momentum lebih penting dari nominal.', auto_key: 'first_saving' },
    { day: 7, title: 'Buka Monevisor, lihat saving rate-mu', hint: 'Baseline untuk minggu depan.', auto_key: 'open_monevisor' },
  ],
  uncontrolled_spending: [
    { day: 1, title: 'Masukkan tagihan wajib bulan ini', hint: 'Tahu dulu yang tidak bisa ditunda.', auto_key: 'add_fixed_bills' },
    { day: 2, title: 'Catat setiap pengeluaran hari ini', hint: 'Real-time, jangan nunggu malam.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Set batas kategori jajan/hiburan', hint: 'Batasi yang paling sering bocor.', auto_key: 'set_daily_limit' },
    { day: 4, title: 'Lihat 3 kategori pengeluaran terbesar', hint: 'Identifikasi pemboros utama.', auto_key: 'view_top_categories' },
    { day: 5, title: 'Review transaksi 2 hari terakhir', hint: 'Ada yang bisa di-cancel minggu depan?', auto_key: 'review_spending' },
    { day: 6, title: 'Sisihkan sisa hari ini ke tabungan', hint: 'Latihan menahan — reward kecil.', auto_key: 'first_saving' },
    { day: 7, title: 'Buka Monevisor, evaluasi minggu ini', hint: 'Apakah pengeluaran mulai terkendali?', auto_key: 'open_monevisor' },
  ],
  invest_confused: [
    { day: 1, title: 'Masukkan tagihan wajib + income bulan ini', hint: 'Investasi dimulai dari surplus yang jelas.', auto_key: 'add_fixed_bills' },
    { day: 2, title: 'Catat pengeluaran hari ini', hint: 'Surplus = income − pengeluaran − wajib.', auto_key: 'log_today_spending' },
    { day: 3, title: 'Buat kategori Simpan/Investasi di budget', hint: 'Alokasi kecil dulu, konsisten.', auto_key: 'set_daily_limit' },
    { day: 4, title: 'Review — berapa yang bisa disisihkan?', hint: 'Cari Rp100rb+ dari pengeluaran fleksibel.', auto_key: 'review_spending' },
    { day: 5, title: 'Lihat breakdown pengeluaran di Monevisor', hint: 'Temukan ruang untuk alokasi investasi.', auto_key: 'view_top_categories' },
    { day: 6, title: 'Sisihkan pertama kali ke tabungan', hint: 'Dana darurat dulu, investasi menyusul.', auto_key: 'first_saving' },
    { day: 7, title: 'Buka Monevisor, tanya langkah berikutnya', hint: 'Chat AI untuk rencana investasi awal.', auto_key: 'open_monevisor' },
  ],
};

/**
 * Pick primary problem from multi-select.
 * @param {string[]} problems
 * @returns {string}
 */
export function pickPrimaryProblem(problems = []) {
  const set = new Set(problems || []);
  for (const id of PROBLEM_PRIORITY) {
    if (set.has(id)) return id;
  }
  return problems[0] || 'salary_gone_early';
}

/**
 * Customize task titles based on prefs (debt name, custom goal).
 * @param {object} task
 * @param {OnboardingPrefsInput} prefs
 * @returns {object}
 */
function customizeTask(task, prefs) {
  let title = task.title;
  let hint = task.hint;

  if (prefs.near_term_goal === 'pay_off_debt' && prefs.debt_name && task.day === 7) {
    title = `Buka Monevisor, cek progress lunas ${prefs.debt_name}`;
  }
  if (prefs.near_term_goal === 'pay_off_debt' && prefs.debt_name && task.day === 1 && task.auto_key === 'add_fixed_bills') {
    hint = `Jangan lupa cicilan ${prefs.debt_name}.`;
  }
  if (prefs.near_term_goal === 'custom' && prefs.near_term_goal_custom && task.day === 7) {
    hint = `Fokus: ${prefs.near_term_goal_custom}`;
  }

  return { ...task, title, hint };
}

/**
 * Generate 7-day plan tasks from onboarding answers.
 * @param {OnboardingPrefsInput} prefs
 * @returns {object[]}
 */
export function generateFirstWeekPlan(prefs = {}) {
  const problems = Array.isArray(prefs.financial_problems) ? prefs.financial_problems : [];
  const primary = pickPrimaryProblem(problems);
  const template = BASE_PLANS[primary] || BASE_PLANS.salary_gone_early;

  return template.map((t, idx) => {
    const customized = customizeTask(t, prefs);
    return {
      id: `fw_${primary}_d${t.day}_${idx}`,
      day: t.day,
      title: customized.title,
      hint: customized.hint,
      auto_key: t.auto_key,
      completed: false,
      completed_at: null,
    };
  });
}

if (typeof window !== 'undefined') {
  window.__monefyiOnboardingPlanGen = {
    FINANCIAL_PROBLEMS,
    NEAR_TERM_GOALS,
    generateFirstWeekPlan,
    pickPrimaryProblem,
  };
}
