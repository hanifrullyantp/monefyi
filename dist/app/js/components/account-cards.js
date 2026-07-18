/**
 * Horizontal scrollable account balance cards.
 * @module components/account-cards
 */

import { Icon, getAccountIcon, getAccountColor } from './icons.js';

/**
 * @param {Array<{name:string,balance:number,percentage:number}>} accounts
 * @param {Function} formatIDR
 * @param {boolean} masked
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderAccountCards(accounts, formatIDR, masked = false, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-accounts';

  const cards = (accounts || []).slice(0, 8).map((acc) => {
    const iconName = getAccountIcon(acc.name);
    const color = getAccountColor(acc.name);
    const initial = String(acc.name || '?').charAt(0).toUpperCase();
    const balance = masked ? '••••••' : formatIDR(acc.balance);
    const pct = Math.round(acc.percentage || 0);
    return `
      <button type="button" class="home-account-card tap" data-account="${encodeURIComponent(acc.name)}" style="--acc-color:${color}">
        <div class="home-account-card__icon">${Icon(iconName, { size: 18, color: '#fff' })}</div>
        <div class="home-account-card__body">
          <div class="home-account-card__name">${initial} · ${acc.name}</div>
          <div class="home-account-card__balance">${balance}</div>
          <div class="home-account-card__meta">
            <div class="home-account-card__bar" aria-hidden="true">
              <span class="home-account-card__bar-fill" style="width:${pct}%;background:${color}"></span>
            </div>
            <div class="home-account-card__pct">${pct}%</div>
          </div>
        </div>
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="home-accounts-scroll hide-scrollbar">${cards || '<p class="home-empty">Belum ada akun</p>'}</div>
  `;
  el.querySelectorAll('.home-account-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.getAttribute('data-account') || '');
      callbacks.onAccountClick?.(name);
    });
  });

  return el;
}
