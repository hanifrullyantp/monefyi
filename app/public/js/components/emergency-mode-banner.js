/**
 * Emergency mode banner for home (Fase 8.3).
 * @module components/emergency-mode-banner
 */

import {
  isEmergencyModeActive,
  setEmergencyMode,
  shouldAutoTriggerEmergency,
  getEmergencyRunway,
  getRecoveryProgress,
} from '../services/emergency-mode.js';

/**
 * @param {object} [state]
 * @param {object} [callbacks]
 * @returns {HTMLElement|null}
 */
export function renderEmergencyModeBanner(state = window.STATE, callbacks = {}) {
  if (shouldAutoTriggerEmergency(state) && !isEmergencyModeActive()) {
    setEmergencyMode(true, 'auto_danger');
  }

  if (!isEmergencyModeActive()) return null;

  const runway = getEmergencyRunway(state);
  const recovery = getRecoveryProgress(state);
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));

  const el = document.createElement('section');
  el.className = 'home-section emergency-mode-banner';
  el.innerHTML = `
    <div class="emergency-mode-banner__inner">
      <div class="emergency-mode-banner__head">
        <span>🚨</span>
        <div>
          <strong>Mode Darurat Aktif</strong>
          <div class="emergency-mode-banner__sub">Kategori discretionary dikunci · fokus runway</div>
        </div>
      </div>
      <div class="emergency-mode-banner__stats">
        <div>Safe/hari: <strong>Rp ${fmt(runway.safe_per_day)}</strong></div>
        ${runway.days_until_runout != null ? `<div>Runway: <strong>${runway.days_until_runout} hari</strong></div>` : ''}
        <div>Pemulihan: <strong>${recovery.progress}%</strong></div>
      </div>
      <ul class="emergency-mode-banner__actions">
        ${runway.actions.slice(0, 2).map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
      </ul>
      <div class="emergency-mode-banner__btns">
        <button type="button" class="emergency-mode-banner__cta tap" data-action="plan">Mulai rencana darurat</button>
        <button type="button" class="emergency-mode-banner__cta tap" data-action="advisor">Lihat saran</button>
        <button type="button" class="emergency-mode-banner__off tap" data-action="off">Matikan mode</button>
      </div>
    </div>
  `;

  el.querySelector('[data-action="plan"]')?.addEventListener('click', async () => {
    const { showEmergencyPlanSheet } = await import('./emergency-plan-sheet.js');
    showEmergencyPlanSheet({ onViewBudget: callbacks.onViewBudget });
  });
  el.querySelector('[data-action="advisor"]')?.addEventListener('click', () => {
    callbacks.onViewAdvisor?.();
  });
  el.querySelector('[data-action="off"]')?.addEventListener('click', () => {
    if (confirm('Yakin matikan mode darurat? Pastikan kondisi sudah membaik.')) {
      setEmergencyMode(false, 'manual_off');
      el.remove();
      if (typeof window.rerenderHomePage === 'function') window.rerenderHomePage();
    }
  });

  return el;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
