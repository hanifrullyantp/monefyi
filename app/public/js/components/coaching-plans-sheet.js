/**
 * Coaching plans enrollment sheet (Growth Fase 3.4).
 * @module components/coaching-plans-sheet
 */

import {
  COACHING_PLANS,
  enrollCoachingPlan,
  getActivePlanWithProgress,
  recommendPlanId,
  recordCoachingCheckin,
  cancelCoachingPlan,
} from '../services/coaching-plans.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export async function showCoachingPlansSheet(opts = {}) {
  const active = getActivePlanWithProgress();
  if (active && !opts.retake) {
    showActivePlan(active, opts);
    return;
  }

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'coachingPlansHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  const recommended = recommendPlanId(window.STATE);

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--coaching" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Coaching Plans</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <p class="innovation-sheet__hint">Pilih program yang paling relate — personalized, bukan generic tips.</p>
      <div class="coaching-plan-list">
        ${COACHING_PLANS.map((p) => `
          <button type="button" class="coaching-plan-card tap ${p.id === recommended ? 'is-recommended' : ''}" data-plan="${p.id}">
            <span class="coaching-plan-card__icon">${p.icon}</span>
            <div>
              <strong>${escapeHtml(p.title)}</strong>
              ${p.id === recommended ? '<span class="coaching-plan-card__badge">Rekomendasi</span>' : ''}
              <div class="coaching-plan-card__meta">${escapeHtml(p.target)} · ${p.duration_days} hari · ${p.success_rate}% sukses</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  _host.classList.add('is-visible');

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      enrollCoachingPlan(btn.getAttribute('data-plan'));
      showActivePlan(getActivePlanWithProgress(), opts);
      opts.onEnrolled?.();
    });
  });
}

/**
 * @param {object} active
 * @param {object} [opts]
 */
function showActivePlan(active, opts = {}) {
  if (!_host) return;
  const { plan, progress, currentFocus, day } = active;

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--coaching" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">${plan.icon} ${escapeHtml(plan.title)}</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <div class="coaching-progress">
        <div class="coaching-progress__bar"><div style="width:${progress}%"></div></div>
        <span>Hari ${day} · ${progress}%</span>
      </div>
      <div class="coaching-focus">
        <strong>Fokus sekarang</strong>
        <p>${escapeHtml(currentFocus?.label || '')}: ${escapeHtml(currentFocus?.focus || '')}</p>
      </div>
      <label class="innovation-label">Check-in hari ini
        <textarea id="coachingCheckinNote" rows="2" placeholder="Progress / kendala hari ini…"></textarea>
      </label>
      <button type="button" class="innovation-btn tap" data-action="checkin">Simpan check-in</button>
      <button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="cancel-plan">Batalkan plan</button>
    </div>
  `;

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelector('[data-action="checkin"]')?.addEventListener('click', () => {
    recordCoachingCheckin(_host.querySelector('#coachingCheckinNote')?.value);
    opts.onCheckin?.();
    close();
  });
  _host.querySelector('[data-action="cancel-plan"]')?.addEventListener('click', () => {
    if (confirm('Batalkan coaching plan aktif?')) {
      cancelCoachingPlan();
      close();
      opts.onCancel?.();
    }
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
