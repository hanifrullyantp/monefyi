/**
 * Weekly digest AI enrichment via monefyi-generate-insights.
 * @module services/weekly-digest-ai
 */

import { getWeekRange } from './weekly-checkin.js';
import { generateWeeklyDigest } from './weekly-digest.js';

/**
 * @param {object} [state]
 * @returns {Promise<object|null>}
 */
export async function fetchWeeklyAiInsights(state = window.STATE || {}) {
  const cfg = window.MONEFYI_CONFIG || {};
  const base = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  const token = state.db?.session?.access_token || state.session?.access_token;
  if (!base || !token) return null;

  const week = getWeekRange();
  const fn = cfg.fnInsights || 'monefyi-generate-insights';

  try {
    const res = await fetch(`${base}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start: week.start,
        end: week.end,
        periodLabel: `Minggu ${week.start} – ${week.end}`,
        lang: state.settings?.lang === 'en' ? 'en' : 'id',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn('[weekly-digest-ai]', e);
    return null;
  }
}

/**
 * @param {object} [state]
 * @returns {Promise<object>}
 */
export async function generateWeeklyDigestWithAi(state = window.STATE || {}) {
  const base = generateWeeklyDigest(state);
  const ai = await fetchWeeklyAiInsights(state);
  if (!ai) return base;

  const aiInsights = (ai.insights || []).slice(0, 3).map((i) => ({
    title: i.title,
    body: i.body || i.message,
    source: 'ai',
  }));

  return {
    ...base,
    ai_greeting: ai.greeting || null,
    ai_story: ai.story || null,
    ai_insights: aiInsights,
    recommendations: [
      ...aiInsights.map((i) => i.body || i.title).filter(Boolean),
      ...(base.recommendations || []),
    ].slice(0, 3),
    highlights: [
      ...(aiInsights.map((i) => i.title).filter(Boolean)),
      ...(base.highlights || []),
    ].slice(0, 4),
    source: ai.source === 'gemini' ? 'ai+heuristic' : 'heuristic',
  };
}
