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
  el.className = 'home-section home-accounts';

  const cards = (accounts || []).slice(0, 8).map((acc) => {
    const iconName = getAccountIcon(acc.name);
    const color = getAccountColor(acc.name);
    const initial = String(acc.name || '?').charAt(0).toUpperCase();
    const balance = masked ? '••••••' : formatIDR(acc.balance);
    return `
      <button type="button" class="home-account-card tap" data-account="${encodeURIComponent(acc.name)}">
        <div class="home-account-card__icon" style="--acc-color:${color}">${Icon(iconName, { size: 20, color })}</div>
        <div class="home-account-card__name">${initial} · ${acc.name}</div>
        <div class="home-account-card__balance">${balance}</div>
        <div class="home-account-card__pct">${Math.round(acc.percentage)}%</div>
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('wallet', { size: 18 })} Akun</h2>
      <button type="button" class="home-section-action tap" data-action="view-all">
        Lihat semua ${Icon('chevronRight', { size: 14 })}
      </button>
    </div>
    <div class="home-accounts-scroll hide-scrollbar">${cards || '<p class="home-empty">Belum ada akun</p>'}</div>
  `;

  el.querySelector('[data-action="view-all"]')?.addEventListener('click', () => callbacks.onViewAll?.());
  el.querySelectorAll('.home-account-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = decodeURIComponent(btn.getAttribute('data-account') || '');
      callbacks.onAccountClick?.(name);
    });
  });

  return el;
}
