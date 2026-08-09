/**
 * Smart insight card for home dashboard.
 * @module components/smart-insight-card
 */

import { Icon } from './icons.js';
import { generateSmartSuggestions } from '../services/smart-suggestions.js';

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderSmartInsightCard(state, callbacks = {}) {
  const suggestions = generateSmartSuggestions(state);
  if (!suggestions.length) return null;

  const el = document.createElement('section');
  el.className = 'home-section home-smart-insights';

  const cards = suggestions.map((s) => `
    <article class="smart-insight-card smart-insight-card--${s.severity || 'low'}" data-id="${s.id}">
      <div class="smart-insight-card__icon" aria-hidden="true">${s.icon || '💡'}</div>
      <div class="smart-insight-card__body">
        <h3 class="smart-insight-card__title">${escapeHtml(s.title)}</h3>
        <p class="smart-insight-card__text">${escapeHtml(s.body)}</p>
        ${s.action ? `
          <button type="button" class="smart-insight-card__action tap" data-target="${s.action.target || ''}">
            ${escapeHtml(s.action.label)} ${Icon('chevronRight', { size: 12 })}
          </button>
        ` : ''}
      </div>
    </article>
  `).join('');

  el.innerHTML = `
    <div class="home-section-header">
      <h2 class="home-section-title">${Icon('sparkles', { size: 18 })} Insight Pintar</h2>
    </div>
    <div class="smart-insight-list">${cards}</div>
  `;

  el.querySelectorAll('.smart-insight-card__action').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.target;
      if (target === 'what_if') callbacks.onWhatIf?.();
      else if (target === 'budget') callbacks.onViewBudget?.();
      else if (target === 'transactions') callbacks.onViewTransactions?.();
      else callbacks.onViewAdvisor?.();
    });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
