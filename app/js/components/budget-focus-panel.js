/**
 * Budget focus panel — fixed bills + mode insights on budget page.
 * @module components/budget-focus-panel
 */

import { Icon } from './icons.js';
import {
  computeFocusInsights,
  computeFixedBillsSection,
  getBudgetFocusMode,
  FOCUS_MODES,
} from '../services/budget-focus-mode.js';

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = String(s ?? '');
  return d.innerHTML;
}

/**
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n || 0)));
}

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 */
export function renderBudgetFocusPanel(container, ctx = {}) {
  if (!container) return;

  const prefs = window.STATE?.db?.userPreferences || {};
  const mode = getBudgetFocusMode();
  const modeInfo = FOCUS_MODES[mode] || FOCUS_MODES.survive;
  const {
    rows = [],
    transactions = [],
    month = '',
    income = 0,
  } = ctx;

  const fixed = computeFixedBillsSection(prefs, rows, transactions, month, income);
  const insights = computeFocusInsights(mode, { income, rows, transactions, month, prefs });

  container.innerHTML = `
    <section class="bfp-card">
      <div class="bfp-header">
        <div class="bfp-mode-chip" data-action="change-focus-mode" role="button" tabindex="0" title="Ganti mode fokus">
          ${Icon(modeInfo.icon, { size: 14 })}
          <span>${escapeHtml(modeInfo.shortLabel)}</span>
          ${Icon('chevronDown', { size: 12 })}
        </div>
        <span class="bfp-mode-label">${escapeHtml(modeInfo.label)}</span>
      </div>

      <div class="bfp-focus-metric">
        <div class="bfp-focus-title">${escapeHtml(insights.headline)}</div>
        <div class="bfp-focus-detail ${insights.alert ? 'is-alert' : ''}">${escapeHtml(insights.detail)}</div>
        ${insights.metricLabel ? `
          <div class="bfp-metric-row">
            <span>${escapeHtml(insights.metricLabel)}</span>
            <strong>${escapeHtml(insights.metricValue)}</strong>
          </div>
        ` : ''}
      </div>

      <div class="bfp-fixed-section">
        <div class="bfp-section-title">${Icon('lock', { size: 12 })} Tagihan Tetap Bulan Ini</div>
        ${fixed.items.length ? `
          <ul class="bfp-bill-list">
            ${fixed.items.slice(0, 6).map((b) => `
              <li class="bfp-bill-item">
                <span class="bfp-bill-name">${escapeHtml(b.name)}</span>
                <span class="bfp-bill-amt">${fmt(b.spent)} / ${fmt(b.planned)}</span>
              </li>
            `).join('')}
            ${fixed.items.length > 6 ? `<li class="bfp-bill-more">+${fixed.items.length - 6} tagihan lain</li>` : ''}
          </ul>
        ` : `
          <p class="bfp-empty">Belum ada tagihan tetap — tambah dari onboarding atau kategori Wajib.</p>
        `}
        <div class="bfp-manageable">
          <span>Uang yang benar-benar bisa kamu kelola</span>
          <strong>Rp ${fmt(fixed.manageable)}</strong>
        </div>
        <div class="bfp-manageable-hint">
          Income Rp ${fmt(fixed.income)} − tagihan Rp ${fmt(fixed.totalPlanned)}${fixed.savePlanned ? ` − simpan Rp ${fmt(fixed.savePlanned)}` : ''}
        </div>
      </div>
    </section>
  `;

  container.querySelector('[data-action="change-focus-mode"]')?.addEventListener('click', async () => {
    const { showBudgetFocusPicker } = await import('./budget-focus-picker.js');
    showBudgetFocusPicker({
      onSelected: () => ctx.onModeChange?.(),
    });
  });
}
