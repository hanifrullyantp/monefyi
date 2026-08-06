/**
 * Monevisor intervention engine — actionable output (KONDISI / RISIKO / LANGKAH / DAMPAK).
 * @module services/monevisor-intervention
 */

import { computeDailySituation } from './daily-situation.js';

const STATUS_LABELS = {
  aman: '✅ Aman',
  waspada: '⚠️ Waspada',
  bahaya: '🚨 Bahaya',
  incomplete: '📋 Data Kurang',
};

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return `Rp ${Math.round(Number(n || 0)).toLocaleString('id-ID')}`;
}

/**
 * @param {object[]} transactions
 * @param {number} daysBack
 * @returns {number}
 */
function sumExpenseDays(transactions, daysBack, offset = 0) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let total = 0;
  for (let i = offset; i < offset + daysBack; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    total += (transactions || [])
      .filter((t) => {
        if (t.date !== iso) return false;
        const type = String(t.type || 'expense').toLowerCase();
        return type === 'expense' || type === 'pengeluaran' || type === 'out';
      })
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }
  return total;
}

/**
 * @param {object} report
 * @returns {{ pct: number|null, topCats: string[] }}
 */
function getWeekSpendShift(report) {
  const txs = report?.transactions || [];
  const thisWeek = sumExpenseDays(txs, 7, 0);
  const lastWeek = sumExpenseDays(txs, 7, 7);
  const pct = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

  const catMap = new Map();
  const today = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    for (const t of txs) {
      if (t.date !== iso) continue;
      const type = String(t.type || 'expense').toLowerCase();
      if (type !== 'expense' && type !== 'pengeluaran' && type !== 'out') continue;
      const cat = String(t.category || 'Lainnya');
      catMap.set(cat, (catMap.get(cat) || 0) + Number(t.amount || 0));
    }
  }
  const topCats = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([name]) => name);

  return { pct, topCats, thisWeek, lastWeek };
}

/**
 * @param {object} report
 * @returns {object|null}
 */
function findWorstBudget(report) {
  const rows = report?.budgetComparison || report?.budgets || [];
  let worst = null;
  for (const b of rows) {
    const pct = Number(b.percent_used ?? b.percentUsed ?? 0);
    if (pct < 80) continue;
    if (!worst || pct > Number(worst.percent_used || 0)) {
      worst = {
        ...b,
        category: b.category || b.name,
        percent_used: pct,
        spent: Number(b.spent || 0),
        amount: Number(b.amount || 0),
      };
    }
  }
  return worst;
}

/**
 * Build primary intervention from report + diagnosis.
 * @param {object} report
 * @param {object} diagnosis
 * @param {object} [state]
 * @returns {object}
 */
export function buildIntervention(report, diagnosis, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const situation = computeDailySituation(state);
  const m = report?.metrics || {};
  const income = Number(m.income ?? m.totalIncome ?? 0);
  const expense = Number(m.expense ?? m.totalExpense ?? 0);
  const net = Number(m.net ?? (income - expense));
  const savingRate = Number(m.saving_rate ?? m.savingRate ?? (income > 0 ? net / income : 0));
  const month = report?.month
    || state?.selectedMonth
    || new Date().toISOString().slice(0, 7);

  const week = getWeekSpendShift(report);
  const worstBudget = findWorstBudget(report);
  const health = diagnosis?.health || {};

  let conditionLabel = STATUS_LABELS[situation.status] || STATUS_LABELS.waspada;
  if (situation.status === 'incomplete') {
    conditionLabel = health.score >= 65 ? '⚠️ Waspada' : STATUS_LABELS.incomplete;
  }

  let conditionText = '';
  let riskText = '';
  let stepText = '';
  let impactText = '';
  /** @type {object|null} */
  let action = null;

  if (situation.status === 'incomplete' && income <= 0) {
    conditionText = 'Pemasukan bulanan belum lengkap, jadi prediksi dan batas aman belum bisa dihitung akurat.';
    riskText = 'Tanpa data income, rekomendasi budget dan saving rate bisa meleset.';
    stepText = 'Catat pemasukan bulan ini (gaji, freelance, atau sumber lain).';
    impactText = 'Setelah income tercatat, Monevisor bisa hitung batas aman harian dan langkah fokus.';
    action = {
      type: 'navigate',
      label: 'Catat Income',
      payload: { target: 'income' },
    };
  } else if (worstBudget && Number(worstBudget.percent_used) >= 100) {
    const over = Math.max(0, worstBudget.spent - worstBudget.amount);
    conditionText = `Kategori ${worstBudget.category} sudah over budget (${Math.round(worstBudget.percent_used)}%).`;
    if (week.pct !== null && week.pct > 10) {
      conditionText += ` Pengeluaran 7 hari terakhir ${Math.round(Math.abs(week.pct))}% ${week.pct > 0 ? 'lebih tinggi' : 'lebih rendah'} dari minggu sebelumnya.`;
    }
    riskText = over > 0
      ? `Kelebihan di ${worstBudget.category} sudah ${fmt(over)} — bisa menekan sisa budget flexible bulan ini.`
      : `Jika pola ini lanjut, prediksi saldo akhir bulan minus ${fmt(Math.abs(situation.predictedEndBalance || net))}.`;
    stepText = `Bekukan pengeluaran kategori ${worstBudget.category} sampai akhir bulan.`;
    impactText = `Dengan freeze, tekanan defisit berkurang dan sisa flexible naik ±${fmt(Math.min(worstBudget.spent, worstBudget.amount * 0.3))}.`;
    action = {
      type: 'decrease_budget',
      label: `Bekukan ${worstBudget.category}`,
      payload: {
        budget_id: worstBudget.id,
        category: worstBudget.category,
        new_amount: 0,
        month,
      },
    };
  } else if (situation.status === 'bahaya' || net < 0) {
    const deficit = net < 0 ? Math.abs(net) : Math.abs(situation.predictedEndBalance || 0);
    conditionText = week.pct !== null && week.pct > 15
      ? `Pengeluaran minggu ini ${Math.round(week.pct)}% lebih tinggi dari minggu lalu${week.topCats.length ? `, terutama di ${week.topCats.join(' dan ')}` : ''}.`
      : `Pengeluaran bulan ini melebihi pemasukan (${fmt(expense)} vs ${fmt(income)}).`;
    const runoutDay = situation.runoutDayOfMonth;
    riskText = runoutDay
      ? `Jika pola ini lanjut, kamu diprediksi minus ${fmt(deficit)} sebelum tanggal ${runoutDay}.`
      : `Jika pola ini lanjut, defisit bulan ini bisa mencapai ${fmt(deficit)}.`;
    const targetCat = worstBudget?.category || week.topCats[0] || 'pengeluaran flexible';
    stepText = worstBudget
      ? `Kurangi atau bekukan kategori ${targetCat} sampai akhir bulan.`
      : 'Review 5 transaksi terbesar minggu ini dan tandai yang bisa ditunda.';
    impactText = net < 0
      ? `Menutup gap ${fmt(deficit)} mengembalikan cash flow ke break-even atau surplus kecil.`
      : 'Menjaga pengeluaran di bawah rata-rata 7 hari membantu prediksi kembali positif.';
    action = worstBudget
      ? {
        type: 'decrease_budget',
        label: `Bekukan ${targetCat}`,
        payload: {
          budget_id: worstBudget.id,
          category: worstBudget.category,
          new_amount: 0,
          month,
        },
      }
      : {
        type: 'view_category',
        label: week.topCats[0] ? `Lihat ${week.topCats[0]}` : 'Lihat transaksi',
        payload: { category: week.topCats[0] || '', target: 'transactions' },
      };
  } else if (worstBudget && Number(worstBudget.percent_used) >= 80) {
    conditionText = `Kategori ${worstBudget.category} sudah ${Math.round(worstBudget.percent_used)}% dari budget.`;
    riskText = `Sisa ${worstBudget.category} tinggal ${fmt(Math.max(0, worstBudget.amount - worstBudget.spent))} — mudah over jika pola lanjut.`;
    stepText = `Tahan pengeluaran ${worstBudget.category} sampai tanggal ${Math.min(28, new Date().getDate() + 7)}.`;
    impactText = 'Menahan kategori ini menjaga safe-to-spend harian tetap aman.';
    action = {
      type: 'view_category',
      label: `Lihat transaksi ${worstBudget.category}`,
      payload: { category: worstBudget.category, target: 'transactions' },
    };
  } else if (savingRate < 0.1 && income > 0) {
    conditionText = `Saving rate bulan ini ${Math.round(savingRate * 100)}% — di bawah target 20%.`;
    riskText = `Tanpa sisihkan tabungan, buffer darurat sulit tumbuh (net saat ini ${fmt(net)}).`;
    stepText = 'Alokasikan minimal 10% income ke kategori simpan di budget.';
    impactText = `Menyisihkan 10% (${fmt(income * 0.1)}/bulan) mempercepat dana darurat.`;
    action = {
      type: 'navigate',
      label: 'Atur Budget',
      payload: { target: 'budget' },
    };
  } else {
    conditionText = week.pct !== null && Math.abs(week.pct) >= 10
      ? `Pengeluaran minggu ini ${Math.round(Math.abs(week.pct))}% ${week.pct > 0 ? 'lebih tinggi' : 'lebih rendah'} dari minggu lalu.`
      : (health.message || 'Pola pengeluaran relatif stabil minggu ini.');
    riskText = situation.predictedEndBalance >= 0
      ? `Proyeksi akhir bulan surplus ±${fmt(situation.predictedEndBalance)} jika pola konsisten.`
      : `Waspada: proyeksi akhir bulan ${fmt(situation.predictedEndBalance)}.`;
    stepText = 'Pertahankan catat transaksi harian dan cek budget sekali seminggu.';
    impactText = 'Konsistensi catat → prediksi dan rekomendasi Monevisor makin akurat.';
    action = {
      type: 'navigate',
      label: 'Buka Budget',
      payload: { target: 'budget' },
    };
  }

  return {
    condition: { label: conditionLabel, text: conditionText.slice(0, 280) },
    risk: { text: riskText.slice(0, 200) },
    step: { text: stepText.slice(0, 200), action },
    impact: { text: impactText.slice(0, 200) },
  };
}

/**
 * Contextual starter questions for Monevisor chat.
 * @param {object} report
 * @param {object} diagnosis
 * @param {object} [state]
 * @returns {string[]}
 */
export function generateStarterQuestions(report, diagnosis, state = typeof window !== 'undefined' ? window.STATE : {}) {
  const questions = [];
  const situation = computeDailySituation(state);
  const worstBudget = findWorstBudget(report);
  const m = report?.metrics || {};
  const savingRate = Number(m.saving_rate ?? m.savingRate ?? 0);
  const prefs = state?.db?.userPreferences || {};
  const hasDebt = !!prefs.has_debt || Number(prefs.monthly_debt_payment || 0) > 0;

  if (worstBudget && Number(worstBudget.percent_used) >= 80) {
    questions.push(`Kenapa kategori ${worstBudget.category} saya bisa setinggi ini?`);
  }

  if (situation.status === 'bahaya' || (situation.runwayDays && situation.runwayDays < 7)) {
    questions.push('Apa yang bisa saya kurangi minggu ini?');
  }

  if (hasDebt) {
    const pay = Number(prefs.monthly_debt_payment || 0);
    questions.push(
      pay > 0
        ? `Kapan utang saya bisa lunas kalau saya bayar ${fmt(pay)} per bulan?`
        : 'Kapan utang saya bisa lunas kalau saya tambah cicilan bulan ini?',
    );
  }

  if (savingRate < 0.15 && Number(m.income ?? m.totalIncome ?? 0) > 0) {
    questions.push('Berapa minimal yang harus saya sisihkan bulan ini?');
  }

  const defaults = [
    'Kategori mana yang paling perlu saya kurangi?',
    'Apa langkah paling cepat perbaiki cash flow bulan ini?',
    'Buatkan rencana keuangan 7 hari ke depan',
  ];

  for (const q of defaults) {
    if (questions.length >= 4) break;
    if (!questions.includes(q)) questions.push(q);
  }

  return questions.slice(0, 4);
}
