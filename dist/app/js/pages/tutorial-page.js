/**
 * Tutorial / Help Center page.
 * Mounts into #tutorial-content; deep-links via #tutorial/...
 */

import { Icon } from '../components/icons.js';
import {
  getTutorialContent,
  searchTutorials,
  markArticleRead,
  getReadProgress,
  getCompletionStats,
} from '../services/tutorial-service.js';

let _hashHandlerBound = false;
let _pageState = {
  content: [],
  progress: {},
  container: null,
};

/**
 * @param {HTMLElement} container
 * @param {{ categoryId?: string, articleId?: string }} [initial]
 */
export async function renderTutorialPage(container, initial = {}) {
  if (!container) return;
  _pageState.container = container;
  container.className = 'tutorial-page';
  container.innerHTML = '<div class="tut-loading"><div class="tut-spinner"></div><p>Memuat tutorial...</p></div>';

  try {
    const content = await getTutorialContent();
    const progress = await getReadProgress();
    const stats = await getCompletionStats();
    _pageState.content = content;
    _pageState.progress = progress;

    renderContent(container, content, progress, stats);

    const route = initial.categoryId
      ? { categoryId: initial.categoryId, articleId: initial.articleId }
      : parseTutorialHash();

    if (route.categoryId && route.articleId) {
      openArticle(container, content, progress, route.categoryId, route.articleId, false);
    } else if (route.categoryId) {
      openCategory(container, content, progress, route.categoryId, false);
    }

    ensureHashListener();
  } catch (e) {
    console.error('[tutorial]', e);
    container.innerHTML = '<div class="tut-error"><p>Gagal memuat tutorial</p></div>';
  }
}

function parseTutorialHash() {
  const raw = String(location.hash || '').replace(/^#/, '');
  if (!raw.startsWith('tutorial')) return {};
  const parts = raw.split('/').filter(Boolean);
  // tutorial | tutorial/cat | tutorial/cat/short
  if (parts[0] !== 'tutorial') return {};
  const categoryId = parts[1] || null;
  const shortId = parts.slice(2).join('/') || null;
  const articleId = categoryId && shortId ? `${categoryId}/${shortId}` : null;
  return { categoryId, articleId };
}

/**
 * @param {string} [categoryId]
 * @param {string} [articleId] full composite id
 */
export function setTutorialHash(categoryId, articleId) {
  let hash = '#tutorial';
  if (categoryId) {
    hash += `/${categoryId}`;
    if (articleId) {
      const short = articleId.startsWith(`${categoryId}/`)
        ? articleId.slice(categoryId.length + 1)
        : articleId;
      hash += `/${short}`;
    }
  }
  if (location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

function ensureHashListener() {
  if (_hashHandlerBound) return;
  _hashHandlerBound = true;
  window.addEventListener('hashchange', () => {
    const container = _pageState.container;
    if (!container || !document.body.contains(container)) return;
    if (!String(location.hash || '').startsWith('#tutorial')) return;
    const route = parseTutorialHash();
    const { content, progress } = _pageState;
    if (!content?.length) return;
    if (route.categoryId && route.articleId) {
      openArticle(container, content, progress, route.categoryId, route.articleId, false);
    } else if (route.categoryId) {
      openCategory(container, content, progress, route.categoryId, false);
    } else {
      showCategories(container);
    }
  });
}

function renderContent(container, content, progress, stats) {
  container.innerHTML = `
    <div class="tut-page">
      <header class="tut-header">
        <div class="tut-header-info">
          <h1 class="tut-title">
            ${Icon('helpCircle', { size: 22 })}
            Tutorial & Bantuan
          </h1>
          <p class="tut-subtitle">Panduan lengkap menggunakan Monefyi</p>
        </div>
        <div class="tut-progress-badge">
          <div class="tut-progress-ring">
            ${renderMiniRing(stats.percent)}
          </div>
          <span class="tut-progress-text">${stats.completed}/${stats.total}</span>
        </div>
      </header>

      <div class="tut-search-wrap">
        <div class="tut-search">
          ${Icon('search', { size: 16 })}
          <input type="text" id="tut-search-input"
                 placeholder="Cari tutorial..."
                 autocomplete="off" />
        </div>
      </div>

      <div class="tut-search-results" id="tut-search-results" style="display:none"></div>

      <div class="tut-categories" id="tut-categories">
        ${content.map((cat) => renderCategoryCard(cat, progress)).join('')}
      </div>

      <div class="tut-article-view" id="tut-article-view" style="display:none"></div>
    </div>
  `;

  wireHandlers(container, content, progress);
}

function showCategories(container) {
  const categoriesView = container.querySelector('#tut-categories');
  const articleView = container.querySelector('#tut-article-view');
  const searchResults = container.querySelector('#tut-search-results');
  if (categoriesView) categoriesView.style.display = 'grid';
  if (articleView) articleView.style.display = 'none';
  if (searchResults) searchResults.style.display = 'none';
  setTutorialHash();
}

function renderCategoryCard(category, progress) {
  const totalArticles = (category.articles || []).length;
  const readArticles = (category.articles || []).filter((a) => progress[a.id]?.completed).length;
  const allRead = totalArticles > 0 && readArticles === totalArticles;

  return `
    <div class="tut-category-card ${allRead ? 'all-read' : ''}" data-category="${escapeAttr(category.id)}" role="button" tabindex="0">
      <div class="tut-cat-icon-wrap">
        ${Icon(category.icon || 'helpCircle', { size: 24 })}
      </div>
      <div class="tut-cat-info">
        <div class="tut-cat-title">${escapeHtml(category.title)}</div>
        <div class="tut-cat-desc">${escapeHtml(category.description || '')}</div>
        <div class="tut-cat-meta">
          ${readArticles}/${totalArticles} artikel
          ${allRead ? Icon('check', { size: 12 }) : ''}
        </div>
      </div>
      <div class="tut-cat-arrow">${Icon('chevronRight', { size: 16 })}</div>
    </div>
  `;
}

function renderArticleList(category, progress) {
  return `
    <div class="tut-article-list-view">
      <button type="button" class="tut-back-btn" data-action="back-to-categories">
        ${Icon('chevronLeft', { size: 16 })}
        <span>Kembali</span>
      </button>

      <div class="tut-article-list-header">
        <div class="tut-article-list-icon">
          ${Icon(category.icon || 'helpCircle', { size: 28 })}
        </div>
        <div>
          <h2>${escapeHtml(category.title)}</h2>
          <p>${escapeHtml(category.description || '')}</p>
        </div>
      </div>

      <div class="tut-articles">
        ${(category.articles || []).map((article) => {
          const isRead = progress[article.id]?.completed;
          return `
            <div class="tut-article-item ${isRead ? 'read' : ''}"
                 data-article="${escapeAttr(article.id)}"
                 data-category="${escapeAttr(category.id)}"
                 role="button" tabindex="0">
              <div class="tut-article-check">
                ${isRead ? Icon('check', { size: 14 }) : ''}
              </div>
              <div class="tut-article-info">
                <div class="tut-article-title">${escapeHtml(article.title)}</div>
                <div class="tut-article-step-count">${(article.steps || []).length} langkah</div>
              </div>
              <div class="tut-article-arrow">${Icon('chevronRight', { size: 14 })}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderArticleDetail(category, article, progress) {
  const isRead = progress[article.id]?.completed;

  return `
    <div class="tut-detail-view">
      <button type="button" class="tut-back-btn" data-action="back-to-articles" data-category="${escapeAttr(category.id)}">
        ${Icon('chevronLeft', { size: 16 })}
        <span>${escapeHtml(category.title)}</span>
      </button>

      <div class="tut-detail-header">
        <h2>${escapeHtml(article.title)}</h2>
        ${isRead ? `<div class="tut-read-badge">${Icon('check', { size: 12 })} Sudah dibaca</div>` : ''}
      </div>

      <div class="tut-steps">
        ${(article.steps || []).map((step, i) => renderStep(step, i)).join('')}
      </div>

      ${!isRead ? `
        <button type="button" class="tut-mark-read-btn" data-action="mark-read" data-article="${escapeAttr(article.id)}">
          ${Icon('check', { size: 14 })}
          <span>Tandai Sudah Dibaca</span>
        </button>
      ` : ''}

      <div class="tut-nav-footer">
        ${renderArticleNav(category, article)}
      </div>
    </div>
  `;
}

function renderStep(step, index) {
  const hasMedia = step.media_url && step.media_type;

  return `
    <div class="tut-step">
      <div class="tut-step-num">${index + 1}</div>
      <div class="tut-step-content">
        <div class="tut-step-text">${escapeHtml(step.text)}</div>
        ${hasMedia ? renderMedia(step) : ''}
      </div>
    </div>
  `;
}

function renderMedia(step) {
  if (!step.media_url) return '';

  switch (step.media_type) {
    case 'image':
    case 'gif':
      return `
        <div class="tut-step-media">
          <img
            src="${escapeAttr(step.media_url)}"
            alt="${escapeAttr(step.media_alt || '')}"
            loading="lazy"
            class="tut-media-img"
            onerror="this.parentNode.style.display='none'"
          />
        </div>
      `;
    case 'video':
      return `
        <div class="tut-step-media">
          <video
            src="${escapeAttr(step.media_url)}"
            controls
            playsinline
            preload="metadata"
            class="tut-media-video"
            onerror="this.parentNode.style.display='none'"
          >
            Browser tidak support video
          </video>
        </div>
      `;
    default:
      return '';
  }
}

function renderArticleNav(category, currentArticle) {
  const articles = category.articles || [];
  const currentIdx = articles.findIndex((a) => a.id === currentArticle.id);
  const prev = currentIdx > 0 ? articles[currentIdx - 1] : null;
  const next = currentIdx < articles.length - 1 ? articles[currentIdx + 1] : null;

  return `
    <div class="tut-article-nav">
      ${prev ? `
        <button type="button" class="tut-nav-btn prev" data-action="go-article"
                data-article="${escapeAttr(prev.id)}" data-category="${escapeAttr(category.id)}">
          ${Icon('chevronLeft', { size: 14 })}
          <span>${escapeHtml(prev.title)}</span>
        </button>
      ` : '<div></div>'}
      ${next ? `
        <button type="button" class="tut-nav-btn next" data-action="go-article"
                data-article="${escapeAttr(next.id)}" data-category="${escapeAttr(category.id)}">
          <span>${escapeHtml(next.title)}</span>
          ${Icon('chevronRight', { size: 14 })}
        </button>
      ` : '<div></div>'}
    </div>
  `;
}

function renderMiniRing(percent) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - (Number(percent) || 0) / 100);
  return `
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3"/>
      <circle cx="18" cy="18" r="${r}" fill="none" stroke="#10b981" stroke-width="3"
              stroke-dasharray="${c}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 18 18)"/>
      <text x="18" y="22" text-anchor="middle" fill="white" font-size="10" font-weight="700">${percent}%</text>
    </svg>
  `;
}

function wireHandlers(container, content, progress) {
  const categoriesView = container.querySelector('#tut-categories');
  const articleView = container.querySelector('#tut-article-view');
  const searchResults = container.querySelector('#tut-search-results');
  const searchInput = container.querySelector('#tut-search-input');

  container.querySelectorAll('.tut-category-card').forEach((card) => {
    const open = () => {
      const catId = card.dataset.category;
      openCategory(container, content, progress, catId, true);
    };
    card.onclick = open;
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    };
  });

  let searchTimeout;
  if (searchInput) {
    searchInput.oninput = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          if (searchResults) searchResults.style.display = 'none';
          if (categoriesView) categoriesView.style.display = 'grid';
          if (articleView) articleView.style.display = 'none';
          return;
        }

        const results = await searchTutorials(query);
        if (categoriesView) categoriesView.style.display = 'none';
        if (articleView) articleView.style.display = 'none';
        if (searchResults) searchResults.style.display = 'block';

        if (!searchResults) return;

        if (results.length === 0) {
          searchResults.innerHTML = `
            <div class="tut-search-empty">
              <p>Tidak ditemukan tutorial untuk "${escapeHtml(query)}"</p>
            </div>
          `;
        } else {
          searchResults.innerHTML = `
            <div class="tut-search-header">
              ${results.length} hasil untuk "${escapeHtml(query)}"
            </div>
            ${results.map((r) => `
              <div class="tut-search-item" data-article="${escapeAttr(r.articleId)}" data-category="${escapeAttr(r.categoryId)}" role="button" tabindex="0">
                <div class="tut-search-item-cat">${escapeHtml(r.categoryTitle)}</div>
                <div class="tut-search-item-title">${escapeHtml(r.articleTitle)}</div>
                ${r.matchedSteps.length > 0 ? `
                  <div class="tut-search-item-match">...${escapeHtml(r.matchedSteps[0].slice(0, 80))}...</div>
                ` : ''}
              </div>
            `).join('')}
          `;

          searchResults.querySelectorAll('.tut-search-item').forEach((item) => {
            item.onclick = () => {
              openArticle(container, content, progress, item.dataset.category, item.dataset.article, true);
            };
          });
        }
      }, 300);
    };
  }
}

function wireArticleHandlers(container, content, progress) {
  const categoriesView = container.querySelector('#tut-categories');
  const articleView = container.querySelector('#tut-article-view');

  container.querySelectorAll('[data-action="back-to-categories"]').forEach((btn) => {
    btn.onclick = () => {
      if (articleView) articleView.style.display = 'none';
      if (categoriesView) categoriesView.style.display = 'grid';
      setTutorialHash();
      container.querySelector('#tut-search-input')?.focus?.();
      scrollTutorialTop(container);
    };
  });

  container.querySelectorAll('[data-action="back-to-articles"]').forEach((btn) => {
    btn.onclick = () => {
      const catId = btn.dataset.category;
      openCategory(container, content, progress, catId, true);
    };
  });

  container.querySelectorAll('.tut-article-item').forEach((item) => {
    item.onclick = () => {
      openArticle(container, content, progress, item.dataset.category, item.dataset.article, true);
    };
  });

  container.querySelectorAll('[data-action="go-article"]').forEach((btn) => {
    btn.onclick = () => {
      openArticle(container, content, progress, btn.dataset.category, btn.dataset.article, true);
    };
  });

  container.querySelectorAll('[data-action="mark-read"]').forEach((btn) => {
    btn.onclick = async () => {
      const artId = btn.dataset.article;
      await markArticleRead(artId);
      progress[artId] = { completed: true, lastRead: new Date().toISOString() };
      _pageState.progress = progress;
      btn.innerHTML = `${Icon('check', { size: 14 })} Sudah ditandai!`;
      btn.disabled = true;
      btn.classList.add('completed');
      refreshProgressBadge(container);
      showToast('Ditandai sudah dibaca');
    };
  });
}

async function refreshProgressBadge(container) {
  try {
    const stats = await getCompletionStats();
    const ring = container.querySelector('.tut-progress-ring');
    const text = container.querySelector('.tut-progress-text');
    if (ring) ring.innerHTML = renderMiniRing(stats.percent);
    if (text) text.textContent = `${stats.completed}/${stats.total}`;

    // Update category cards read state
    const categoriesView = container.querySelector('#tut-categories');
    if (categoriesView && _pageState.content?.length) {
      categoriesView.innerHTML = _pageState.content
        .map((cat) => renderCategoryCard(cat, _pageState.progress))
        .join('');
      wireHandlers(container, _pageState.content, _pageState.progress);
    }
  } catch {
    // ignore
  }
}

function openCategory(container, content, progress, catId, updateHash) {
  const cat = content.find((c) => c.id === catId);
  if (!cat) return;

  const categoriesView = container.querySelector('#tut-categories');
  const articleView = container.querySelector('#tut-article-view');
  const searchResults = container.querySelector('#tut-search-results');

  if (categoriesView) categoriesView.style.display = 'none';
  if (searchResults) searchResults.style.display = 'none';
  if (articleView) {
    articleView.style.display = 'block';
    articleView.innerHTML = renderArticleList(cat, progress);
  }
  wireArticleHandlers(container, content, progress);
  if (updateHash !== false) setTutorialHash(catId);
  scrollTutorialTop(container);
}

function openArticle(container, content, progress, catId, artId, updateHash) {
  const cat = content.find((c) => c.id === catId);
  let article = cat?.articles?.find((a) => a.id === artId);
  if (!article && cat && artId && !artId.includes('/')) {
    article = cat.articles?.find((a) => a.id === `${catId}/${artId}`);
    if (article) artId = article.id;
  }
  if (!cat || !article) return;

  const articleView = container.querySelector('#tut-article-view');
  const categoriesView = container.querySelector('#tut-categories');
  const searchResults = container.querySelector('#tut-search-results');

  if (categoriesView) categoriesView.style.display = 'none';
  if (searchResults) searchResults.style.display = 'none';
  if (articleView) {
    articleView.style.display = 'block';
    articleView.innerHTML = renderArticleDetail(cat, article, progress);
  }
  wireArticleHandlers(container, content, progress);
  if (updateHash !== false) setTutorialHash(catId, artId);
  scrollTutorialTop(container);
}

function scrollTutorialTop(container) {
  const sheetBody = container.closest('.sheet-body');
  if (sheetBody) sheetBody.scrollTop = 0;
  else window.scrollTo(0, 0);
}

function showToast(msg) {
  const existing = document.querySelector('.action-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'action-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

if (typeof window !== 'undefined') {
  window.monefyiTutorialPage = { renderTutorialPage, setTutorialHash, parseTutorialHash };
}
