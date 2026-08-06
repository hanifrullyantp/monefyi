/**
 * Contextual notification copy — morning, bills, budget milestones (TASK 4.2).
 * @module services/contextual-notifications
 */

import { LABELS, t } from '../constants/language.js';
import { computeDailySituation } from './daily-situation.js';
import { getFinancialCondition } from './financial-condition.js';
import { getPrimaryTarget } from './financial-targets.js';
import { calculateProgress } from './budget-model.js';

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Math.abs(Number(n) || 0)));
}

function fmtShort(n) {
  const num = Math.abs(Number(n) || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}jt`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}rb`;
  return String(Math.round(num));
}

/**
 * @param {object} [state]
 * @param {Date} [now]
 * @returns {{ title: string, body: string, tag: string, iconEmoji: string }|null}
 */
export function buildMorningBriefing(state = window.STATE, now = new Date()) {
  const situation = computeDailySituation(state);
  const condition = getFinancialCondition(state);
  const profile = state?.db?.profile;
  const created = profile?.created_at ? new Date(profile.created_at) : null;
  const daysWithApp = created
    ? Math.max(1, Math.ceil((now.getTime() - created.getTime()) / 86400000))
    : null;

  if (daysWithApp && daysWithApp <= 7) {
    const plan = state?.db?.firstWeekPlan;
    const dayNum = plan?.tasks?.find((tsk) => !tsk.done)?.day || daysWithApp;
    const taskTitle = plan?.tasks?.find((tsk) => tsk.day === dayNum)?.title
      || 'Catat transaksi hari ini';
    return {
      title: t(LABELS.NOTIF.NEW_USER, { day: daysWithApp }),
      body: `Task hari ini: ${taskTitle}`,
      tag: 'morning_new_user',
      iconEmoji: '☀️',
    };
  }

  if (situation.status === 'incomplete' || condition === 'incomplete') {
    return {
      title: '☀️ Selamat pagi!',
      body: 'Lengkapi pemasukan bulanan dulu supaya kami bisa hitung batas aman harianmu.',
      tag: 'morning_incomplete',
      iconEmoji: '☀️',
    };
  }

  const safe = fmt(situation.safeToSpend || 0);
  const target = getPrimaryTarget();
  const targetLine = target?.stats?.pct != null
    ? ` Target ${target.name}: ${target.stats.pct}%.`
    : '';

  if (condition === 'bahaya') {
    const runout = situation.runoutDayOfMonth;
    const deficit = Math.abs(situation.predictedEndBalance || 0);
    return {
      title: LABELS.NOTIF.MORNING_BAHAYA,
      body: runout && deficit > 0
        ? `Prediksi minus Rp${fmtShort(deficit)} sebelum tanggal ${runout}. Cek sekarang.`
        : 'Pola pengeluaran perlu direm. Buka beranda untuk langkah fokus.',
      tag: 'morning_bahaya',
      iconEmoji: '⚠️',
    };
  }

  if (condition === 'waspada') {
    const near = situation.nearCategory;
    const catLine = near
      ? ` Budget ${near.name} sudah ${Math.round(near.pct)}% — hati-hati.`
      : '';
    return {
      title: t(LABELS.NOTIF.MORNING_WASPADA, { amount: safe }),
      body: `${catLine}${targetLine}`.trim() || 'Yuk jaga pengeluaran hari ini.',
      tag: 'morning_waspada',
      iconEmoji: '☀️',
    };
  }

  return {
    title: t(LABELS.NOTIF.MORNING_AMAN, { amount: safe }),
    body: `${targetLine || 'Terus jaga ya!'}`.trim(),
    tag: 'morning_aman',
    iconEmoji: '☀️',
  };
}

/**
 * @param {object} item
 * @param {object} budget
 * @param {number} dayDiff
 * @param {object} [state]
 * @returns {{ title: string, body: string }}
 */
export function buildBillReminder(item, budget, dayDiff, state = window.STATE) {
  const amount = Number(item.subtotal ?? (Number(item.qty || 1) * Number(item.price || 0)));
  const name = item.name || 'Tagihan';
  const situation = computeDailySituation(state);
  const flexible = Number(situation.flexibleRemaining || 0);
  const fundsOk = flexible >= amount;

  const when = dayDiff === 0 ? 'hari ini' : dayDiff === 1 ? 'besok' : '3 hari lagi';
  const title = `⏰ ${name} Rp${fmt(amount)} jatuh tempo ${when}`;

  let body = fundsOk
    ? 'Perkiraan uang tersisa kamu cukup ✅'
    : '⚠️ Pastikan dana sudah siap ya.';
  if (budget?.name) body += ` · ${budget.name}`;

  return { title, body };
}

/**
 * @param {object} budget
 * @param {number} percent
 * @param {number} spent
 * @param {number} planned
 * @returns {{ title: string, body: string, severity: string }}
 */
export function buildBudgetMilestoneMessage(budget, percent, spent, planned) {
  const name = budget.name || 'Budget';
  const remaining = Math.max(0, planned - spent);

  if (percent >= 100) {
    return {
      title: `🔴 ${name} sudah habis bulan ini`,
      body: `Terpakai ${percent}% (Rp ${fmt(spent)} dari Rp ${fmt(planned)}).`,
      severity: 'high',
    };
  }
  if (percent >= 90) {
    return {
      title: `⚠️ ${name} hampir habis`,
      body: `Sisa Rp ${fmt(remaining)} — ${percent}% yang sudah dipakai.`,
      severity: 'high',
    };
  }
  if (percent >= 75) {
    return {
      title: `${name} sudah ${percent}%`,
      body: `Masih aman, tapi mulai jaga. Sisa Rp ${fmt(remaining)}.`,
      severity: 'medium',
    };
  }
  return {
    title: `${name} ${percent}%`,
    body: `Sisa Rp ${fmt(remaining)}.`,
    severity: 'low',
  };
}

/**
 * Find worst category percent for contextual copy.
 * @param {object} state
 * @param {object[]} expenses
 * @param {string} month
 * @returns {{ name: string, pct: number }|null}
 */
export function findTopBudgetPressure(state, expenses, month) {
  const rows = state?.budgetsByMonth?.[month]?.categories?.rows
    || state?.budgetDraft?.rows
    || [];
  let worst = null;
  for (const row of rows) {
    const prog = calculateProgress(row, expenses, month);
    const pct = Math.round(prog.percent || 0);
    if (pct >= 70 && (!worst || pct > worst.pct)) {
      worst = { name: row.name, pct };
    }
  }
  return worst;
}
