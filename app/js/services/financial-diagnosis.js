/**
 * Financial Diagnosis Engine
 * Transforms raw numbers into coach-level insights.
 * 100% offline, rule-based.
 *
 * @module services/financial-diagnosis
 */

/** @type {Readonly<object>} */
export const STANDARDS = {
  SAVING_RATE: { excellent: 30, good: 20, fair: 10, poor: 0 },
  EXPENSE_RATIO: { excellent: 50, good: 70, fair: 85, poor: 100 },
  EMERGENCY_FUND_MONTHS: { excellent: 6, good: 3, fair: 1, poor: 0 },
  BUDGET_ADHERENCE: { excellent: 90, good: 75, fair: 60, poor: 0 },
  CATEGORY_DIVERSITY: { min_categories: 3 },
  NEEDS_WANTS_SAVINGS: { needs: 50, wants: 30, savings: 20 },
};

/**
 * Normalize buildFinancialReport() shape → diagnosis input shape.
 * @param {object} report
 * @returns {object|null}
 */
function normalizeReport(report) {
  if (!report || !report.metrics) return null;

  const m = report.metrics;
  const totalIncome = Number(m.totalIncome ?? m.income ?? 0);
  const totalExpense = Number(m.totalExpense ?? m.expense ?? 0);
  const net = Number(m.net ?? (totalIncome - totalExpense));
  const savingRate = Number(
    m.savingRate ?? m.saving_rate ?? (totalIncome > 0 ? net / totalIncome : 0),
  );
  const transactionCount = Number(m.transactionCount ?? m.count ?? 0);

  const budgetComparison = (report.budgetComparison || report.budgets || []).map((b) => ({
    ...b,
    category: b.category || b.name || 'Budget',
    remaining: b.remaining ?? (Number(b.amount || 0) - Number(b.spent || 0)),
    status: b.status || 'healthy',
    priority: b.priority || 'penting',
  }));

  const categoryBreakdown = report.categoryBreakdown || report.categories || [];

  const dailyTrend = (report.dailyTrend || []).map((d) => ({
    ...d,
    day: d.day ?? (d.date ? Number(String(d.date).slice(8, 10)) : '?'),
    expense: Number(d.expense || 0),
  }));

  let monthComparison = report.monthComparison;
  if (!monthComparison && report.comparison) {
    const c = report.comparison;
    const prevExp = Number(c.previous?.expense || 0);
    const currExp = Number(c.current?.expense ?? totalExpense);
    monthComparison = {
      current: {
        expense: currExp,
        income: Number(c.current?.income ?? totalIncome),
        net: Number(c.current?.net ?? net),
      },
      previous: {
        expense: prevExp,
        income: Number(c.previous?.income || 0),
        net: Number(c.previous?.net || 0),
      },
      changes: {
        expense: prevExp > 0 ? ((currExp - prevExp) / prevExp) * 100 : null,
      },
    };
  }

  return {
    ...report,
    metrics: {
      ...m,
      totalIncome,
      totalExpense,
      net,
      savingRate,
      transactionCount,
    },
    budgetComparison,
    categoryBreakdown,
    dailyTrend,
    monthComparison,
  };
}

/**
 * Generate complete financial diagnosis.
 * @param {object} report - from buildFinancialReport()
 * @returns {object} diagnosis
 */
export function diagnoseFinancials(report) {
  const normalized = normalizeReport(report);
  if (!normalized) return emptyDiagnosis();

  const m = normalized.metrics;
  const hasBudgets = (normalized.budgetComparison || []).length > 0;
  const hasExpense = m.totalExpense > 0;
  const hasIncome = m.totalIncome > 0;

  const health = calculateHealth(m, normalized);
  const diagnoses = [];

  diagnoses.push(diagnoseCashFlow(m));

  if (hasIncome || hasExpense) {
    diagnoses.push(diagnoseSavingRate(m));
  }

  if (hasBudgets) {
    const budgetDx = diagnoseBudgetAdherence(normalized.budgetComparison);
    if (budgetDx) diagnoses.push(budgetDx);
  } else {
    diagnoses.push({
      id: 'no_budget',
      area: 'Budget',
      icon: 'target',
      status: 'warning',
      title: 'Budget Belum Aktif',
      explanation: 'Tanpa budget, sulit mengontrol pengeluaran. Ibarat navigasi tanpa peta.',
      benchmark: 'Standar: Minimal punya budget bulanan untuk 4 kategori utama.',
      impact: 'medium',
      action: {
        label: 'Buat Budget Sekarang',
        type: 'navigate',
        target: 'budget',
        description: 'Kami bisa generate budget otomatis berdasarkan pola pengeluaranmu.',
      },
    });
  }

  if (hasExpense) {
    diagnoses.push(diagnoseCategoryDiversity(normalized.categoryBreakdown));
  }

  if (!hasIncome && hasExpense) {
    diagnoses.push({
      id: 'no_income',
      area: 'Income',
      icon: 'wallet',
      status: 'critical',
      title: 'Income Belum Tercatat',
      explanation: 'Semua angka keuangan jadi tidak akurat tanpa data income. Saving rate, health score, semua butuh income sebagai dasar.',
      benchmark: 'Standar: Income harus dicatat untuk analisa yang benar.',
      impact: 'high',
      action: {
        label: 'Catat Income',
        type: 'navigate',
        target: 'income',
        description: 'Masukkan gaji, freelance, atau sumber income lain.',
      },
    });
  }

  if (hasExpense && normalized.dailyTrend?.length > 0) {
    const spike = diagnoseSpendingPattern(normalized.dailyTrend, m);
    if (spike) diagnoses.push(spike);
  }

  if (normalized.monthComparison) {
    const trend = diagnoseMonthTrend(normalized.monthComparison);
    if (trend) diagnoses.push(trend);
  }

  const impactOrder = { high: 0, medium: 1, low: 2 };
  const clean = diagnoses.filter(Boolean);
  clean.sort((a, b) => (impactOrder[a.impact] || 2) - (impactOrder[b.impact] || 2));

  return {
    health,
    summary: generateCoachSummary(health, clean, m),
    highlights: generateHighlights(clean),
    diagnoses: clean,
    benchmarks: generateBenchmarks(m, normalized),
    rule503020: generate503020(m, normalized),
    actionPlan: generateActionPlan(clean, normalized),
    projection: generateProjection(m, normalized),
    dataQuality: assessDataQuality(m, normalized),
    period: normalized.periodLabel,
    generatedAt: new Date().toISOString(),
  };
}

// === HEALTH SCORE ===

function calculateHealth(m, report) {
  let score = 50;
  const factors = [];

  if (m.totalIncome > 0) {
    if (m.net > 0) {
      const boost = Math.min(25, Math.round(m.savingRate * 100));
      score += boost;
      factors.push({ name: 'Cash Flow', score: `+${boost}`, status: 'good' });
    } else {
      score -= 20;
      factors.push({ name: 'Cash Flow', score: '-20', status: 'bad' });
    }
  } else if (m.totalExpense > 0) {
    score -= 15;
    factors.push({ name: 'Cash Flow', score: '-15', status: 'unknown' });
  }

  const budgets = report.budgetComparison || [];
  if (budgets.length > 0) {
    const overCount = budgets.filter((b) => b.status === 'over').length;
    const adherenceScore = Math.round((1 - overCount / budgets.length) * 15);
    score += adherenceScore;
    factors.push({
      name: 'Budget',
      score: `+${adherenceScore}`,
      status: overCount === 0 ? 'good' : 'mixed',
    });
  }

  const cats = (report.categoryBreakdown || []).length;
  if (cats >= 4) {
    score += 10;
    factors.push({ name: 'Kategorisasi', score: '+10', status: 'good' });
  } else if (cats <= 1 && m.totalExpense > 0) {
    score -= 5;
    factors.push({ name: 'Kategorisasi', score: '-5', status: 'bad' });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label;
  let color;
  let message;
  if (score >= 80) {
    label = 'Sangat Sehat';
    color = '#10b981';
    message = 'Keuanganmu dalam kondisi excellent. Pertahankan!';
  } else if (score >= 65) {
    label = 'Sehat';
    color = '#3b82f6';
    message = 'Kondisi baik, ada beberapa area yang bisa dioptimalkan.';
  } else if (score >= 45) {
    label = 'Cukup';
    color = '#f59e0b';
    message = 'Ada beberapa hal yang perlu diperbaiki untuk keuangan lebih sehat.';
  } else if (score >= 25) {
    label = 'Kurang';
    color = '#f97316';
    message = 'Perlu perhatian serius. Ikuti action plan di bawah.';
  } else {
    label = 'Kritis';
    color = '#ef4444';
    message = 'Situasi darurat keuangan. Segera ambil tindakan.';
  }

  return { score, label, color, message, factors };
}

// === INDIVIDUAL DIAGNOSES ===

function diagnoseCashFlow(m) {
  const hasIncome = m.totalIncome > 0;
  const hasExpense = m.totalExpense > 0;

  if (!hasIncome && !hasExpense) {
    return {
      id: 'no_data',
      area: 'Cash Flow',
      icon: 'wallet',
      status: 'neutral',
      title: 'Belum Ada Data',
      explanation: 'Mulai catat transaksi untuk mendapatkan analisa keuangan.',
      benchmark: '',
      impact: 'low',
      action: { label: 'Tambah Transaksi', type: 'navigate', target: 'add-transaction' },
    };
  }

  if (!hasIncome && hasExpense) {
    return {
      id: 'no_income_recorded',
      area: 'Cash Flow',
      icon: 'alertTriangle',
      status: 'critical',
      title: 'Cash Flow Tidak Terukur',
      explanation: `Ada pengeluaran Rp ${fmt(m.totalExpense)} tapi income belum tercatat. Semua metrik jadi tidak akurat.`,
      benchmark: 'Standar: Income HARUS tercatat untuk analisa yang valid.',
      impact: 'high',
      action: {
        label: 'Catat Income',
        type: 'navigate',
        target: 'income',
        description: 'Langkah pertama: masukkan total income bulan ini.',
      },
    };
  }

  if (m.net < 0) {
    const deficitPercent = Math.round((Math.abs(m.net) / m.totalIncome) * 100);
    return {
      id: 'negative_cashflow',
      area: 'Cash Flow',
      icon: 'trendingDown',
      status: 'critical',
      title: 'Cash Flow Negatif',
      explanation: `Pengeluaran Rp ${fmt(m.totalExpense)} melebihi income Rp ${fmt(m.totalIncome)} sebesar ${deficitPercent}%. Ini berarti kamu menggunakan tabungan atau berutang.`,
      benchmark: 'Standar: Pengeluaran tidak boleh melebihi 70-80% income.',
      impact: 'high',
      action: {
        label: 'Review Pengeluaran',
        type: 'navigate',
        target: 'transactions',
        description: 'Identifikasi pengeluaran yang bisa dikurangi.',
      },
    };
  }

  if (m.savingRate >= 0.2) {
    return {
      id: 'healthy_cashflow',
      area: 'Cash Flow',
      icon: 'check',
      status: 'good',
      title: 'Cash Flow Sehat',
      explanation: `Income Rp ${fmt(m.totalIncome)}, pengeluaran Rp ${fmt(m.totalExpense)}. Kamu berhasil menyisihkan ${Math.round(m.savingRate * 100)}%.`,
      benchmark: `Standar: Saving rate ≥20% = excellent. Kamu ${Math.round(m.savingRate * 100)}%.`,
      impact: 'low',
    };
  }

  return {
    id: 'low_cashflow',
    area: 'Cash Flow',
    icon: 'alertTriangle',
    status: 'warning',
    title: 'Cash Flow Positif tapi Ketat',
    explanation: `Sisa income hanya ${Math.round(m.savingRate * 100)}% (Rp ${fmt(m.net)}). Belum mencapai target ideal 20%.`,
    benchmark: `Standar: Minimal 10-20% income harus tersisa. Kamu: ${Math.round(m.savingRate * 100)}%.`,
    impact: 'medium',
    action: {
      label: 'Optimalkan Budget',
      type: 'navigate',
      target: 'budget',
      description: 'Review kategori MAU untuk potensi penghematan.',
    },
  };
}

function diagnoseSavingRate(m) {
  const rate = m.savingRate;
  const ratePercent = Math.round(rate * 100);

  if (m.totalIncome === 0) {
    return {
      id: 'saving_unknown',
      area: 'Tabungan',
      icon: 'target',
      status: 'neutral',
      title: 'Saving Rate Tidak Terukur',
      explanation: 'Income belum tercatat, saving rate tidak bisa dihitung.',
      benchmark: 'Standar: Saving rate ideal 20-30% dari income.',
      impact: 'medium',
    };
  }

  let status;
  let title;
  let explanation;

  if (rate >= 0.3) {
    status = 'excellent';
    title = 'Tabungan Excellent';
    explanation = `${ratePercent}% income berhasil ditabung. Ini di atas rata-rata.`;
  } else if (rate >= 0.2) {
    status = 'good';
    title = 'Tabungan Bagus';
    explanation = `${ratePercent}% income ditabung. Sudah mencapai target ideal.`;
  } else if (rate >= 0.1) {
    status = 'warning';
    title = 'Tabungan Kurang Optimal';
    explanation = `Hanya ${ratePercent}% yang ditabung. Idealnya minimal 20%.`;
  } else if (rate > 0) {
    status = 'warning';
    title = 'Tabungan Sangat Tipis';
    explanation = `Hanya ${ratePercent}% tersisa. Sangat rentan jika ada pengeluaran mendadak.`;
  } else {
    status = 'critical';
    title = 'Tidak Ada Tabungan';
    explanation = 'Saving rate 0% atau negatif. Tidak ada buffer untuk kondisi darurat.';
  }

  const gap = Math.max(0, 20 - ratePercent);
  const gapAmount = Math.round((m.totalIncome * gap) / 100);

  return {
    id: 'saving_rate',
    area: 'Tabungan',
    icon: 'target',
    status,
    title,
    explanation,
    benchmark: `Standar keuangan sehat: Saving rate 20-30%. Kamu: ${ratePercent}%.${gap > 0 ? ` Gap: ${gap}% (≈ Rp ${fmt(gapAmount)}/bulan).` : ''}`,
    impact: rate < 0.1 ? 'high' : rate < 0.2 ? 'medium' : 'low',
    action: rate < 0.2
      ? {
        label: 'Tingkatkan Tabungan',
        type: 'navigate',
        target: 'budget',
        description: `Kurangi Rp ${fmt(gapAmount)} dari pengeluaran tidak penting untuk mencapai target 20%.`,
      }
      : undefined,
  };
}

function diagnoseBudgetAdherence(budgetComparison) {
  const total = budgetComparison.length;
  if (total === 0) return null;

  const over = budgetComparison.filter((b) => b.status === 'over');
  const warning = budgetComparison.filter((b) => b.status === 'warning' || b.status === 'critical');
  const healthy = budgetComparison.filter((b) => b.status === 'healthy');
  const adherenceRate = Math.round((healthy.length / total) * 100);

  let status;
  let title;
  let explanation;

  if (over.length === 0 && warning.length === 0) {
    status = 'good';
    title = 'Budget Terkendali';
    explanation = `Semua ${total} kategori budget dalam batas. Disiplin yang bagus!`;
  } else if (over.length > 0) {
    const overNames = over.slice(0, 3).map((b) => b.category).join(', ');
    const totalOver = over.reduce((s, b) => s + Math.abs(b.remaining), 0);
    status = 'critical';
    title = `${over.length} Kategori Over Budget`;
    explanation = `${overNames} melebihi budget total Rp ${fmt(totalOver)}. Perlu review dan realokasi.`;
  } else {
    status = 'warning';
    title = 'Budget Mendekati Limit';
    explanation = `${warning.length} kategori mendekati batas (>75%). Perlu hati-hati sisa bulan ini.`;
  }

  return {
    id: 'budget_adherence',
    area: 'Budget',
    icon: 'target',
    status,
    title,
    explanation,
    benchmark: `Standar: Minimal 80% kategori dalam budget. Kamu: ${adherenceRate}% (${healthy.length}/${total} sehat).`,
    impact: over.length > 0 ? 'high' : 'medium',
    detail: { over: over.length, warning: warning.length, healthy: healthy.length, total },
    action: over.length > 0
      ? {
        label: 'Review Budget',
        type: 'navigate',
        target: 'budget',
        description: 'Naikkan budget kategori yang over, atau kurangi pengeluaran.',
      }
      : undefined,
  };
}

function diagnoseCategoryDiversity(categoryBreakdown) {
  const cats = categoryBreakdown || [];
  const total = cats.length;

  if (total <= 1) {
    const catName = cats[0]?.category || 'Other';
    return {
      id: 'low_diversity',
      area: 'Kategorisasi',
      icon: 'chartPie',
      status: 'warning',
      title: 'Kategori Tidak Jelas',
      explanation: `100% pengeluaran di "${catName}". Ini membuat analisa tidak berguna. Monevisor butuh kategori yang spesifik untuk memberi saran yang tepat.`,
      benchmark: 'Standar: Minimal 3-5 kategori untuk insight yang bermakna.',
      impact: 'medium',
      action: {
        label: 'Edit Kategori Transaksi',
        type: 'navigate',
        target: 'transactions',
        description: 'Ubah kategori transaksi dari "Other" ke kategori yang spesifik.',
      },
    };
  }

  const topPercent = cats[0]?.percent || 0;
  if (topPercent > 60) {
    return {
      id: 'dominant_category',
      area: 'Kategorisasi',
      icon: 'chartPie',
      status: 'info',
      title: `${cats[0].category} Dominan (${Math.round(topPercent)}%)`,
      explanation: `Kategori "${cats[0].category}" mendominasi ${Math.round(topPercent)}% pengeluaran. Ini bisa jadi normal (misal: cicilan KPR) atau perlu perhatian.`,
      benchmark: 'Standar: Idealnya tidak ada satu kategori > 40% kecuali kebutuhan wajib.',
      impact: 'low',
    };
  }

  return {
    id: 'good_diversity',
    area: 'Kategorisasi',
    icon: 'check',
    status: 'good',
    title: `${total} Kategori Terdeteksi`,
    explanation: 'Pengeluaran terdistribusi ke beberapa kategori. Ini baik untuk analisa.',
    benchmark: '',
    impact: 'low',
  };
}

function diagnoseSpendingPattern(dailyTrend, m) {
  const expenses = dailyTrend.filter((d) => d.expense > 0);
  if (expenses.length === 0) return null;

  const avg = expenses.reduce((s, d) => s + d.expense, 0) / expenses.length;
  const max = Math.max(...expenses.map((d) => d.expense));
  const maxDay = expenses.find((d) => d.expense === max);
  const hasMajorSpike = max > avg * 3 && max > 500000;

  if (!hasMajorSpike) return null;

  return {
    id: 'spending_spike',
    area: 'Pola Belanja',
    icon: 'trendingUp',
    status: 'info',
    title: 'Ada Pengeluaran Besar',
    explanation: `Tanggal ${maxDay?.day || '?'} ada pengeluaran Rp ${fmt(max)} — ${Math.round((max / m.totalExpense) * 100)}% dari total bulan ini. Apakah ini pengeluaran rutin atau satu kali?`,
    benchmark: 'Tip: Pengeluaran besar sebaiknya direncanakan dan masuk budget "Wajib" atau "Kebutuhan".',
    impact: 'low',
    action: { label: 'Review Transaksi', type: 'navigate', target: 'transactions' },
  };
}

function diagnoseMonthTrend(comparison) {
  if (!comparison?.changes) return null;
  const expenseChange = comparison.changes.expense;
  if (expenseChange === null || expenseChange === undefined) return null;

  if (expenseChange > 30) {
    return {
      id: 'expense_spike_month',
      area: 'Tren Bulanan',
      icon: 'trendingUp',
      status: 'warning',
      title: `Pengeluaran Naik ${Math.round(expenseChange)}%`,
      explanation: `Dibanding bulan lalu, pengeluaran naik signifikan. Dari Rp ${fmt(comparison.previous.expense)} ke Rp ${fmt(comparison.current.expense)}.`,
      benchmark: 'Standar: Kenaikan pengeluaran sebaiknya <10% per bulan kecuali ada kebutuhan khusus.',
      impact: 'medium',
    };
  }

  if (expenseChange < -15) {
    return {
      id: 'expense_down_month',
      area: 'Tren Bulanan',
      icon: 'trendingDown',
      status: 'good',
      title: `Pengeluaran Turun ${Math.round(Math.abs(expenseChange))}%`,
      explanation: `Bagus! Pengeluaran turun dari Rp ${fmt(comparison.previous.expense)} ke Rp ${fmt(comparison.current.expense)}.`,
      benchmark: '',
      impact: 'low',
    };
  }

  return null;
}

// === BENCHMARKS ===

function generateBenchmarks(m, report) {
  const benchmarks = [];
  const savingRate = Math.round((m.savingRate || 0) * 100);

  benchmarks.push({
    name: 'Saving Rate',
    yours: savingRate,
    ideal: 20,
    unit: '%',
    status: savingRate >= 20 ? 'good' : savingRate >= 10 ? 'warning' : 'bad',
    description: savingRate >= 20 ? 'Di atas standar' : `Kurang ${20 - savingRate}% dari ideal`,
  });

  const expenseRatio = m.totalIncome > 0
    ? Math.round((m.totalExpense / m.totalIncome) * 100)
    : null;
  if (expenseRatio !== null) {
    benchmarks.push({
      name: 'Rasio Pengeluaran',
      yours: expenseRatio,
      ideal: 70,
      unit: '%',
      status: expenseRatio <= 70 ? 'good' : expenseRatio <= 85 ? 'warning' : 'bad',
      description: expenseRatio <= 70 ? 'Terkendali' : `${expenseRatio - 70}% di atas ideal`,
      note: 'dari income',
      lowerIsBetter: true,
    });
  }

  const budgets = report.budgetComparison || [];
  if (budgets.length > 0) {
    const adherence = Math.round(
      (budgets.filter((b) => b.status === 'healthy').length / budgets.length) * 100,
    );
    benchmarks.push({
      name: 'Kepatuhan Budget',
      yours: adherence,
      ideal: 80,
      unit: '%',
      status: adherence >= 80 ? 'good' : adherence >= 60 ? 'warning' : 'bad',
      description: adherence >= 80
        ? 'Disiplin bagus'
        : `${budgets.filter((b) => b.status === 'over').length} kategori over`,
    });
  }

  const catCount = (report.categoryBreakdown || []).length;
  benchmarks.push({
    name: 'Keragaman Kategori',
    yours: catCount,
    ideal: 5,
    unit: ' kategori',
    status: catCount >= 4 ? 'good' : catCount >= 2 ? 'warning' : 'bad',
    description: catCount >= 4 ? 'Cukup detail' : 'Terlalu sedikit untuk insight akurat',
  });

  return benchmarks;
}

/**
 * 50/30/20 rule from budget priority spent amounts.
 * @param {object} m
 * @param {object} report
 */
function generate503020(m, report) {
  const income = m.totalIncome || 0;
  if (income <= 0) return null;

  const budgets = report.budgetComparison || [];
  let needs = 0;
  let wants = 0;

  if (budgets.length) {
    for (const b of budgets) {
      const spent = Number(b.spent || 0);
      if (b.priority === 'mau') wants += spent;
      else needs += spent;
    }
  } else {
    needs = m.totalExpense;
  }

  const savings = Math.max(0, m.net);
  const needsPct = Math.round((needs / income) * 100);
  const wantsPct = Math.round((wants / income) * 100);
  const savingsPct = Math.round((savings / income) * 100);
  const ideal = STANDARDS.NEEDS_WANTS_SAVINGS;

  return [
    {
      name: 'Needs (Wajib+Kebutuhan)',
      yours: needsPct,
      ideal: ideal.needs,
      unit: '%',
      status: needsPct <= ideal.needs ? 'good' : needsPct <= 65 ? 'warning' : 'bad',
      lowerIsBetter: true,
    },
    {
      name: 'Wants (Keinginan)',
      yours: wantsPct,
      ideal: ideal.wants,
      unit: '%',
      status: wantsPct <= ideal.wants ? 'good' : wantsPct <= 40 ? 'warning' : 'bad',
      lowerIsBetter: true,
    },
    {
      name: 'Savings',
      yours: savingsPct,
      ideal: ideal.savings,
      unit: '%',
      status: savingsPct >= ideal.savings ? 'good' : savingsPct >= 10 ? 'warning' : 'bad',
    },
  ];
}

function generateActionPlan(diagnoses) {
  const actions = diagnoses
    .filter((d) => d && d.action && d.impact !== 'low')
    .map((d, i) => ({
      step: i + 1,
      title: d.action.label,
      description: d.action.description || d.explanation,
      target: d.action.target,
      type: d.action.type,
      urgency: d.impact,
      fromDiagnosis: d.id,
    }));

  const goods = diagnoses.filter((d) => d && (d.status === 'good' || d.status === 'excellent'));
  if (goods.length > 0 && actions.length < 3) {
    actions.push({
      step: actions.length + 1,
      title: 'Pertahankan yang Sudah Baik',
      description: `${goods.length} area sudah bagus: ${goods.map((g) => g.area).join(', ')}. Tetap konsisten!`,
      urgency: 'low',
    });
  }

  return actions.slice(0, 5);
}

function generateProjection(m) {
  if (m.totalIncome === 0 && m.totalExpense === 0) {
    return { type: 'no_data', message: 'Mulai catat transaksi untuk melihat proyeksi.' };
  }

  if (m.net < 0) {
    const monthlyDeficit = Math.abs(m.net);
    return {
      type: 'negative',
      icon: 'alertTriangle',
      title: 'Proyeksi Jika Pola Berlanjut',
      message: `Dengan defisit Rp ${fmt(monthlyDeficit)}/bulan, tabungan akan terus berkurang. Dalam 6 bulan, kamu akan kehilangan Rp ${fmt(monthlyDeficit * 6)}.`,
      suggestion: `Kurangi pengeluaran minimal Rp ${fmt(monthlyDeficit)} untuk break-even, atau idealnya Rp ${fmt(monthlyDeficit + m.totalIncome * 0.2)} untuk saving 20%.`,
      chart: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        value: -monthlyDeficit * (i + 1),
      })),
    };
  }

  if (m.savingRate > 0) {
    const monthlySaving = m.net;
    const yearSaving = monthlySaving * 12;
    return {
      type: 'positive',
      icon: 'trendingUp',
      title: 'Proyeksi Positif',
      message: `Dengan saving Rp ${fmt(monthlySaving)}/bulan (${Math.round(m.savingRate * 100)}%), dalam 1 tahun kamu akan punya tambahan Rp ${fmt(yearSaving)}.`,
      suggestion: m.savingRate < 0.2
        ? `Naikkan saving rate ke 20% (tambah Rp ${fmt(m.totalIncome * 0.2 - m.net)}/bulan) untuk hasil lebih optimal.`
        : 'Pertahankan pola ini dan pertimbangkan investasi untuk pertumbuhan.',
      chart: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        value: monthlySaving * (i + 1),
      })),
    };
  }

  return {
    type: 'neutral',
    message: 'Pola pengeluaran break-even. Tidak ada tabungan yang terbentuk.',
    suggestion: 'Target: Sisihkan minimal 10% dari income untuk tabungan.',
  };
}

function generateHighlights(diagnoses) {
  return diagnoses
    .filter((d) => d && d.status !== 'neutral' && d.status !== 'info')
    .slice(0, 4)
    .map((d) => ({
      type: d.status === 'good' || d.status === 'excellent'
        ? 'positive'
        : d.status === 'critical'
          ? 'negative'
          : 'warning',
      text: d.title,
      detail: `${(d.explanation || '').split('.')[0]}.`,
    }));
}

function generateCoachSummary(health, diagnoses) {
  const hour = new Date().getHours();
  const greeting = hour < 11
    ? 'Selamat pagi'
    : hour < 15
      ? 'Selamat siang'
      : hour < 18
        ? 'Selamat sore'
        : 'Selamat malam';

  const criticals = diagnoses.filter((d) => d?.status === 'critical');
  const goods = diagnoses.filter((d) => d?.status === 'good' || d?.status === 'excellent');

  let tone;
  if (criticals.length >= 2) {
    tone = `${greeting}. Ada beberapa hal penting yang perlu segera ditangani.`;
  } else if (criticals.length === 1) {
    tone = `${greeting}. Secara umum cukup, tapi ada 1 hal yang perlu perhatian segera.`;
  } else if (goods.length >= 3) {
    tone = `${greeting}! Keuanganmu dalam kondisi bagus. Beberapa catatan kecil:`;
  } else {
    tone = `${greeting}. Yuk kita review kondisi keuanganmu bulan ini.`;
  }

  return {
    greeting: tone,
    hasUrgent: criticals.length > 0,
    urgentCount: criticals.length,
    positiveCount: goods.length,
    healthMessage: health.message,
  };
}

function assessDataQuality(m, report) {
  const issues = [];

  if (m.totalIncome === 0 && m.totalExpense > 0) {
    issues.push({ area: 'Income', message: 'Income belum tercatat', severity: 'high' });
  }

  const cats = report.categoryBreakdown || [];
  if (cats.length === 1 && /^(other|lainnya)$/i.test(cats[0]?.category || '')) {
    issues.push({ area: 'Kategori', message: 'Semua transaksi masih "Other"', severity: 'high' });
  }

  if (m.transactionCount < 5) {
    issues.push({
      area: 'Data',
      message: 'Terlalu sedikit transaksi untuk analisa akurat',
      severity: 'medium',
    });
  }

  if ((report.budgetComparison || []).length === 0) {
    issues.push({ area: 'Budget', message: 'Budget belum dibuat', severity: 'medium' });
  }

  const quality = issues.length === 0
    ? 'good'
    : issues.some((i) => i.severity === 'high')
      ? 'poor'
      : 'fair';

  return { quality, issues };
}

function emptyDiagnosis() {
  return {
    health: {
      score: 0,
      label: 'Tidak Ada Data',
      color: '#6b7280',
      message: 'Mulai catat transaksi untuk analisa.',
      factors: [],
    },
    summary: { greeting: 'Halo! Selamat datang di Monevisor.', hasUrgent: false },
    highlights: [],
    diagnoses: [],
    benchmarks: [],
    rule503020: null,
    actionPlan: [{
      step: 1,
      title: 'Mulai Catat Transaksi',
      description: 'Monevisor butuh data transaksi untuk memberikan insight. Mulai dengan mencatat pengeluaran hari ini.',
      target: 'add-transaction',
      urgency: 'high',
    }],
    projection: { type: 'no_data', message: 'Mulai catat transaksi untuk melihat proyeksi.' },
    dataQuality: {
      quality: 'poor',
      issues: [{ area: 'Data', message: 'Belum ada transaksi', severity: 'high' }],
    },
  };
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(num || 0)));
}

if (typeof window !== 'undefined') {
  window.monefyiDiagnosis = { diagnoseFinancials, STANDARDS };
}
