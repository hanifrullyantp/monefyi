/**
 * Financial wellness metrics — stress, sleep, confidence (Fase 8.4).
 * @module services/financial-wellness
 */

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

if (typeof window !== 'undefined') {
  window.monefyiWellness = {
    loadWellnessEntries, saveWellnessCheckin, getThisWeekCheckin, shouldPromptWeeklyWellness, computeWellnessScore,
  };
}
