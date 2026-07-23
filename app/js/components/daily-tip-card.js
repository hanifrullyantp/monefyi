/**
 * Daily tip card generated from real transaction data.
 * @module components/daily-tip-card
 */

import { Icon } from './icons.js';

/**
 * @param {object} tip
 * @param {object} [callbacks]
 * @returns {HTMLElement}
 */
export function renderDailyTipCard(tip, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'home-section home-daily-tip';
  const color = tip?.color || '#10B981';

  el.innerHTML = `
    <div class="home-daily-tip__inner" style="--tip-color:${color}">
      <div class="home-daily-tip__icon">${Icon(tip?.icon || 'lightBulb', { size: 22, color })}</div>
      <div class="home-daily-tip__body">
        <h3 class="home-daily-tip__title">${tip?.title || 'Tips'}</h3>
        <p class="home-daily-tip__message">${tip?.message || ''}</p>
        <button type="button" class="home-daily-tip__action tap" data-target="${tip?.actionTarget || 'advisor'}">
          ${tip?.actionLabel || 'Selengkapnya'} ${Icon('chevronRight', { size: 14 })}
        </button>
      </div>
    </div>
  `;

  el.querySelector('.home-daily-tip__action')?.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onActionClick?.(tip?.actionTarget);
  });

  return el;
}
