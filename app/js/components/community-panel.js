/**
 * Community stories, challenges & Q&A sheet (Growth Fase 4.3 / Sprint 17-18).
 * @module components/community-panel
 */

import {
  SUCCESS_STORIES,
  MONTHLY_CHALLENGES,
  joinChallenge,
  getActiveChallenges,
  recordChallengeDay,
} from '../services/community-features.js';
import {
  loadForumQuestions,
  loadForumAnswers,
  postForumQuestion,
  postForumAnswer,
} from '../services/community-forum.js';

/** @type {HTMLElement|null} */
let _host = null;
/** @type {string} */
let _tab = 'stories';
/** @type {string|null} */
let _openQuestionId = null;

/**
 * @param {object} [opts]
 */
export async function showCommunityPanel(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'communityPanelHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  if (opts.tab) _tab = opts.tab;
  const active = getActiveChallenges();
  const questions = _tab === 'forum' ? await loadForumQuestions() : [];
  let answers = [];
  if (_openQuestionId) {
    answers = await loadForumAnswers(_openQuestionId);
  }

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--community" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Komunitas Monefyi</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <div class="community-tabs">
        <button type="button" class="community-tab ${_tab === 'stories' ? 'is-active' : ''}" data-tab="stories">Stories</button>
        <button type="button" class="community-tab ${_tab === 'challenges' ? 'is-active' : ''}" data-tab="challenges">Challenge</button>
        <button type="button" class="community-tab ${_tab === 'forum' ? 'is-active' : ''}" data-tab="forum">Q&A</button>
      </div>
      ${_tab === 'stories' ? renderStories() : ''}
      ${_tab === 'challenges' ? renderChallenges(active) : ''}
      ${_tab === 'forum' ? renderForum(questions, answers) : ''}
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _tab = btn.getAttribute('data-tab') || 'stories';
      _openQuestionId = null;
      showCommunityPanel(opts);
    });
  });

  if (_tab === 'challenges') bindChallengeActions(opts);
  if (_tab === 'forum') bindForumActions(opts);
}

function renderStories() {
  return `
    <h4 class="innovation-sheet__title" style="font-size:14px">Success Stories</h4>
    <div class="community-stories">
      ${SUCCESS_STORIES.map((s) => `
        <article class="community-story">
          <strong>📖 ${escapeHtml(s.title)}</strong>
          <p>${escapeHtml(s.excerpt)}</p>
          <span class="community-story__meta">❤️ ${s.likes} · ${s.age_band} · ${s.region}</span>
        </article>
      `).join('')}
    </div>
  `;
}

function renderChallenges(active) {
  return `
    <h4 class="innovation-sheet__title" style="font-size:14px">Challenge Bulan Ini</h4>
    ${MONTHLY_CHALLENGES.map((c) => `
      <div class="community-challenge">
        <strong>🎯 ${escapeHtml(c.title)}</strong>
        <p>${escapeHtml(c.description)}</p>
        <span class="community-story__meta">${c.participants.toLocaleString('id-ID')} peserta</span>
        <button type="button" class="innovation-btn innovation-btn--ghost tap" data-join="${c.id}">Join challenge</button>
      </div>
    `).join('')}
    ${active.length ? `
      <h4 class="innovation-sheet__title" style="font-size:14px;margin-top:16px">Kamu ikut</h4>
      ${active.map((c) => `
        <div class="community-challenge community-challenge--active">
          <strong>${escapeHtml(c.title)}</strong>
          <span>Streak: ${c.streak_days || 0} hari</span>
          <button type="button" class="growth-alert__btn tap" data-checkin="${c.id}">Check-in hari ini</button>
        </div>
      `).join('')}
    ` : ''}
  `;
}

function renderForum(questions, answers) {
  if (_openQuestionId) {
    const q = questions.find((item) => item.id === _openQuestionId);
    return `
      <button type="button" class="innovation-btn innovation-btn--ghost tap" data-back-forum>← Kembali</button>
      <h4 class="innovation-sheet__title" style="font-size:14px">${escapeHtml(q?.title || 'Pertanyaan')}</h4>
      <p class="innovation-sheet__hint">${escapeHtml(q?.body || '')}</p>
      <div class="community-forum-answers">
        ${answers.map((a) => `
          <div class="community-forum-answer ${a.is_expert ? 'is-expert' : ''}">
            ${a.is_expert ? '<span class="community-forum-expert">Expert</span>' : ''}
            ${escapeHtml(a.body)}
          </div>
        `).join('') || '<p class="innovation-sheet__hint">Belum ada jawaban — jadi yang pertama!</p>'}
      </div>
      <form class="community-forum-form" data-answer-form>
        <textarea rows="2" maxlength="800" placeholder="Tulis jawaban singkat..." required></textarea>
        <button type="submit" class="innovation-btn innovation-btn--primary tap">Kirim jawaban</button>
      </form>
    `;
  }

  return `
    <h4 class="innovation-sheet__title" style="font-size:14px">Financial Q&A</h4>
    <form class="community-forum-form" data-ask-form>
      <input type="text" maxlength="200" placeholder="Tanya komunitas..." required />
      <label class="community-forum-anon"><input type="checkbox" checked data-anon /> Post anonim</label>
      <button type="submit" class="innovation-btn innovation-btn--primary tap">Post</button>
    </form>
    <div class="community-forum-list">
      ${questions.map((q) => `
        <button type="button" class="community-forum-q tap" data-open-q="${q.id}">
          <strong>${escapeHtml(q.title)}</strong>
          <span>${q.answer_count || 0} jawaban</span>
        </button>
      `).join('')}
    </div>
  `;
}

function bindChallengeActions(opts) {
  _host.querySelectorAll('[data-join]').forEach((btn) => {
    btn.addEventListener('click', () => {
      joinChallenge(btn.getAttribute('data-join'));
      showCommunityPanel({ ...opts, tab: 'challenges' });
      opts.onJoined?.();
    });
  });
  _host.querySelectorAll('[data-checkin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      recordChallengeDay(btn.getAttribute('data-checkin'));
      showCommunityPanel({ ...opts, tab: 'challenges' });
    });
  });
}

function bindForumActions(opts) {
  _host.querySelector('[data-back-forum]')?.addEventListener('click', () => {
    _openQuestionId = null;
    showCommunityPanel({ ...opts, tab: 'forum' });
  });

  _host.querySelector('[data-ask-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = _host.querySelector('[data-ask-form] input');
    const anon = _host.querySelector('[data-anon]')?.checked !== false;
    if (!input?.value.trim()) return;
    await postForumQuestion({ title: input.value.trim(), anonymous: anon });
    input.value = '';
    showCommunityPanel({ ...opts, tab: 'forum' });
  });

  _host.querySelectorAll('[data-open-q]').forEach((btn) => {
    btn.addEventListener('click', () => {
      _openQuestionId = btn.getAttribute('data-open-q');
      showCommunityPanel({ ...opts, tab: 'forum' });
    });
  });

  _host.querySelector('[data-answer-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = _host.querySelector('[data-answer-form] textarea');
    if (!ta?.value.trim() || !_openQuestionId) return;
    await postForumAnswer(_openQuestionId, ta.value.trim());
    showCommunityPanel({ ...opts, tab: 'forum' });
  });
}

function close() {
  _host?.classList.remove('is-visible');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
