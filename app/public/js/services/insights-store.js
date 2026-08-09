/**
 * Persist smart insights to Supabase + local cache.
 * @module services/insights-store
 */

import { generateSmartSuggestions } from './smart-suggestions.js';

const LS_DISMISSED = 'monefyi_insights_dismissed';
const LS_LAST_SYNC = 'monefyi_insights_last_sync';

function supa() {
  return window.STATE?.db?.supa || null;
}

function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @returns {Set<string>}
 */
function getDismissedLocal() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_DISMISSED) || '[]'));
  } catch {
    return new Set();
  }
}

/**
 * @param {Set<string>} set
 */
function saveDismissedLocal(set) {
  localStorage.setItem(LS_DISMISSED, JSON.stringify([...set]));
}

/**
 * @param {object} suggestion
 * @returns {object}
 */
function toRow(suggestion, uid) {
  return {
    user_id: uid,
    insight_key: suggestion.id,
    type: suggestion.type || 'pattern',
    category_related: suggestion.category_related || null,
    title: suggestion.title,
    description: suggestion.body,
    data_json: suggestion.data_json || {},
    action_json: suggestion.action || {},
    priority: suggestion.severity === 'high' ? 8 : suggestion.severity === 'medium' ? 6 : 4,
    impact_amount: suggestion.impact_amount || suggestion.savingsPotential || 0,
    confidence: 75,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Sync dismissed keys from remote and upsert fresh insights.
 * @param {object} [state]
 * @returns {Promise<object[]>}
 */
export async function syncAndGenerateInsights(state = window.STATE) {
  const uid = userId();
  const generated = generateSmartSuggestions(state);
  const dismissed = getDismissedLocal();
  const client = supa();

  try {
    const { syncUserHabits } = await import('./user-habits.js');
    syncUserHabits(state).catch(() => {});
  } catch { /* ignore */ }

  if (client && uid && navigator.onLine !== false) {
    try {
      const { data: remote } = await client
        .from('insights_generated')
        .select('insight_key, dismissed_at')
        .eq('user_id', uid);

      for (const row of remote || []) {
        if (row.dismissed_at) dismissed.add(row.insight_key);
      }

      const active = generated.filter((g) => !dismissed.has(g.id));
      if (active.length) {
        await client.from('insights_generated').upsert(
          active.map((s) => toRow(s, uid)),
          { onConflict: 'user_id,insight_key' },
        );
      }
      localStorage.setItem(LS_LAST_SYNC, String(Date.now()));
    } catch (e) {
      console.warn('[insights-store] sync', e);
    }
  }

  return generated.filter((g) => !dismissed.has(g.id)).slice(0, 3);
}

/**
 * @param {string} insightKey
 * @param {'shown'|'clicked'|'dismissed'} action
 */
export async function recordInsightAction(insightKey, action) {
  if (!insightKey) return;
  const uid = userId();
  const client = supa();
  const now = new Date().toISOString();
  const patch = action === 'shown' ? { shown_at: now }
    : action === 'clicked' ? { clicked_at: now }
      : { dismissed_at: now };

  if (action === 'dismissed') {
    const dismissed = getDismissedLocal();
    dismissed.add(insightKey);
    saveDismissedLocal(dismissed);
  }

  if (client && uid) {
    try {
      await client.from('insights_generated').update(patch)
        .eq('user_id', uid)
        .eq('insight_key', insightKey);
    } catch (e) {
      console.warn('[insights-store] record', e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.monefyiInsightsStore = { syncAndGenerateInsights, recordInsightAction };
}
