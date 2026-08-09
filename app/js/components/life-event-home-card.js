/**
 * Life event milestone card for home (Growth Sprint 23).
 * @module components/life-event-home-card
 */

import { getPrimaryLifeEventPlan } from '../services/life-event-planner.js';

/**
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderLifeEventHomeCard(callbacks = {}) {
  const plan = getPrimaryLifeEventPlan();
  if (!plan) return null;

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
  const trackLabel = plan.on_track ? 'On track' : 'Perlu dorongan';

  const el = document.createElement('section');
  el.className = 'home-section life-event-home-card';
  el.innerHTML = `
    <div class="life-event-home-card__inner tap">
      <div class="life-event-home-card__head">
        <span>${plan.icon || '🎯'}</span>
        <div>
          <strong>${escapeHtml(plan.title)}</strong>
          <div class="wellness-prompt-card__sub">${trackLabel} · ${plan.progress}% · Rp ${fmt(plan.monthly_needed)}/bln</div>
        </div>
      </div>
      <div class="coaching-progress__bar"><div style="width:${plan.progress}%"></div></div>
      ${plan.checklist_total ? `
        <div class="life-event-home-card__meta">Checklist ${plan.checklist_done}/${plan.checklist_total}</div>
      ` : ''}
    </div>
  `;

  el.querySelector('.life-event-home-card__inner')?.addEventListener('click', async () => {
    const { showLifeEventPlannerSheet } = await import('./life-event-planner-sheet.js');
    showLifeEventPlannerSheet({ openPlanId: plan.id, ...callbacks });
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
