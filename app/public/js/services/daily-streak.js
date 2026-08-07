/**
 * Daily recording streak — min 1 transaksi per hari.
 * @module services/daily-streak
 */

/** @type {Record<number, string>} */
export const STREAK_MILESTONES = {
  3: 'Kamu mulai membangun kebiasaan baru 💪',
  7: 'Seminggu penuh! Kamu lebih sadar dari kebanyakan orang',
  14: '2 minggu konsisten. Monefyi mulai kenal pola hidupmu',
  30: 'Satu bulan penuh. Kamu serius soal ini.',
};

/**
 * @param {string|Date} [today]
 * @returns {string}
 */
function toDayKey(today = new Date()) {
  const d = today instanceof Date ? today : new Date(today);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {object[]} transactions
 * @param {Date} [today]
 * @returns {{ streak: number, loggedToday: boolean, lastActiveDay: string|null }}
 */
export function computeRecordingStreak(transactions = [], today = new Date()) {
  const todayKey = toDayKey(today);
  const daysWithTx = new Set();

  for (const t of transactions) {
    const d = String(t.date || '').slice(0, 10);
    if (d) daysWithTx.add(d);
  }

  const loggedToday = daysWithTx.has(todayKey);
  let cursor = new Date(today);
  cursor.setHours(12, 0, 0, 0);

  if (!loggedToday) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  let lastActiveDay = null;

  for (let i = 0; i < 400; i += 1) {
    const key = toDayKey(cursor);
    if (!daysWithTx.has(key)) break;
    streak += 1;
    lastActiveDay = key;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { streak, loggedToday, lastActiveDay };
}

/**
 * @param {number} streak
 * @returns {{ days: number, message: string }|null}
 */
export function getStreakMilestone(streak) {
  const days = [30, 14, 7, 3].find((d) => streak === d);
  if (!days || !STREAK_MILESTONES[days]) return null;
  return { days, message: STREAK_MILESTONES[days] };
}

/**
 * Evening reminder if user hasn't logged today (after 20:00 local).
 * @param {object} streakInfo
 * @param {Date} [now]
 * @returns {string|null}
 */
export function getStreakEveningReminder(streakInfo, now = new Date()) {
  const hour = now.getHours();
  if (hour < 20) return null;
  if (streakInfo.loggedToday) return null;
  if (streakInfo.streak <= 0) {
    return 'Kamu belum catat hari ini. 5 detik cukup — ketik pengeluaran terakhirmu.';
  }
  return `Kamu belum catat hari ini. Streak ${streakInfo.streak} hari masih bisa dijaga — catat sekarang.`;
}

/**
 * @param {object[]} transactions
 * @returns {number}
 */
export function countLoggedDaysInRange(transactions, startKey, endKey) {
  const days = new Set();
  for (const t of transactions) {
    const d = String(t.date || '').slice(0, 10);
    if (d >= startKey && d <= endKey) days.add(d);
  }
  return days.size;
}
