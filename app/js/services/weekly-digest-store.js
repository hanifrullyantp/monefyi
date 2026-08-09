/**
 * Weekly digest persistence — Supabase + local cache.
 * @module services/weekly-digest-store
 */

const LS_CACHE = 'monefyi_weekly_digests';

function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {Date} [date]
 * @returns {{ week: number, year: number }}
 */
export function getISOWeekInfo(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { week, year };
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadWeeklyDigestHistory(limit = 12) {
  const uid = userId();
  const client = supa();
  if (uid && client) {
    try {
      const { data, error } = await client
        .from('weekly_digests')
        .select('*')
        .eq('user_id', uid)
        .order('year', { ascending: false })
        .order('week_number', { ascending: false })
        .limit(limit);
      if (!error && data) {
        localStorage.setItem(LS_CACHE, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('[weekly-digest-store] load', e);
    }
  }
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object} content
 * @returns {Promise<object|null>}
 */
export async function saveWeeklyDigest(content) {
  const uid = userId();
  if (!uid) return null;

  const { week, year } = getISOWeekInfo();
  const row = {
    user_id: uid,
    week_number: week,
    year,
    content_json: content,
    generated_at: new Date().toISOString(),
  };

  const client = supa();
  if (client) {
    try {
      const { data, error } = await client
        .from('weekly_digests')
        .upsert(row, { onConflict: 'user_id,year,week_number' })
        .select('*')
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('[weekly-digest-store] save', e);
    }
  }

  try {
    const list = JSON.parse(localStorage.getItem(LS_CACHE) || '[]');
    const idx = list.findIndex((r) => r.year === year && r.week_number === week);
    const local = { ...row, id: `local_${year}_${week}` };
    if (idx >= 0) list[idx] = local;
    else list.unshift(local);
    localStorage.setItem(LS_CACHE, JSON.stringify(list.slice(0, 20)));
    return local;
  } catch {
    return null;
  }
}

/**
 * @param {string} digestId
 * @returns {Promise<void>}
 */
export async function markDigestViewed(digestId) {
  const uid = userId();
  const client = supa();
  const viewed_at = new Date().toISOString();
  if (uid && client && digestId && !String(digestId).startsWith('local_')) {
    await client.from('weekly_digests').update({ viewed_at }).eq('id', digestId).eq('user_id', uid);
  }
}

/**
 * Generate digest and persist if not exists this week.
 * @param {object} [state]
 * @returns {Promise<object>}
 */
export async function getOrGenerateWeeklyDigest(state = window.STATE) {
  const { generateWeeklyDigest } = await import('./weekly-digest.js');
  const { week, year } = getISOWeekInfo();
  const history = await loadWeeklyDigestHistory(4);
  const existing = history.find((r) => r.year === year && r.week_number === week);

  const digest = generateWeeklyDigest(state);
  if (!existing?.content_json?.has_data && digest.has_data) {
    await saveWeeklyDigest(digest);
  }
  return digest;
}

if (typeof window !== 'undefined') {
  window.monefyiWeeklyDigestStore = {
    getISOWeekInfo,
    loadWeeklyDigestHistory,
    saveWeeklyDigest,
    markDigestViewed,
    getOrGenerateWeeklyDigest,
  };
}
