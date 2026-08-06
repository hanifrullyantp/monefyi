/**
 * Mini win detection + achievement persistence (7-day cooldown per type).
 * @module services/mini-win-engine
 */

import { computeDailySituation } from './daily-situation.js';
import { computeRecordingStreak, getStreakMilestone } from './daily-streak.js';
import { inferSavingsContribution } from './financial-targets.js';
import { calculateProgress } from './budget-model.js';

const COOLDOWN_MS = 7 * 86400000;
const CACHE_KEY_PREFIX = 'user_achievements_';

/**
 * @returns {string|null}
 */
function getUserId() {
  return window.STATE?.db?.user?.id || null;
}

function getSupa() {
  return window.STATE?.db?.supa || null;
}

/**
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function loadAchievementsLocal(userId) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    const row = await db.app_state.get(`${CACHE_KEY_PREFIX}${userId}`);
    return row?.value || [];
  } catch {
    return [];
  }
}

async function cacheAchievementsLocal(userId, rows) {
  try {
    const { getDb } = await import('./offline-db.js');
    const db = await getDb();
    await db.app_state.put({ key: `${CACHE_KEY_PREFIX}${userId}`, value: rows });
  } catch { /* ignore */ }
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadAchievements() {
  const uid = getUserId();
  if (!uid) return [];

  try {
    const supa = getSupa();
    if (supa && navigator.onLine !== false) {
      const { data } = await supa
        .from('user_achievements')
        .select('*')
        .eq('user_id', uid)
        .order('shown_at', { ascending: false })
        .limit(50);
      if (Array.isArray(data)) {
        await cacheAchievementsLocal(uid, data);
        if (window.STATE?.db) window.STATE.db.achievements = data;
        return data;
      }
    }
  } catch (e) {
    console.warn('[mini-win] load remote', e);
  }

  const local = await loadAchievementsLocal(uid);
  if (window.STATE?.db) window.STATE.db.achievements = local;
  return local;
}

/**
 * @param {string} type
 * @param {object[]} [achievements]
 * @returns {boolean}
 */
export function canShowAchievement(type, achievements = window.STATE?.db?.achievements || []) {
  const last = achievements.find((a) => a.achievement_type === type);
  if (!last) return true;
  const shown = new Date(last.shown_at || last.created_at || 0).getTime();
  return Date.now() - shown >= COOLDOWN_MS;
}

/**
 * @param {object} win
 * @returns {Promise<object|null>}
 */
export async function recordAchievement(win) {
  const uid = getUserId();
  if (!uid) return null;

  const row = {
    user_id: uid,
    achievement_type: win.type,
    title: win.title,
    message: win.message,
    metadata: win.metadata || {},
    shown_at: new Date().toISOString(),
  };

  let saved = { id: `ach_${crypto.randomUUID()}`, ...row, created_at: row.shown_at };

  try {
    const supa = getSupa();
    if (supa) {
      const { data, error } = await supa.from('user_achievements').insert(row).select('*').single();
      if (!error && data) saved = data;
    }
  } catch (e) {
    console.warn('[mini-win] save remote', e);
  }

  const list = [saved, ...(await loadAchievementsLocal(uid))].slice(0, 50);
  await cacheAchievementsLocal(uid, list);
  if (window.STATE?.db) window.STATE.db.achievements = list;

  try {
    const { addNotification, NOTIF_TYPES } = await import('./notification-center.js');
    await addNotification({
      type: NOTIF_TYPES.ACHIEVEMENT.key,
      title: win.title,
      message: win.message,
      dedupKey: `achievement_${win.type}`,
    });
  } catch { /* ignore */ }

  return saved;
}

/**
 * @param {object} [ctx]
 * @returns {Promise<object[]>}
 */
export async function detectMiniWins(ctx = {}) {
  const state = ctx.state || window.STATE || {};
  const txs = ctx.transactions || state.transactions || [];
  const achievements = ctx.achievements || await loadAchievements();
  const wins = [];

  if (txs.length === 1) {
    wins.push({
      type: 'first_transaction',
      title: '✅ Transaksi pertama tercatat',
      message: 'Kesadaran adalah langkah pertama kontrol keuangan.',
    });
  }

  const tx = ctx.lastTransaction;
  if (tx) {
    const savings = inferSavingsContribution(tx);
    if (savings > 0 && !achievements.some((a) => a.achievement_type === 'first_emergency_fund')) {
      wins.push({
        type: 'first_emergency_fund',
        title: '🌱 Tabungan pertamamu tercatat',
        message: `Rp ${Math.round(savings).toLocaleString('id-ID')} — perjalanan seribu mil dimulai dari satu langkah.`,
        metadata: { amount: savings },
      });
    }
  }

  const situation = computeDailySituation(state);
  const prefs = state.db?.userPreferences || {};
  const paydayDay = prefs.payday_day;
  const now = new Date();
  if (paydayDay && now.getDate() >= Number(paydayDay) && situation.predictedEndBalance >= 0) {
    wins.push({
      type: 'safe_until_payday',
      title: '🎉 Aman sampai gajian!',
      message: 'Pertama kali bulan ini kamu aman sampai gajian! Ini hasil dari keputusan yang lebih baik.',
    });
  }

  const month = state.selectedMonth || now.toISOString().slice(0, 7);
  const rows = state.budgetsByMonth?.[month]?.categories?.rows || [];
  for (const row of rows) {
    const prog = calculateProgress(row, txs, month);
    if (prog.percent >= 70 && prog.percent <= 100) {
      const weekOk = checkCategoryWeekDiscipline(row, txs);
      if (weekOk) {
        wins.push({
          type: `category_week_${String(row.name).toLowerCase()}`,
          title: `✅ Budget ${row.name} terjaga`,
          message: `Budget ${row.name} berhasil dijaga 7 hari berturut-turut.`,
          metadata: { category: row.name },
        });
        break;
      }
    }
  }

  const savingCompare = compareSavingRate(txs, month);
  if (savingCompare && savingCompare.current > savingCompare.previous) {
    wins.push({
      type: 'saving_rate_up',
      title: '📈 Saving rate naik',
      message: `Saving rate bulan ini ${savingCompare.current}% — lebih baik dari bulan lalu (${savingCompare.previous}%). Kamu sedang tumbuh.`,
      metadata: savingCompare,
    });
  }

  return wins.filter((w) => canShowAchievement(w.type, achievements));
}

/**
 * @param {object} row
 * @param {object[]} transactions
 * @returns {boolean}
 */
function checkCategoryWeekDiscipline(row, transactions) {
  const today = new Date();
  let overDays = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const daySpend = transactions
      .filter((t) => {
        if (String(t.date || '').slice(0, 10) !== key) return false;
        const type = String(t.type || 'expense').toLowerCase();
        if (type !== 'expense' && type !== 'pengeluaran') return false;
        const cat = String(t.category || '').toLowerCase();
        const name = String(row.name || '').toLowerCase();
        return cat === name || cat.includes(name);
      })
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const dailyBudget = Number(row.amount || 0) / 30;
    if (daySpend > dailyBudget * 1.5) overDays += 1;
  }
  return overDays === 0 && Number(row.amount || 0) > 0;
}

/**
 * @param {object[]} transactions
 * @param {string} month YYYY-MM
 * @returns {{ current: number, previous: number }|null}
 */
function compareSavingRate(transactions, month) {
  const rate = (m) => {
    const income = transactions
      .filter((t) => t.type === 'income' && String(t.date || '').startsWith(m))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = transactions
      .filter((t) => {
        const type = String(t.type || '').toLowerCase();
        return (type === 'expense' || type === 'pengeluaran') && String(t.date || '').startsWith(m);
      })
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    if (income <= 0) return null;
    return Math.round(((income - expense) / income) * 100);
  };

  const [y, m] = month.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const current = rate(month);
  const previous = rate(prevMonth);
  if (current == null || previous == null) return null;
  if (current <= previous) return null;
  return { current, previous };
}

/**
 * Run detection and show celebrations.
 * @param {object} [ctx]
 */
export async function evaluateAndCelebrateMiniWins(ctx = {}) {
  const wins = await detectMiniWins(ctx);
  if (!wins.length) return [];

  const { showMiniWinCelebration } = await import('../components/mini-win-celebration.js');
  const shown = [];

  for (const win of wins.slice(0, 2)) {
    await recordAchievement(win);
    showMiniWinCelebration(win);
    shown.push(win);
  }

  return shown;
}

/**
 * Check streak milestone achievement.
 * @param {object} streakInfo
 */
export async function celebrateStreakMilestone(streakInfo) {
  const milestone = getStreakMilestone(streakInfo.streak);
  if (!milestone) return null;

  const type = `streak_${milestone.days}`;
  if (!canShowAchievement(type)) return null;

  const win = {
    type,
    title: `🔥 ${milestone.days} hari streak!`,
    message: milestone.message,
    metadata: { streak: milestone.days },
  };

  await recordAchievement(win);
  const { showMiniWinCelebration } = await import('../components/mini-win-celebration.js');
  showMiniWinCelebration(win);
  return win;
}
