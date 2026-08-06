/**
 * Weekly check-in content — heuristic (offline-first).
 * @module services/weekly-checkin
 */

import { countLoggedDaysInRange, computeRecordingStreak } from './daily-streak.js';
import { calculateProgress } from './budget-model.js';

/**
 * @param {Date} [ref]
 * @returns {{ start: string, end: string, label: string }}
 */
export function getWeekRange(ref = new Date()) {
  const end = new Date(ref);
  end.setHours(12, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const fmt = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${fmt(start)} – ${fmt(end)}`,
  };
}

/**
 * @param {object} [state]
 * @returns {object}
 */
export function generateWeeklyCheckinHeuristic(state = window.STATE) {
  const txs = state?.transactions || [];
  const week = getWeekRange();
  const month = state?.selectedMonth || week.end.slice(0, 7);
  const rows = state?.budgetsByMonth?.[month]?.categories?.rows || [];

  const good = [];
  const attention = [];

  const daysLogged = countLoggedDaysInRange(txs, week.start, week.end);
  if (daysLogged >= 5) {
    good.push(`Catat transaksi ${daysLogged} dari 7 hari`);
  } else if (daysLogged > 0) {
    attention.push(`Baru catat ${daysLogged} dari 7 hari — coba lebih konsisten`);
  } else {
    attention.push('Belum ada transaksi minggu ini — mulai catat dulu');
  }

  for (const row of rows) {
    const prog = calculateProgress(row, txs, month);
    if (prog.percent >= 70 && prog.percent <= 100) {
      good.push(`Budget ${row.name} terjaga di ${Math.round(prog.percent)}%`);
    } else if (prog.percent > 100) {
      attention.push(`${row.name} over ${Math.round(prog.percent - 100)}% dari budget`);
    }
  }

  if (!good.length && daysLogged >= 3) {
    good.push('Kamu sudah mulai mencatat — lanjutkan kebiasaan ini');
  }

  let focus = 'Catat minimal 1 transaksi per hari minggu depan';
  const worst = rows
    .map((r) => ({ name: r.name, prog: calculateProgress(r, txs, month) }))
    .filter((x) => x.prog.percent > 90)
    .sort((a, b) => b.prog.percent - a.prog.percent)[0];

  if (worst) {
    const save = Math.round(Number(worst.prog.spent || 0) * 0.15);
    focus = `Kurangi pengeluaran ${worst.name} ~Rp ${save.toLocaleString('id-ID')}/minggu`;
  } else if (daysLogged < 5) {
    focus = 'Target: catat transaksi 5 hari dari 7 hari ke depan';
  }

  const streak = computeRecordingStreak(txs);

  return {
    week_start: week.start,
    week_end: week.end,
    period_label: week.label,
    good: good.slice(0, 3),
    attention: attention.slice(0, 3),
    focus,
    days_logged: daysLogged,
    streak: streak.streak,
    has_data: daysLogged > 0 || txs.some((t) => String(t.date || '').slice(0, 10) >= week.start),
  };
}

/**
 * @returns {Promise<object|null>}
 */
export async function getOrCreateWeeklyCheckin() {
  const uid = window.STATE?.db?.user?.id;
  if (!uid) return null;

  const content = generateWeeklyCheckinHeuristic();
  if (!content.has_data) return null;

  const supa = window.STATE?.db?.supa;
  if (supa && navigator.onLine !== false) {
    try {
      const { data: existing } = await supa
        .from('weekly_checkins')
        .select('*')
        .eq('user_id', uid)
        .eq('week_start', content.week_start)
        .maybeSingle();
      if (existing?.content) return { ...existing.content, id: existing.id, cached: true };
    } catch { /* ignore */ }
  }

  if (supa && navigator.onLine !== false) {
    try {
      const { data } = await supa.from('weekly_checkins').upsert({
        user_id: uid,
        week_start: content.week_start,
        week_end: content.week_end,
        content,
        source: 'heuristic',
      }, { onConflict: 'user_id,week_start' }).select('*').single();
      return data?.content || content;
    } catch (e) {
      console.warn('[weekly-checkin] save', e);
    }
  }

  return content;
}

/**
 * Show check-in if Sunday evening and not dismissed this week.
 * @returns {Promise<boolean>}
 */
export async function maybeShowWeeklyCheckin() {
  const now = new Date();
  if (now.getDay() !== 0 || now.getHours() < 19) return false;

  const week = getWeekRange();
  const dismissKey = `weekly_checkin_dismiss_${week.start}`;
  if (localStorage.getItem(dismissKey)) return false;

  const content = await getOrCreateWeeklyCheckin();
  if (!content) return false;

  const { showWeeklyCheckinSheet } = await import('../components/weekly-checkin-sheet.js');
  showWeeklyCheckinSheet(content, {
    onDismiss: () => localStorage.setItem(dismissKey, '1'),
  });
  return true;
}
