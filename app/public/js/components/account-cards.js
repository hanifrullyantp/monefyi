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
    const name = String(acc.name || 'Akun');
    const balance = masked ? '••••••' : formatIDR(acc.balance);
    return `
      <button type="button" class="home-account-card tap" data-account="${encodeURIComponent(name)}" style="--acc-color:${color}">
        <div class="home-account-card__accent" aria-hidden="true"></div>
        <div class="home-account-card__head">
          <div class="home-account-card__icon">${Icon(iconName, { size: 18, color })}</div>
          <div class="home-account-card__name">${name}</div>
        </div>
        <div class="home-account-card__balance">${balance}</div>
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="home-section-header home-accounts__header">
      <h2 class="home-section-title">${Icon('wallet', { size: 18 })} Akun</h2>
    </div>
    <div class="home-accounts-scroll hide-scrollbar">${cards || '<p class="home-empty">Belum ada akun</p>'}</div>
  `;
  el.querySelectorAll('.home-account-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accountName = decodeURIComponent(btn.getAttribute('data-account') || '');
      callbacks.onAccountClick?.(accountName);
    });
  });

  return el;
}
