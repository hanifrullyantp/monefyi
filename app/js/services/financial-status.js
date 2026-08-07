/**
 * Single source of truth for financial status across home, budget, monevisor.
 * @module services/financial-status
 */

import { computeDailySituation } from './daily-situation.js';
import { computePeriodTotals, toPeriodKey } from './monthly-period.js';

/** @typedef {'SAFE'|'WARNING'|'DANGER'|'INCOMPLETE'} FinancialLevel */

/**
 * @param {object} [state]
 * @returns {object}
 */
export function getFinancialStatus(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const situation = computeDailySituation(state);
  const period = toPeriodKey(state?.period?.end || state?.selectedMonth);
  const txs = state?.transactions || [];
  const periodTotals = computePeriodTotals(txs, period);
  const income = Number(situation.income || periodTotals.income || 0);

  if (situation.status === 'incomplete') {
    return {
      level: 'INCOMPLETE',
      color: 'gray',
      badge: 'Lengkapi Data',
      message: situation.message || 'Isi pemasukan bulanan dulu.',
      actions: [{ key: 'onboarding', label: 'Lengkapi data' }],
      situation,
      periodTotals,
    };
  }

  const safeToSpend = Number(situation.safeToSpend || 0);
  const predicted = Number(situation.predictedEndBalance || 0);
  const daysUntilEmpty = situation.daysUntilRunout ?? null;

  if (predicted < -(income * 0.1) || (daysUntilEmpty != null && daysUntilEmpty < situation.daysToPayday * 0.5)) {
    return {
      level: 'DANGER',
      color: 'red',
      badge: 'Perlu Tindakan',
      message: daysUntilEmpty != null
        ? `Dengan pola ini, uangmu habis dalam ${daysUntilEmpty} hari`
        : 'Prediksi menunjukkan uang berisiko habis sebelum gajian',
      actions: [
        { key: 'advisor', label: 'Lihat saran' },
        { key: 'budget', label: 'Review budget' },
      ],
      situation,
      periodTotals,
    };
  }

  if (safeToSpend < 50000 || predicted < 0) {
    return {
      level: 'WARNING',
      color: 'orange',
      badge: 'Perlu Direm',
      message: 'Pengeluaran melaju lebih cepat dari waktu. Rem sedikit ya.',
      actions: [{ key: 'budget', label: 'Lihat budget' }],
      situation,
      periodTotals,
    };
  }

  return {
    level: 'SAFE',
    color: 'green',
    badge: 'On Track',
    message: 'Kamu jaga pengeluaran dengan baik',
    actions: [],
    situation,
    periodTotals,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiFinancialStatus = { getFinancialStatus };
}
