/**
 * Emergency assessment — bills, shortage, cost cuts (Growth Sprint 21).
 * @module services/emergency-assessment
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';
import { getEmergencyRunway } from './emergency-mode.js';
import { loadRecurringPending } from './recurring-transactions.js';
import { detectSubscriptions } from './smart-suggestions.js';

const DISCRETIONARY = /hiburan|entertainment|belanja|shopping|nongkrong|kopi|coffee|delivery|gofood/i;

/**
 * @param {string} dueDate YYYY-MM-DD
 * @param {Date} [now]
 * @returns {number}
 */
function daysUntil(dueDate, now = new Date()) {
  const due = new Date(`${String(dueDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 999;
  return Math.ceil((due.getTime() - now.getTime()) / 86400000);
}

/**
 * @param {object} [state]
 * @param {number} [daysAhead]
 * @returns {object[]}
 */
export function getUpcomingBills(state = typeof window !== 'undefined' ? window.STATE : {}, daysAhead = 7) {
  const now = new Date();
  const pending = loadRecurringPending().filter((p) => p.status === 'pending');
  return pending
    .map((p) => ({
      name: p.name,
      amount: Math.abs(Number(p.amount || 0)),
      due_date: p.due_date || '',
      days_until: daysUntil(p.due_date, now),
    }))
    .filter((b) => b.amount > 0 && b.days_until >= 0 && b.days_until <= daysAhead)
    .sort((a, b) => a.days_until - b.days_until);
}

/**
 * @param {object} [state]
 * @returns {object[]}
 */
export function suggestEmergencyCostCuts(state = typeof window !== 'undefined' ? window.STATE : {}) {
  /** @type {object[]} */
  const cuts = [];
  const txs = dedupeTransactions(state.transactions || []);

  const subInsight = detectSubscriptions(txs);
  if (subInsight?.data_json?.subscriptions?.length) {
    for (const sub of subInsight.data_json.subscriptions.slice(0, 4)) {
      cuts.push({
        id: `sub_${sub.label}`,
        label: sub.label,
        amount: Math.abs(Number(sub.monthly || 0)),
        period: 'bulan',
        action: 'Batalkan langganan',
      });
    }
  }

  const month = state.selectedMonth
    || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const monthTxs = txs.filter((t) => {
    if (t.type !== 'expense') return false;
    return String(t.date || '').startsWith(month);
  });

  const discretionary = monthTxs.filter((t) => {
    const text = `${t.category || ''} ${t.merchant || ''}`;
    return DISCRETIONARY.test(text);
  });
  const discTotal = discretionary.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  if (discTotal >= 200000) {
    cuts.push({
      id: 'freeze_discretionary',
      label: 'Bekukan discretionary sisa bulan',
      amount: Math.round(discTotal * 0.7),
      period: 'bulan',
      action: 'Target potong 70%',
    });
  }

  return cuts.slice(0, 6);
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function buildEmergencyAssessment(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const runway = getEmergencyRunway(state);
  const bills = getUpcomingBills(state, 7);
  const totalNeeded = bills.reduce((s, b) => s + b.amount, 0);
  const cash = Number(runway.safe_to_spend || 0);
  const shortage = Math.max(0, totalNeeded - cash);
  const cuts = suggestEmergencyCostCuts(state);
  const cutSavings = cuts.reduce((s, c) => s + c.amount, 0);

  return {
    cash_available: cash,
    bills_due: bills,
    total_needed: totalNeeded,
    shortage,
    cost_cuts: cuts,
    potential_monthly_savings: cutSavings,
    immediate_options: [
      'Tunda pengeluaran non-wajib 7 hari',
      'Hubungi kreditur untuk perpanjangan',
      'Cari income darurat (freelance/jual barang)',
      'Aktifkan budget mode survive',
    ],
    recovery_phases: [
      { phase: 'Minggu 1–2', focus: 'Stabilkan — bayar tagihan wajib, hentikan discretionary' },
      { phase: 'Bulan 1', focus: 'Kurangi langganan & bangun buffer minimal 2 minggu' },
      { phase: 'Bulan 2–3', focus: 'Naikkan income side + lunasi utang prioritas' },
    ],
  };
}

if (typeof window !== 'undefined') {
  window.monefyiEmergencyAssessment = {
    buildEmergencyAssessment,
    getUpcomingBills,
    suggestEmergencyCostCuts,
  };
}
