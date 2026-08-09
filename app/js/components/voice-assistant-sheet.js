/**
 * Voice assistant help sheet with example commands (Growth Sprint 24).
 * @module components/voice-assistant-sheet
 */

import { parseVoiceCommand, handleVoiceAssistant } from '../services/voice-assistant.js';

/** @type {HTMLElement|null} */
let _host = null;

const EXAMPLES = [
  'Berapa saldo saya?',
  'Catat kopi 30rb GoPay',
  'Rencana nikah',
  'Simulasi beli laptop',
  'Buka wishlist',
  'Wellness check-in',
  'Mode darurat',
];

/**
 * @param {object} [opts]
 */
export function showVoiceAssistantSheet(opts = {}) {
  if (!_host) {
    _host = document.createElement('div');
    _host.id = 'voiceAssistantHost';
    _host.className = 'innovation-host';
    document.body.appendChild(_host);
  }

  _host.innerHTML = `
    <div class="innovation-sheet innovation-sheet--voice" role="dialog" aria-modal="true">
      <div class="innovation-sheet__head">
        <div class="innovation-sheet__kicker">🎙️ Voice Assistant</div>
        <button type="button" class="innovation-sheet__close" data-action="close">×</button>
      </div>
      <p class="innovation-sheet__hint">Ucapkan perintah finansial — atau ketik di bawah untuk uji.</p>
      <div class="voice-examples">
        ${EXAMPLES.map((ex) => `
          <button type="button" class="innovation-chip tap voice-example" data-ex="${escapeHtml(ex)}">${escapeHtml(ex)}</button>
        `).join('')}
      </div>
      <label class="innovation-label">Uji perintah
        <input type="text" id="voiceTestInput" class="innovation-input" placeholder="Contoh: berapa saldo saya" />
      </label>
      <button type="button" class="innovation-btn tap" data-action="run">Jalankan</button>
      <div id="voiceTestResult" class="voice-test-result admin-muted"></div>
    </div>
  `;

  _host.classList.add('is-visible');

  const close = () => {
    _host?.classList.remove('is-visible');
    opts.onClose?.();
  };

  _host.querySelector('[data-action="close"]')?.addEventListener('click', close);
  _host.querySelectorAll('.voice-example').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = _host.querySelector('#voiceTestInput');
      if (input) input.value = btn.getAttribute('data-ex') || '';
      runTest(opts);
    });
  });
  _host.querySelector('[data-action="run"]')?.addEventListener('click', () => runTest(opts));
}

/**
 * @param {object} [opts]
 */
async function runTest(opts = {}) {
  const text = _host?.querySelector('#voiceTestInput')?.value?.trim();
  const resultEl = _host?.querySelector('#voiceTestResult');
  if (!text) return;

  const parsed = await handleVoiceAssistant(text, opts);
  if (resultEl && parsed) {
    resultEl.textContent = `${parsed.intent}: ${parsed.reply}`;
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
