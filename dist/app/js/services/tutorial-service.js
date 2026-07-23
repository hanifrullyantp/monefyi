/**
 * Tutorial Service
 * Handles content loading, search, and progress tracking.
 * Offline-first: cache content in localStorage; fallback to defaults.
 */

import { TUTORIAL_STRUCTURE, flattenTutorialStructure } from './tutorial-content-default.js';

const CACHE_KEY = 'monefyi_tutorial_cache';
const PROGRESS_KEY = 'monefyi_tutorial_progress';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getSupabase() {
  return window.__monefyiSupabase || null;
}

function getCurrentUserId() {
  return window.currentUser?.id
    || window.__monefyiUser?.id
    || window.__monefyiAuthUser?.id
    || null;
}

/**
 * Get all tutorial categories with articles.
 * Order: fresh cache → server → defaults.
 * @returns {Promise<object[]>}
 */
export async function getTutorialContent({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedContent();
    if (cached?.length) return cached;
  }

  if (navigator.onLine && getSupabase()) {
    try {
      const content = await fetchFromServer();
      if (content?.length) {
        cacheContent(content);
        return content;
      }
    } catch (e) {
      console.warn('[tutorial] Server fetch failed:', e);
    }
  }

  const defaults = buildFromDefaults();
  cacheContent(defaults);
  return defaults;
}

async function fetchFromServer() {
  const sb = getSupabase();
  if (!sb) return null;

  const [categoriesRes, articlesRes, stepsRes] = await Promise.all([
    sb.from('tutorial_categories').select('*').eq('is_published', true).order('sort_order'),
    sb.from('tutorial_articles').select('*').eq('is_published', true).order('sort_order'),
    sb.from('tutorial_content').select('*').eq('is_published', true).order('step_index'),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (articlesRes.error) throw articlesRes.error;
  if (stepsRes.error) throw stepsRes.error;

  const categories = categoriesRes.data || [];
  const articles = articlesRes.data || [];
  const steps = stepsRes.data || [];

  if (categories.length === 0) return null;

  // Merge DB media onto default steps when DB steps incomplete
  const defaults = buildFromDefaults();
  const defaultByArticle = new Map();
  defaults.forEach((cat) => {
    (cat.articles || []).forEach((a) => defaultByArticle.set(a.id, a));
  });

  return categories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    description: cat.description,
    icon: cat.icon,
    articles: articles
      .filter((a) => a.category_id === cat.id)
      .map((article) => {
        const dbSteps = steps
          .filter((s) => s.article_id === article.id)
          .sort((a, b) => a.step_index - b.step_index);

        const fallback = defaultByArticle.get(article.id);
        const resolvedSteps = dbSteps.length
          ? dbSteps.map((s) => ({
              text: s.text_content,
              media_url: s.media_url || null,
              media_type: s.media_type || null,
              media_alt: s.media_alt || null,
              id: s.id,
            }))
          : (fallback?.steps || []).map((s, i) => ({
              text: s.text,
              media_url: s.media_url || null,
              media_type: s.media_type || null,
              media_alt: s.media_alt || null,
              id: `${article.id}/${i}`,
            }));

        return {
          id: article.id,
          title: article.title,
          description: article.description,
          steps: resolvedSteps,
        };
      }),
  }));
}

function buildFromDefaults() {
  return TUTORIAL_STRUCTURE.map((cat) => ({
    ...cat,
    articles: (cat.articles || []).map((article) => ({
      ...article,
      steps: (article.steps || []).map((s, i) => ({
        text: s.text,
        media_url: s.media_url || null,
        media_type: s.media_type || null,
        media_alt: s.media_alt || null,
        id: `${article.id}/${i}`,
      })),
    })),
  }));
}

/**
 * Search tutorials by title/step text.
 * @param {string} query
 * @returns {Promise<object[]>}
 */
export async function searchTutorials(query) {
  const content = await getTutorialContent();
  const q = String(query || '').toLowerCase().trim();
  if (!q) return [];

  const results = [];

  for (const cat of content) {
    for (const article of cat.articles || []) {
      const titleMatch = article.title?.toLowerCase().includes(q);
      const stepMatch = (article.steps || []).some((s) => s.text?.toLowerCase().includes(q));

      if (titleMatch || stepMatch) {
        results.push({
          categoryId: cat.id,
          categoryTitle: cat.title,
          articleId: article.id,
          articleTitle: article.title,
          matchedSteps: (article.steps || [])
            .filter((s) => s.text?.toLowerCase().includes(q))
            .map((s) => s.text),
          relevance: titleMatch ? 2 : 1,
        });
      }
    }
  }

  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Mark article as read (local + optional server sync).
 * @param {string} articleId
 */
export async function markArticleRead(articleId) {
  if (!articleId) return { success: false, error: 'missing articleId' };

  try {
    const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    progress[articleId] = { completed: true, lastRead: new Date().toISOString() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('[tutorial] Local progress save failed:', e);
  }

  const sb = getSupabase();
  const userId = getCurrentUserId();
  if (navigator.onLine && sb && userId) {
    try {
      await sb.from('tutorial_progress').upsert({
        user_id: userId,
        article_id: articleId,
        completed: true,
        last_read_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[tutorial] Server progress sync failed:', e);
    }
  }

  return { success: true };
}

/**
 * @returns {Promise<Record<string, {completed:boolean,lastRead?:string}>>}
 */
export async function getReadProgress() {
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    local = {};
  }

  const sb = getSupabase();
  const userId = getCurrentUserId();
  if (navigator.onLine && sb && userId) {
    try {
      const { data, error } = await sb
        .from('tutorial_progress')
        .select('article_id, completed, last_read_at')
        .eq('user_id', userId);
      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          if (row.completed) {
            local[row.article_id] = {
              completed: true,
              lastRead: row.last_read_at || local[row.article_id]?.lastRead,
            };
          }
        });
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(local));
      }
    } catch {
      // keep local
    }
  }

  return local;
}

/**
 * @returns {Promise<{total:number,completed:number,percent:number}>}
 */
export async function getCompletionStats() {
  const content = await getTutorialContent();
  const progress = await getReadProgress();

  let totalArticles = 0;
  let completedArticles = 0;

  for (const cat of content) {
    for (const article of cat.articles || []) {
      totalArticles += 1;
      if (progress[article.id]?.completed) completedArticles += 1;
    }
  }

  return {
    total: totalArticles,
    completed: completedArticles,
    percent: totalArticles > 0 ? Math.round((completedArticles / totalArticles) * 100) : 0,
  };
}

/**
 * Seed DB from defaults (admin). Upserts categories, articles, steps.
 * Preserves existing media_url on steps.
 * @returns {Promise<{success:boolean,error?:string,counts?:object}>}
 */
export async function seedTutorialDefaults() {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase not ready' };

  try {
    const { categories, articles, steps } = flattenTutorialStructure();

    const { error: catErr } = await sb.from('tutorial_categories').upsert(categories);
    if (catErr) throw catErr;

    const { error: artErr } = await sb.from('tutorial_articles').upsert(articles);
    if (artErr) throw artErr;

    // Preserve media if already set
    const { data: existing } = await sb
      .from('tutorial_content')
      .select('id, media_url, media_type, media_alt');
    const mediaMap = new Map((existing || []).map((r) => [r.id, r]));

    const stepsPayload = steps.map((s) => {
      const prev = mediaMap.get(s.id);
      return {
        ...s,
        media_url: prev?.media_url || s.media_url,
        media_type: prev?.media_type || s.media_type,
        media_alt: prev?.media_alt || s.media_alt,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: stepErr } = await sb.from('tutorial_content').upsert(stepsPayload);
    if (stepErr) throw stepErr;

    // Invalidate cache so next load hits server
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }

    return {
      success: true,
      counts: {
        categories: categories.length,
        articles: articles.length,
        steps: steps.length,
      },
    };
  } catch (error) {
    console.error('[tutorial] Seed failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Upload media for a tutorial step (admin).
 * @param {File} file
 * @param {string} stepId
 * @returns {Promise<{success:boolean,publicUrl?:string,mediaType?:string,error?:string}>}
 */
export async function uploadTutorialMedia(file, stepId) {
  const sb = getSupabase();
  if (!sb) return { success: false, error: 'Supabase not ready' };
  if (!file || !stepId) return { success: false, error: 'file and stepId required' };

  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const safeId = String(stepId).replace(/[^a-zA-Z0-9/_-]/g, '_');
    const path = `tutorials/${safeId}.${ext}`;

    const { error: upErr } = await sb.storage
      .from('tutorial-media')
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) throw upErr;

    const { data: urlData } = sb.storage.from('tutorial-media').getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) throw new Error('No public URL');

    const mediaType = /\.gif$/i.test(file.name)
      ? 'gif'
      : /\.(mp4|webm|mov)$/i.test(file.name)
        ? 'video'
        : 'image';

    const { data: updated, error: updErr } = await sb
      .from('tutorial_content')
      .update({
        media_url: publicUrl,
        media_type: mediaType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stepId)
      .select('id');

    if (updErr) throw updErr;
    if (!updated?.length) {
      throw new Error('Step belum ada di DB. Klik “Seed konten default” dulu.');
    }

    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }

    return { success: true, publicUrl, mediaType };
  } catch (error) {
    console.error('[tutorial] Upload failed:', error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Clear media from a step (admin).
 * @param {string} stepId
 */
export async function clearTutorialMedia(stepId) {
  const sb = getSupabase();
  if (!sb || !stepId) return { success: false, error: 'missing' };
  try {
    const { error } = await sb
      .from('tutorial_content')
      .update({
        media_url: null,
        media_type: null,
        media_alt: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stepId);
    if (error) throw error;
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * List flat steps for admin UI (defaults + DB media overlay).
 */
export async function listTutorialStepsForAdmin() {
  const content = await getTutorialContent({ forceRefresh: true });
  const rows = [];
  for (const cat of content) {
    for (const article of cat.articles || []) {
      (article.steps || []).forEach((step, idx) => {
        rows.push({
          id: step.id || `${article.id}/${idx}`,
          categoryId: cat.id,
          categoryTitle: cat.title,
          articleId: article.id,
          articleTitle: article.title,
          stepIndex: idx,
          text: step.text,
          media_url: step.media_url || null,
          media_type: step.media_type || null,
        });
      });
    }
  }
  return rows;
}

function getCachedContent() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function cacheContent(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota
  }
}

if (typeof window !== 'undefined') {
  window.monefyiTutorial = {
    getTutorialContent,
    searchTutorials,
    markArticleRead,
    getReadProgress,
    getCompletionStats,
    seedTutorialDefaults,
    uploadTutorialMedia,
    clearTutorialMedia,
    listTutorialStepsForAdmin,
  };
}
