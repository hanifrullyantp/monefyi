/**
 * Community stories & challenges sheet (Growth Fase 4.3).
 * @module components/community-panel
 */

import {
  SUCCESS_STORIES,
  MONTHLY_CHALLENGES,
  joinChallenge,
  getActiveChallenges,
  recordChallengeDay,
} from '../services/community-features.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showCommunityPanel(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'communityPanelHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  const active = getActiveChallenges();

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--community" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Komunitas Monefyi</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
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
      <h4 class="innovation-sheet__title" style="font-size:14px;margin-top:16px">Challenge Bulan Ini</h4>
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
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('[data-join]').forEach((btn) => {
    btn.addEventListener('click', () => {
      joinChallenge(btn.getAttribute('data-join'));
      showCommunityPanel(opts);
      opts.onJoined?.();
    });
  });
  _host.querySelectorAll('[data-checkin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      recordChallengeDay(btn.getAttribute('data-checkin'));
      showCommunityPanel(opts);
    });
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
