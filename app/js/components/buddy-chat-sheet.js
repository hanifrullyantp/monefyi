/**
 * Buddy accountability chat sheet (Growth Sprint 15-16).
 * @module components/buddy-chat-sheet
 */

import {
  matchBuddyAsync,
  loadBuddyMessagesAsync,
  sendBuddyMessageAsync,
  getBuddyWeeklyStatus,
} from '../services/referral-buddy.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showBuddyChatSheet(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'buddyChatHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  await matchBuddyAsync();
  await render(opts);
}

async function render(opts) {
  const status = getBuddyWeeklyStatus();
  const buddy = status.buddy;
  const messages = await loadBuddyMessagesAsync();

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--buddy" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div>
          <div class="innovation-sheet__kicker">Buddy Accountability${buddy.remote ? ' · Live' : ''}</div>
          <div class="innovation-sheet__title">${escapeHtml(buddy.label)}</div>
        </div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <div class="buddy-status">
        <span>Kamu: ${status.my_on_track}% on-track</span>
        <span>Buddy: ${status.buddy_on_track}% on-track</span>
        ${status.both_strong ? '<strong>Both keeping strong 🔥</strong>' : ''}
      </div>
      <div class="buddy-chat-thread">
        ${messages.length ? messages.map((m) => `
          <div class="buddy-chat-msg buddy-chat-msg--${m.from === 'me' ? 'me' : 'buddy'}">
            ${escapeHtml(m.body)}
          </div>
        `).join('') : '<p class="innovation-sheet__hint">Kirim semangat ke buddy — tanpa detail finansial pribadi.</p>'}
      </div>
      <form class="buddy-chat-form" data-form>
        <input type="text" maxlength="240" placeholder="Semangat! Progress minggu ini..." required />
        <button type="submit" class="innovation-btn innovation-btn--primary tap">Kirim</button>
      </form>
      <div class="buddy-quick-replies">
        ${['Semangat! 💪', 'Kita on-track minggu ini 🔥', 'Keep going!'].map((q) => `
          <button type="button" class="innovation-btn innovation-btn--ghost tap" data-quick="${escapeHtml(q)}">${escapeHtml(q)}</button>
        `).join('')}
      </div>
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelector('[data-form]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = _host.querySelector('.buddy-chat-form input');
    if (!input?.value.trim()) return;
    await sendBuddyMessageAsync(input.value.trim());
    input.value = '';
    await render(opts);
    opts.onMessage?.();
  });
  _host.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sendBuddyMessageAsync(btn.getAttribute('data-quick'));
      await render(opts);
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
