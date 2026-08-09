/**
 * Weekly financial wellness check-in (Fase 8.4).
 * @module components/wellness-checkin-sheet
 */

import {
  saveWellnessCheckin,
  computeWellnessScore,
  getThisWeekCheckin,
} from '../services/financial-wellness.js';

/** @type {HTMLElement|null} */
let _host = null;

/**
 * @param {object} [opts]
 */
export function showWellnessCheckinSheet(opts = {}) {
  if (getThisWeekCheckin() && !opts.force) {
    showWellnessResult(computeWellnessScore(), opts);
    return;
  }

  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'wellnessCheckinHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Wellness Check-in</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <p class="innovation-sheet__hint">Selain angka, kondisi mental juga penting. Skala 1–10:</p>
      ${sliderField('stress', 'Stres keuangan minggu ini', 5)}
      ${sliderField('sleep', 'Kualitas tidur', 6)}
      ${sliderField('confidence', 'Keyakinan masa depan finansial', 5)}
      <label class="innovation-label">Catatan (opsional)
        <textarea id="wellnessNote" rows="2" placeholder="Apa yang bikin stress/lega minggu ini?"></textarea>
      </label>
      <button type="button" class="innovation-btn tap" data-action="save">Simpan</button>
    </div>
  `;

  _host.classList.add('is-visible');
  _host.querySelectorAll('input[type="range"]').forEach((input) => {
    const valEl = _host.querySelector(`#${input.id}-val`);
    input.addEventListener('input', () => { if (valEl) valEl.textContent = input.value; });
  });
  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelector('[data-action="save"]')?.addEventListener('click', () => {
    const data = {
      stress: _host.querySelector('#wellness-stress')?.value,
      sleep: _host.querySelector('#wellness-sleep')?.value,
      confidence: _host.querySelector('#wellness-confidence')?.value,
      note: _host.querySelector('#wellnessNote')?.value,
    };
    saveWellnessCheckin(data);
    showWellnessResult(computeWellnessScore(), opts);
    opts.onSaved?.();
  });
}

function sliderField(id, label, defaultVal) {
  return `
    <label class="innovation-label" for="wellness-${id}">${escapeHtml(label)}: <span id="wellness-${id}-val">${defaultVal}</span></label>
    <input type="range" id="wellness-${id}" min="1" max="10" value="${defaultVal}" />
  `;
}

/**
 * @param {object} score
 * @param {object} [opts]
 */
function showWellnessResult(score, opts = {}) {
  if (!_host) return;
  _host.innerHTML = `
    <div class="innovation-sheet" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">Skor Wellness</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <div class="wellness-score-display">
        <div class="wellness-score-num">${score.overall ?? '—'}</div>
        <div class="wellness-score-label">${escapeHtml(score.label)}</div>
      </div>
      ${score.components ? Object.values(score.components).map((c) => `
        <div class="wellness-bar">
          <span>${escapeHtml(c.label)}</span>
          <span>${c.score}/100</span>
        </div>
      `).join('') : ''}
      <button type="button" class="innovation-btn tap" data-action="close">Oke</button>
    </div>
  `;
  _host.querySelector('[data-action="close"]')?.addEventListener('click', () => {
    close();
    opts.onComplete?.(score);
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
