/**
 * Local heuristic insights — offline fallback.
 * Same shape as enhanced monefyi-generate-insights response.
 * @module services/monevisor-heuristic
 */

/**
 * @param {object} context
 * @returns {Promise<object>}
 */
export async function generateInsights(context = {}) {
  const {
    budgets = [],
    transactions = [],
    income = {},
    previous_month_summary = {},
    lang = 'id',
  } = context;

  const totalIncome = Number(income.total || 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? net / totalIncome : 0;

  let score = 50;
  if (savingRate > 0.20) score += 25;
  else if (savingRate > 0.10) score += 15;
  else if (savingRate < 0) score -= 20;

  const overBudgets = budgets.filter((b) => Number(b.percent_used || 0) > 100);
  score -= overBudgets.length * 5;
  score = Math.max(0, Math.min(100, score));

  let healthLabel = 'poor';
  if (score >= 80) healthLabel = 'excellent';
  else if (score >= 65) healthLabel = 'good';
  else if (score >= 45) healthLabel = 'fair';

  const prevSavingRate = Number(previous_month_summary.saving_rate || 0);
  let trend = 'stable';
  if (savingRate > prevSavingRate + 0.05) trend = 'up';
  else if (savingRate < prevSavingRate - 0.05) trend = 'down';

  const story = generateStory({ savingRate, trend, overBudgets, lang });
  const insights = [];

  if (savingRate > 0.20) {
    insights.push({
      id: 'high-savings',
      type: 'achievement',
      icon: 'trophy',
      title: lang === 'en' ? 'Strong savings!' : 'Tabungan Kamu Excellent!',
      body: lang === 'en'
        ? `You saved ${Math.round(savingRate * 100)}% of income. Keep it up!`
        : `Kamu berhasil hemat ${Math.round(savingRate * 100)}% dari income. Terus pertahankan!`,
      severity: 'low',
    });
  }

  for (const b of overBudgets.slice(0, 3)) {
    const suggested = Math.ceil((Number(b.spent || 0) * 1.1) / 10000) * 10000;
    insights.push({
      id: `over-${b.id || b.category}`,
      type: 'warning',
      icon: 'alert',
      title: `${b.category} Over Budget`,
      body: lang === 'en'
        ? `Already at ${b.percent_used}% (over by Rp ${fmt(b.spent - b.amount)}).`
        : `Sudah terpakai ${b.percent_used}% (Rp ${fmt(b.spent - b.amount)} lebih dari plan).`,
      severity: 'high',
      action: {
        type: 'increase_budget',
        label: lang === 'en' ? `Raise to Rp ${fmt(suggested)}` : `Naikkan ke Rp ${fmt(suggested)}`,
        payload: {
          budget_id: b.id,
          category: b.category,
          new_amount: suggested,
          month: context.periodStart?.slice?.(0, 7),
        },
      },
    });
  }

  const mauBudgets = budgets.filter((b) => b.priority === 'mau' && Number(b.percent_used || 0) < 60);
  const overHarus = budgets.find((b) => b.priority === 'harus' && Number(b.percent_used || 0) > 100);

  if (mauBudgets.length > 0 && overHarus) {
    const source = mauBudgets[0];
    const amount = Math.min(
      Number(source.amount || 0) - Number(source.spent || 0),
      Number(overHarus.spent || 0) - Number(overHarus.amount || 0),
    );
    if (amount > 50000) {
      insights.push({
        id: 'reallocate-suggestion',
        type: 'tip',
        icon: 'lightbulb',
        title: lang === 'en' ? 'Smart reallocation' : 'Realokasi Cerdas',
        body: lang === 'en'
          ? `"${source.category}" (Want) is only ${source.percent_used}% used. Move Rp ${fmt(amount)} to "${overHarus.category}" (Must).`
          : `Kategori "${source.category}" (Keinginan) baru terpakai ${source.percent_used}%. Pindahkan Rp ${fmt(amount)} ke "${overHarus.category}" (Wajib).`,
        severity: 'medium',
        action: {
          type: 'reallocate',
          label: lang === 'en' ? 'Reallocate now' : 'Realokasi Sekarang',
          payload: {
            from_budget_id: source.id,
            to_budget_id: overHarus.id,
            from_category: source.category,
            to_category: overHarus.category,
            amount,
            month: context.periodStart?.slice?.(0, 7),
          },
        },
      });
    }
  }

  const categorySpending = {};
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    const cat = t.category || 'Lainnya';
    categorySpending[cat] = (categorySpending[cat] || 0) + Number(t.amount || 0);
  }
  const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && totalExpense > 0) {
    insights.push({
      id: 'top-category',
      type: 'pattern',
      icon: 'trending_up',
      title: lang === 'en' ? `Top spend: ${topCategory[0]}` : `Pengeluaran Terbesar: ${topCategory[0]}`,
      body: lang === 'en'
        ? `Rp ${fmt(topCategory[1])} or ${Math.round((topCategory[1] / totalExpense) * 100)}% of total.`
        : `Rp ${fmt(topCategory[1])} atau ${Math.round((topCategory[1] / totalExpense) * 100)}% dari total. Wajar untuk kategori ini?`,
      severity: 'low',
      action: {
        type: 'view_category',
        label: lang === 'en' ? 'Review detail' : 'Review Detail',
        payload: { category: topCategory[0] },
      },
    });
  }

  if (net > 0 && trend === 'up') {
    insights.push({
      id: 'milestone',
      type: 'milestone',
      icon: 'target',
      title: lang === 'en' ? 'Consistent saving' : 'Konsisten Menabung',
      body: lang === 'en'
        ? `This month added Rp ${fmt(net)} to savings. Positive vs last month.`
        : `Bulan ini bertambah Rp ${fmt(net)} ke tabungan. Trend positif dari bulan lalu.`,
      severity: 'low',
    });
  }

  const questions = [];
  if (overBudgets.length > 0) {
    questions.push(
      lang === 'en'
        ? `Why is ${overBudgets[0].category} over budget?`
        : `Kenapa ${overBudgets[0].category} bisa over budget?`,
    );
  }
  questions.push(lang === 'en' ? 'Which category spends the most?' : 'Kategori mana yang paling boros?');
  questions.push(lang === 'en' ? 'How can I save more?' : 'Gimana caranya nabung lebih banyak?');
  if (totalExpense > 0) {
    questions.push(lang === 'en' ? 'How much can I save next month?' : 'Bisa hemat berapa bulan depan?');
  }

  const budgetRecommendations = generateBudgetRecs(budgets, context.periodStart?.slice?.(0, 7), lang);
  const greeting = generateGreeting(trend, savingRate, lang);
  const summary = lang === 'en'
    ? `Income ${fmt(totalIncome)}, expense ${fmt(totalExpense)}, net ${fmt(net)}.`
    : `Pemasukan Rp ${fmt(totalIncome)}, pengeluaran Rp ${fmt(totalExpense)}, net Rp ${fmt(net)}.`;

  return {
    greeting,
    story,
    summary,
    metrics: {
      income: totalIncome,
      expense: totalExpense,
      net,
      saving_rate: savingRate,
    },
    healthScore: score,
    healthLabel,
    healthTrend: trend,
    healthMessage: generateHealthMessage(score, trend, lang),
    insights,
    bullets: insights.slice(0, 5).map((i) => `${i.title}: ${i.body}`),
    tips: questions.slice(0, 3),
    alerts: overBudgets.length
      ? [lang === 'en' ? `${overBudgets.length} categories over budget.` : `${overBudgets.length} kategori over budget.`]
      : [],
    budgetRecommendations,
    suggested_questions: questions,
    source: 'heuristic_fallback',
    disclaimer: lang === 'en'
      ? 'Local analysis from saved data. Go online for deeper AI insights.'
      : 'Analisis lokal berdasarkan data yang tersimpan. Untuk analisa lebih mendalam, aktifkan mode online.',
  };
}

function generateStory({ savingRate, trend, overBudgets, lang }) {
  const parts = [];
  if (savingRate > 0.15) {
    parts.push(lang === 'en' ? 'Your finances look healthy this month' : 'Kamu punya keuangan yang sehat bulan ini');
  } else if (savingRate > 0) {
    parts.push(lang === 'en' ? 'You managed to save, with room to optimize' : 'Kamu berhasil menabung, meski masih bisa dioptimalkan');
  } else {
    parts.push(lang === 'en' ? 'Spending exceeds income this month' : 'Pengeluaran kamu lebih besar dari income bulan ini');
  }
  if (overBudgets.length > 0) {
    parts.push(
      lang === 'en'
        ? `${overBudgets.length} categories are over budget`
        : `ada ${overBudgets.length} kategori yang over budget`,
    );
  }
  if (trend === 'up') parts.push(lang === 'en' ? 'and things improved vs last month' : 'dan kondisimu membaik dari bulan lalu');
  else if (trend === 'down') parts.push(lang === 'en' ? 'but there is a dip vs last month' : 'tapi ada penurunan dari bulan lalu');
  return `${parts.join(', ')}.`;
}

function generateGreeting(trend, savingRate, lang) {
  const hour = new Date().getHours();
  let salam = lang === 'en' ? 'Hello' : 'Halo';
  if (hour < 11) salam = lang === 'en' ? 'Good morning' : 'Selamat pagi';
  else if (hour < 15) salam = lang === 'en' ? 'Good afternoon' : 'Selamat siang';
  else if (hour < 18) salam = lang === 'en' ? 'Good afternoon' : 'Selamat sore';
  else salam = lang === 'en' ? 'Good evening' : 'Selamat malam';

  if (trend === 'up' && savingRate > 0.15) {
    return lang === 'en'
      ? `${salam}! Good news — your finances look healthier.`
      : `${salam}! Kabar baik nih, keuangan kamu makin sehat!`;
  }
  if (trend === 'down') {
    return lang === 'en'
      ? `${salam}. A few things need a closer look together.`
      : `${salam}. Ada beberapa hal yang perlu kita review bareng.`;
  }
  return lang === 'en'
    ? `${salam}! Let's check your money story.`
    : `${salam}! Yuk cek kondisi keuanganmu.`;
}

function generateHealthMessage(score, trend, lang) {
  if (score >= 80) {
    return trend === 'up'
      ? (lang === 'en' ? 'Excellent! Up from last month.' : 'Excellent! Naik dari bulan lalu.')
      : (lang === 'en' ? 'Looking great — keep it up.' : 'Kondisi sangat baik, pertahankan.');
  }
  if (score >= 65) {
    return trend === 'up'
      ? (lang === 'en' ? 'Good and trending up!' : 'Bagus dan trending naik!')
      : (lang === 'en' ? 'Good — stay consistent.' : 'Kondisi baik, terus dijaga.');
  }
  if (score >= 45) {
    return trend === 'up'
      ? (lang === 'en' ? 'Fair, slight improvement.' : 'Cukup, sedikit peningkatan.')
      : (lang === 'en' ? 'Fair, but can be better.' : 'Cukup, tapi masih bisa lebih baik.');
  }
  return trend === 'up'
    ? (lang === 'en' ? 'Needs work, but there is progress.' : 'Perlu perbaikan, tapi ada progress.')
    : (lang === 'en' ? 'Needs action to improve.' : 'Perlu action untuk perbaikan.');
}

function generateBudgetRecs(budgets, month, lang) {
  return budgets
    .filter((b) => Number(b.percent_used || 0) > 100 || Number(b.percent_used || 0) < 30)
    .slice(0, 3)
    .map((b) => {
      const suggested = Number(b.percent_used || 0) > 100
        ? Math.ceil((Number(b.spent || 0) * 1.1) / 10000) * 10000
        : Math.ceil((Number(b.spent || 0) * 1.2) / 10000) * 10000;

      return {
        category: b.category,
        priority: b.priority,
        current: Number(b.amount || 0),
        suggested,
        planned: suggested,
        reason: Number(b.percent_used || 0) > 100
          ? (lang === 'en' ? `Over ${b.percent_used}% — raise suggested` : `Over budget ${b.percent_used}%, disarankan naikkan`)
          : (lang === 'en' ? `Under-utilized (${b.percent_used}%)` : `Under-utilized (${b.percent_used}%), bisa diturunkan`),
        impact: Number(b.percent_used || 0) > 100
          ? (lang === 'en' ? `Avoid over Rp ${fmt(b.spent - b.amount)}` : `Hindari over Rp ${fmt(b.spent - b.amount)} lagi`)
          : (lang === 'en' ? `Free Rp ${fmt(b.amount - suggested)}` : `Hemat Rp ${fmt(b.amount - suggested)}`),
        action: {
          type: Number(b.percent_used || 0) > 100 ? 'increase_budget' : 'decrease_budget',
          payload: { budget_id: b.id, category: b.category, new_amount: suggested, month },
        },
      };
    });
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(num || 0)));
}

if (typeof window !== 'undefined') {
  window.monefyiMonevisorHeuristic = { generateInsights };
}
