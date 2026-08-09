/**
 * Financial wellness metrics — stress, sleep, confidence (Fase 8.4).
 * @module services/financial-wellness
 */

import { computeFinancialHealthScore } from './financial-health-score.js';

const LS_ENTRIES = 'monefyi_wellness_entries';

/**
 * @returns {object[]}
 */
export function loadWellnessEntries() {
  try {
    return JSON.parse(localStorage.getItem(LS_ENTRIES) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object} data
 * @returns {object}
 */
export function saveWellnessCheckin(data) {
  const week = getWeekKey(new Date());
  const entries = loadWellnessEntries().filter((e) => e.week !== week);
  const entry = {
    week,
    stress: clampScore(data.stress),
    sleep: clampScore(data.sleep),
    confidence: clampScore(data.confidence),
    note: String(data.note || '').slice(0, 200),
    saved_at: new Date().toISOString(),
  };
  entries.unshift(entry);
  localStorage.setItem(LS_ENTRIES, JSON.stringify(entries.slice(0, 26)));
  return entry;
}

/**
 * @param {number} n
 */
function clampScore(n) {
  return Math.min(10, Math.max(1, Math.round(Number(n) || 5)));
}

/**
 * @param {Date} d
 */
function getWeekKey(d) {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return start.toISOString().slice(0, 10);
}

/**
 * @returns {object|null}
 */
export function getThisWeekCheckin() {
  const week = getWeekKey(new Date());
  return loadWellnessEntries().find((e) => e.week === week) || null;
}

/**
 * @returns {boolean}
 */
export function shouldPromptWeeklyWellness() {
  if (getThisWeekCheckin()) return false;
  return [0, 3].includes(new Date().getDay());
}

/**
 * @param {object[]} [entries]
 * @returns {object}
 */
export function computeWellnessScore(entries = loadWellnessEntries()) {
  const recent = entries.slice(0, 4);
  if (!recent.length) {
    return { overall: null, label: 'Belum ada data', trend: 'stable', components: {} };
  }

  const avg = (key) => recent.reduce((s, e) => s + e[key], 0) / recent.length;
  const stress = avg('stress');
  const sleep = avg('sleep');
  const confidence = avg('confidence');

  const stressScore = Math.round((11 - stress) * 10);
  const sleepScore = Math.round(sleep * 10);
  const confidenceScore = Math.round(confidence * 10);
  const overall = Math.round((stressScore * 0.35 + sleepScore * 0.25 + confidenceScore * 0.4));

  let trend = 'stable';
  if (recent.length >= 2) {
    const prev = (recent[1].stress + recent[1].confidence) / 2;
    const curr = (recent[0].stress + recent[0].confidence) / 2;
    trend = curr < prev ? 'up' : curr > prev ? 'down' : 'stable';
  }

  return {
    overall,
    label: overall >= 75 ? 'Sehat' : overall >= 50 ? 'Cukup' : 'Perlu perhatian',
    trend,
    components: {
      stress: { raw: stress, score: stressScore, label: 'Stres keuangan' },
      sleep: { raw: sleep, score: sleepScore, label: 'Kualitas tidur' },
      confidence: { raw: confidence, score: confidenceScore, label: 'Keyakinan masa depan' },
    },
  };
}

/**
 * Blend subjective wellness with objective financial health (Sprint 22).
 * @param {object} [state]
 * @returns {object}
 */
export function getWellnessFinancialBlend(state = typeof window !== 'undefined' ? window.STATE : {}) {
  const wellness = computeWellnessScore();
  let financialOverall = null;
  try {
    financialOverall = computeFinancialHealthScore(state).overall;
  } catch {
    financialOverall = null;
  }

  if (wellness.overall == null && financialOverall == null) {
    return { combined: null, label: 'Belum ada data', wellness, financial: financialOverall };
  }

  const w = wellness.overall ?? 50;
  const f = financialOverall ?? 50;
  const combined = Math.round(w * 0.4 + f * 0.6);

  let label = 'Seimbang';
  if (w < 45 && f >= 60) label = 'Angka OK, tapi stres — prioritaskan self-care';
  else if (w >= 70 && f < 45) label = 'Mental kuat — lanjut perbaiki angka';
  else if (combined < 45) label = 'Perlu dukungan — mode darurat & check-in rutin';

  return {
    combined,
    label,
    wellness: wellness.overall,
    financial: financialOverall,
    trend: wellness.trend,
    recommendations: getWellnessRecommendations(wellness, financialOverall),
  };
}

/**
 * @param {object} wellnessScore
 * @param {number|null} financialOverall
 * @returns {string[]}
 */
export function getWellnessRecommendations(wellnessScore, financialOverall = null) {
  /** @type {string[]} */
  const tips = [];
  const stress = wellnessScore.components?.stress?.raw;
  const confidence = wellnessScore.components?.confidence?.raw;

  if (stress != null && stress >= 7) {
    tips.push('Stres tinggi — coba wellness check-in + kurangi notifikasi marketing');
  }
  if (confidence != null && confidence <= 4) {
    tips.push('Keyakinan rendah — mulai target kecil & rayakan progress mingguan');
  }
  if (financialOverall != null && financialOverall < 45 && stress != null && stress >= 6) {
    tips.push('Pertimbangkan Mode Darurat untuk fokus runway');
  }
  if (!tips.length) tips.push('Pertahankan ritme check-in mingguan');
  return tips.slice(0, 3);
}

if (typeof window !== 'undefined') {
  window.monefyiWellness = {
    loadWellnessEntries,
    saveWellnessCheckin,
    getThisWeekCheckin,
    shouldPromptWeeklyWellness,
    computeWellnessScore,
    getWellnessFinancialBlend,
    getWellnessRecommendations,
  };
}
