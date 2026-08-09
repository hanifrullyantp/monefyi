/**
 * Detect & sync user spending habits (Growth Fase 1.1).
 * @module services/user-habits
 */

import { dedupeTransactions } from '../utils/transaction-utils.js';

/**
 * @param {object[]} txs
 * @returns {object[]}
 */
export function detectHabitsFromTransactions(txs) {
  const expenses = dedupeTransactions(txs).filter((t) => t.type === 'expense');
  /** @type {object[]} */
  const habits = [];
  const byMerchant = new Map();

  for (const t of expenses) {
    const merchant = String(t.merchant || t.notes || '').trim().slice(0, 80);
    if (!merchant || merchant.length < 3) continue;
    const key = merchant.toLowerCase();
    if (!byMerchant.has(key)) {
      byMerchant.set(key, { merchant, category: t.category, amounts: [], dates: [] });
    }
    const row = byMerchant.get(key);
    row.amounts.push(Math.abs(Number(t.amount || 0)));
    row.dates.push(String(t.date || '').slice(0, 10));
  }

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const cut = fourWeeksAgo.toISOString().slice(0, 10);

  for (const [, row] of byMerchant) {
    const recentDates = row.dates.filter((d) => d >= cut);
    if (recentDates.length < 3) continue;
    const avg = row.amounts.reduce((a, b) => a + b, 0) / row.amounts.length;
    habits.push({
      habit_type: recentDates.length >= 8 ? 'frequency_based' : 'merchant_based',
      category: row.category || null,
      merchant: row.merchant,
      pattern_data_json: {
        count_4w: recentDates.length,
        avg_amount: Math.round(avg),
        per_week: Math.round(recentDates.length / 4),
      },
    });
  }

  return habits.slice(0, 10);
}

/**
 * @param {object} [state]
 * @returns {Promise<object[]>}
 */
export async function syncUserHabits(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const habits = detectHabitsFromTransactions(state.transactions || []);
  const uid = state.db?.user?.id;
  const client = state.db?.supa;

  if (client && uid && navigator.onLine !== false && habits.length) {
    try {
      await client.from('user_habits').delete().eq('user_id', uid);
      await client.from('user_habits').insert(
        habits.map((h) => ({
          user_id: uid,
          habit_type: h.habit_type,
          category: h.category,
          merchant: h.merchant,
          pattern_data_json: h.pattern_data_json,
          detected_at: new Date().toISOString(),
          active: true,
        })),
      );
    } catch (e) {
      console.warn('[user-habits] sync', e);
    }
  }

  return habits;
}

if (typeof window !== 'undefined') {
  window.monefyiUserHabits = { detectHabitsFromTransactions, syncUserHabits };
}
