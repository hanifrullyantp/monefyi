/**
 * Life event planner sheet (Growth Sprint 23 polish).
 * @module components/life-event-planner-sheet
 */

import {
  LIFE_EVENT_TEMPLATES,
  loadLifeEventPlans,
  createLifeEventPlan,
  summarizeLifeEventPlan,
  projectInflatedCost,
  projectEducationPlan,
  toggleLifeEventChecklist,
  updateLifeEventPlan,
} from '../services/life-event-planner.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showLifeEventPlannerSheet(opts = {}) {
  if (opts.openPlanId) {
    showPlanDetail(opts.openPlanId, opts);
    return;
  }

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'lifeEventPlannerHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  const plans = loadLifeEventPlans().map(summarizeLifeEventPlan);

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--life-event" role="dialog" aria-modal="true">
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
        ${plans.slice(0, 5).map((p) => `
          <button type="button" class="life-event-active tap" data-plan="${escapeHtml(p.id)}">
            <strong>${p.icon} ${escapeHtml(p.title)}</strong>
            <div class="coaching-progress__bar"><div style="width:${p.progress}%"></div></div>
            <span>Rp ${fmt(p.saved)} / Rp ${fmt(p.target_cost)} · Rp ${fmt(p.monthly_needed)}/bln</span>
          </button>
        `).join('')}
      ` : ''}
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('[data-tpl]').forEach((btn) => {
    btn.addEventListener('click', () => showCreateForm(btn.getAttribute('data-tpl'), opts));
  });
  _host.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.addEventListener('click', () => showPlanDetail(btn.getAttribute('data-plan'), opts));
  });
}

/**
 * @param {string} planId
 * @param {object} [opts]
 */
function showPlanDetail(planId, opts = {}) {
  if (!_host) return;
  const raw = loadLifeEventPlans().find((p) => p.id === planId);
  if (!raw) {
    showLifeEventPlannerSheet(opts);
    return;
  }
  const plan = summarizeLifeEventPlan(raw);

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">${plan.icon} ${escapeHtml(plan.title)}</div>
        <button type="button" class="innovation-sheet__close" data-action="back">←</button>
      </div>
      <div class="life-event-detail-stats">
        <div><span>Progress</span><strong>${plan.progress}%</strong></div>
        <div><span>Nabung/bulan</span><strong>Rp ${fmt(plan.monthly_needed)}</strong></div>
        <div><span>Sisa</span><strong>Rp ${fmt(plan.gap)}</strong></div>
        <div><span>Status</span><strong>${plan.on_track ? '✅ On track' : '⚠️ Perlu dorongan'}</strong></div>
      </div>
      ${plan.meta?.base_cost ? `
        <p class="innovation-sheet__hint">Proyeksi inflasi 6%: Rp ${fmt(plan.meta.base_cost)} → Rp ${fmt(plan.target_cost)}</p>
      ` : ''}
      <h4 class="innovation-sheet__title" style="font-size:13px">Checklist</h4>
      <ul class="life-event-checklist">
        ${(plan.checklist || []).map((item, i) => `
          <li>
            <label class="life-event-check tap">
              <input type="checkbox" data-idx="${i}" ${item.done ? 'checked' : ''} />
              <span>${escapeHtml(item.label)}</span>
            </label>
          </li>
        `).join('')}
      </ul>
      <label class="innovation-label">Update tabungan terkumpul (Rp)
        <input type="number" id="lepSavedUpdate" value="${plan.saved}" class="innovation-input" />
      </label>
      <button type="button" class="innovation-btn tap" data-action="save-saved">Simpan progress</button>
    </div>
  `;

  _host.querySelector('[data-action="back"]')?.addEventListener('click', () => showLifeEventPlannerSheet(opts));
  _host.querySelectorAll('[data-idx]').forEach((input) => {
    input.addEventListener('change', () => {
      toggleLifeEventChecklist(planId, Number(input.getAttribute('data-idx')));
    });
  });
  _host.querySelector('[data-action="save-saved"]')?.addEventListener('click', () => {
    updateLifeEventPlan(planId, {
      saved: Number(_host.querySelector('#lepSavedUpdate')?.value || 0),
    });
    window.showToast?.('Progress disimpan', 'success');
    showPlanDetail(planId, opts);
  });
}

/**
 * @param {string} templateId
 * @param {object} [opts]
 */
function showCreateForm(templateId, opts = {}) {
  const tpl = LIFE_EVENT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl || !_host) return;

  const isEducation = templateId === 'education';
  const previewYears = 16;
  const previewCost = isEducation ? projectInflatedCost(tpl.cost_range.mid, previewYears) : tpl.cost_range.mid;

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">${tpl.icon} ${escapeHtml(tpl.title)}</div>
        <button type="button" class="innovation-sheet__close" data-action="back">←</button>
      </div>
      ${isEducation ? `
        <label class="innovation-label">Usia anak (tahun)
          <input type="number" id="lepChildAge" value="2" min="0" max="17" class="innovation-input" />
        </label>
        <p class="innovation-sheet__hint" id="lepEduPreview">Proyeksi S1 @ inflasi 6%: ~Rp ${fmt(previewCost)}</p>
      ` : `
        <label class="innovation-label">Target biaya (Rp)
          <input type="number" id="lepCost" value="${tpl.cost_range.mid}" class="innovation-input" />
        </label>
      `}
      <label class="innovation-label">Sudah terkumpul (Rp)
        <input type="number" id="lepSaved" value="0" class="innovation-input" />
      </label>
      <label class="innovation-label">Timeline (bulan)
        <input type="number" id="lepMonths" value="${Math.round(tpl.default_months)}" class="innovation-input" />
      </label>
      <button type="button" class="innovation-btn tap" data-action="save">Buat rencana</button>
    </div>
  `;

  if (isEducation) {
    const ageEl = _host.querySelector('#lepChildAge');
    const previewEl = _host.querySelector('#lepEduPreview');
    const monthsEl = _host.querySelector('#lepMonths');
    const updatePreview = () => {
      const age = Number(ageEl?.value || 2);
      const years = Math.max(1, 18 - age);
      const projected = projectInflatedCost(tpl.cost_range.mid, years);
      if (previewEl) previewEl.textContent = `Proyeksi S1 @ inflasi 6%: ~Rp ${fmt(projected)} (${years} tahun lagi)`;
      if (monthsEl) monthsEl.value = String(years * 12);
    };
    ageEl?.addEventListener('input', updatePreview);
    updatePreview();
  }

  _host.querySelector('[data-action="back"]')?.addEventListener('click', () => showLifeEventPlannerSheet(opts));
  _host.querySelector('[data-action="save"]')?.addEventListener('click', () => {
    if (isEducation) {
      projectEducationPlan({
        child_age: Number(_host.querySelector('#lepChildAge')?.value || 2),
        saved: Number(_host.querySelector('#lepSaved')?.value || 0),
        base_cost: tpl.cost_range.mid,
      });
    } else {
      createLifeEventPlan(templateId, {
        target_cost: Number(_host.querySelector('#lepCost')?.value),
        saved: Number(_host.querySelector('#lepSaved')?.value),
        months: Number(_host.querySelector('#lepMonths')?.value),
      });
    }
    opts.onCreated?.();
    window.showToast?.('Rencana life event dibuat', 'success');
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
