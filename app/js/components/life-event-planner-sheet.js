/**
 * Life event planner sheet (Growth Fase 5.5).
 * @module components/life-event-planner-sheet
 */

import {
  LIFE_EVENT_TEMPLATES,
  loadLifeEventPlans,
  createLifeEventPlan,
  summarizeLifeEventPlan,
} from '../services/life-event-planner.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showLifeEventPlannerSheet(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'lifeEventPlannerHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  const plans = loadLifeEventPlans().map(summarizeLifeEventPlan);

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Life Event Planner</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <p class="innovation-sheet__hint">Rencanakan milestone besar dengan target biaya & cicilan bulanan.</p>
      <div class="life-event-templates">
        ${LIFE_EVENT_TEMPLATES.map((t) => `
          <button type="button" class="life-event-template tap" data-tpl="${t.id}">
            <span>${t.icon}</span>
            <strong>${escapeHtml(t.title)}</strong>
          </button>
        `).join('')}
      </div>
      ${plans.length ? `
        <h4 class="innovation-sheet__title" style="font-size:14px;margin-top:16px">Rencana aktif</h4>
        ${plans.slice(0, 3).map((p) => `
          <div class="life-event-active">
            <strong>${p.icon} ${escapeHtml(p.title)}</strong>
            <div class="coaching-progress__bar"><div style="width:${p.progress}%"></div></div>
            <span>Rp ${fmt(p.saved)} / Rp ${fmt(p.target_cost)} · nabung Rp ${fmt(p.monthly_needed)}/bln</span>
          </div>
        `).join('')}
      ` : ''}
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('[data-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => showCreateForm(btn.getAttribute('data-tpl'), opts));
  });
}

/**
 * @param {string} templateId
 * @param {object} [opts]
 */
function showCreateForm(templateId, opts = {}) {
  const tpl = LIFE_EVENT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl || !_host) return;

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">${tpl.icon} ${escapeHtml(tpl.title)}</div>
        <button type="button" class="innovation-sheet__close" data-action="back">←</button>
      </div>
      <label class="innovation-label">Target biaya (Rp)
        <input type="number" id="lepCost" value="${tpl.cost_range.mid}" class="innovation-input" />
      </label>
      <label class="innovation-label">Sudah terkumpul (Rp)
        <input type="number" id="lepSaved" value="0" class="innovation-input" />
      </label>
      <label class="innovation-label">Timeline (bulan)
        <input type="number" id="lepMonths" value="${Math.round(tpl.default_months)}" class="innovation-input" />
      </label>
      <button type="button" class="innovation-btn tap" data-action="save">Buat rencana</button>
    </div>
  `;

  _host.querySelector('[data-action="back"]')?.addEventListener('click', () => showLifeEventPlannerSheet(opts));
  _host.querySelector('[data-action="save"]')?.addEventListener('click', () => {
    createLifeEventPlan(templateId, {
      target_cost: Number(_host.querySelector('#lepCost')?.value),
      saved: Number(_host.querySelector('#lepSaved')?.value),
      months: Number(_host.querySelector('#lepMonths')?.value),
    });
    opts.onCreated?.();
    showLifeEventPlannerSheet(opts);
  });
}

function close() {
  _host?.classList.remove('is-visible');
}

function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
