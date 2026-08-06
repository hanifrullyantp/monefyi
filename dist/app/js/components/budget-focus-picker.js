/**
 * Modal — pick budget focus mode before auto-generate or from budget page.
 * @module components/budget-focus-picker
 */

import { Icon } from './icons.js';
import {
  FOCUS_MODES,
  getBudgetFocusMode,
  saveBudgetFocusMode,
} from '../services/budget-focus-mode.js';

/**
 * @param {object} [options]
 * @param {(mode: string) => void} [options.onSelected]
 * @param {boolean} [options.requireConfirm]
 * @returns {Promise<string|null>}
 */
export function showBudgetFocusPicker(options = {}) {
  return new Promise((resolve) => {
    const current = getBudgetFocusMode();
    const overlay = document.createElement('div');
    overlay.className = 'budget-modal-overlay bfp-picker-overlay';
    overlay.innerHTML = `
      <div class="budget-modal bfp-picker" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div>
            <h2>Mode Fokus Budget</h2>
            <p class="modal-subtitle">Pilih logika budget yang paling cocok dengan kondisimu</p>
          </div>
          <button type="button" class="close-btn" data-action="close">${Icon('x', { size: 18 })}</button>
        </header>
        <div class="modal-body bfp-picker-body">
          ${Object.values(FOCUS_MODES).map((m) => `
            <button type="button" class="bfp-mode-option ${m.key === current ? 'is-active' : ''}" data-mode="${m.key}">
              <span class="bfp-mode-option-icon">${Icon(m.icon, { size: 20 })}</span>
              <span class="bfp-mode-option-text">
                <span class="bfp-mode-option-title">${m.label}</span>
                <span class="bfp-mode-option-desc">${m.description}</span>
              </span>
              ${m.key === current ? `<span class="bfp-mode-check">${Icon('check', { size: 16 })}</span>` : ''}
            </button>
          `).join('')}
        </div>
        <footer class="modal-footer">
          <button type="button" class="btn-secondary-budget tap" data-action="close">Batal</button>
        </footer>
      </div>
    `;

    const close = (mode = null) => {
      overlay.remove();
      resolve(mode);
    };

    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-action="close"]').forEach((b) => {
      b.onclick = () => close(null);
    });
    overlay.onclick = (e) => { if (e.target === overlay) close(null); };

    overlay.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mode = btn.getAttribute('data-mode');
        if (!mode) return;
        btn.classList.add('is-loading');
        const result = await saveBudgetFocusMode(/** @type {import('../services/budget-focus-mode.js').BudgetFocusMode} */ (mode));
        if (!result.success) {
          if (typeof window.showToast === 'function') window.showToast(result.error || 'Gagal simpan mode');
          btn.classList.remove('is-loading');
          return;
        }
        options.onSelected?.(mode);
        close(mode);
      });
    });
  });
}

/**
 * Show picker then run generator callback if mode selected.
 * @param {() => void} onReady
 */
export async function pickFocusModeThen(onReady) {
  const mode = await showBudgetFocusPicker({ requireConfirm: true });
  if (mode) onReady?.();
}
