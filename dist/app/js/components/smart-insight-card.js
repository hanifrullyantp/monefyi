/**
 * Smart insight card for home dashboard.
 * @module components/smart-insight-card
 */

import { Icon } from './icons.js';
import { fmtCompact } from '../services/smart-suggestions.js';

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderSmartInsightCard(state, callbacks = {}) {
  let suggestions = [];
  try {
    const { syncAndGenerateInsights } = await import('../services/insights-store.js');
    suggestions = await syncAndGenerateInsights(state);
  } catch {
    const { generateSmartSuggestions } = await import('../services/smart-suggestions.js');
    suggestions = generateSmartSuggestions(state);
  }

  if (!suggestions.length) return null;

  const el = document.createElement('section');
  el.className = 'home-section home-smart-insights';

  const cards = suggestions.map((s) => `
    <article class="smart-insight-card smart-insight-card--${s.severity || 'low'}" data-id="${escapeHtml(s.id)}">
      <button type="button" class="smart-insight-card__dismiss tap" data-dismiss="${escapeHtml(s.id)}" aria-label="Tutup">✕</button>
      <div class="smart-insight-card__icon" aria-hidden="true">${s.icon || '💡'}</div>
      <div class="smart-insight-card__body">
        <h3 class="smart-insight-card__title">${escapeHtml(s.title)}</h3>
        <p class="smart-insight-card__text">${escapeHtml(s.body)}</p>
        ${(s.savingsPotential || s.impact_amount) ? `
          <span class="smart-insight-card__savings">Potensi hemat ~Rp ${fmtCompact(s.savingsPotential || s.impact_amount)}</span>
        ` : ''}
        ${s.action ? `
          <button type="button" class="smart-insight-card__action tap" data-target="${s.action.target || ''}" data-id="${escapeHtml(s.id)}">
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

  const { recordInsightAction } = await import('../services/insights-store.js');

  el.querySelectorAll('.smart-insight-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    if (id) recordInsightAction(id, 'shown').catch(() => {});
  });

  el.querySelectorAll('.smart-insight-card__action').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      recordInsightAction(id, 'clicked').catch(() => {});
      const target = btn.dataset.target;
      if (target === 'what_if') callbacks.onWhatIf?.();
      else if (target === 'debt_planner') callbacks.onDebtPlanner?.();
      else if (target === 'budget') callbacks.onViewBudget?.();
      else if (target === 'transactions') callbacks.onViewTransactions?.();
      else callbacks.onViewAdvisor?.();
    });
  });

  el.querySelectorAll('[data-dismiss]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-dismiss');
      await recordInsightAction(id, 'dismissed').catch(() => {});
      btn.closest('.smart-insight-card')?.remove();
      if (!el.querySelector('.smart-insight-card')) el.remove();
    });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
