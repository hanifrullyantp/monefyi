/**
 * Guided emergency plan sheet (Growth Sprint 21).
 * @module components/emergency-plan-sheet
 */

import { buildEmergencyAssessment } from '../services/emergency-assessment.js';
import { setEmergencyMode } from '../services/emergency-mode.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showEmergencyPlanSheet(opts = {}) {
  const state = opts.state || window.STATE || {};
  const assessment = buildEmergencyAssessment(state);
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'emergencyPlanHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--emergency" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">🚨 Emergency Assessment</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <p class="innovation-sheet__hint">Mari review situasi — tanpa menghakimi, step by step.</p>

      <div class="emergency-assess-block">
        <div class="emergency-assess-row"><span>Cash available</span><strong>Rp ${fmt(assessment.cash_available)}</strong></div>
        <div class="emergency-assess-row"><span>Tagihan 7 hari</span><strong>Rp ${fmt(assessment.total_needed)}</strong></div>
        ${assessment.shortage > 0 ? `
          <div class="emergency-assess-row emergency-assess-row--warn">
            <span>Kekurangan</span><strong>Rp ${fmt(assessment.shortage)}</strong>
          </div>
        ` : ''}
      </div>

      ${assessment.bills_due.length ? `
        <section class="emergency-assess-section">
          <h4>Tagihan mendesak</h4>
          <ul class="emergency-assess-list">
            ${assessment.bills_due.map((b) => `
              <li>${escapeHtml(b.name)} — Rp ${fmt(b.amount)} (${b.days_until} hari lagi)</li>
            `).join('')}
          </ul>
        </section>
      ` : '<p class="admin-muted">Tidak ada tagihan rutin pending minggu ini.</p>'}

      ${assessment.cost_cuts.length ? `
        <section class="emergency-assess-section">
          <h4>✂️ Potong non-esensial</h4>
          <ul class="emergency-assess-list">
            ${assessment.cost_cuts.map((c) => `
              <li>${escapeHtml(c.label)} — ~Rp ${fmt(c.amount)}/${c.period}</li>
            `).join('')}
          </ul>
          <p class="emergency-assess-savings">Potensi hemat: ~Rp ${fmt(assessment.potential_monthly_savings)}/bulan</p>
        </section>
      ` : ''}

      <section class="emergency-assess-section">
        <h4>Langkah segera</h4>
        <ul class="emergency-assess-list">
          ${assessment.immediate_options.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}
        </ul>
      </section>

      <section class="emergency-assess-section">
        <h4>🗺️ Recovery 90 hari</h4>
        ${assessment.recovery_phases.map((p) => `
          <div class="emergency-recovery-phase"><strong>${escapeHtml(p.phase)}</strong> — ${escapeHtml(p.focus)}</div>
        `).join('')}
      </section>

      <button type="button" class="innovation-btn tap" data-action="activate">Aktifkan Mode Darurat</button>
      <button type="button" class="innovation-btn innovation-btn--ghost tap" data-action="budget">Buka budget survive</button>
    </div>
  `;

  _host.classList.add('is-visible');

  const close = () => {
    _host?.classList.remove('is-visible');
    opts.onClose?.();
  };

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelector('[data-action="activate"]')?.addEventListener('click', () => {
    setEmergencyMode(true, 'emergency_plan');
    window.showToast?.('Mode darurat aktif — fokus runway', 'warn');
    close();
    opts.onActivated?.();
    if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
  });
  _host.querySelector('[data-action="budget"]')?.addEventListener('click', async () => {
    close();
    const { saveBudgetFocusMode } = await import('../services/budget-focus-mode.js');
    await saveBudgetFocusMode('survive');
    window.showToast?.('Budget mode: survive', 'info');
    opts.onViewBudget?.();
  });
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
