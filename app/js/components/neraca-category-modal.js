/**
 * Category detail modal for Neraca rows (full-screen fallback + search).
 * @module components/neraca-category-modal
 */

import { Icon } from './icons.js';
import {
  isCategoryEditable,
  loadCategoryItems,
  mountInlineCategoryItems,
} from './neraca-category-items.js';

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {number} num
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {object} opts
 */
export async function showNeracaCategoryModal(opts) {
  const { key, sheet, endISO, onChanged } = opts;
  document.getElementById('neracaCategoryBackdrop')?.remove();

  const row = [...(sheet?.aktiva || []), ...(sheet?.pasiva || [])].find((r) => r.key === key);
  const title = row?.label || key;
  const editable = isCategoryEditable(key);

  let items = [];
  try {
    items = await loadCategoryItems(key, sheet, endISO);
  } catch {
    items = [];
  }

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const card3 = editable
    ? `${items.length} item · edit inline`
    : `${items.length} item · baca saja`;

  const backdrop = document.createElement('div');
  backdrop.id = 'neracaCategoryBackdrop';
  backdrop.className = 'neraca-overlay';

  backdrop.innerHTML = `
    <div class="neraca-modal" role="dialog" aria-modal="true">
      <header class="neraca-modal-head">
        <button type="button" class="neraca-icon-btn" data-action="close" aria-label="Kembali">${Icon('chevronLeft', { size: 16 })}</button>
        <h2>${escapeHtml(title)}</h2>
        <button type="button" class="neraca-icon-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 16 })}</button>
      </header>
      <div class="neraca-modal-body">
        <div class="neraca-summary-cards">
          <div class="neraca-sum-card">
            <span class="neraca-sum-card-label">Jumlah</span>
            <span class="neraca-sum-card-value">${items.length} item</span>
          </div>
          <div class="neraca-sum-card">
            <span class="neraca-sum-card-label">Total</span>
            <span class="neraca-sum-card-value">Rp ${formatIDR(total)}</span>
          </div>
          <div class="neraca-sum-card">
            <span class="neraca-sum-card-label">Info</span>
            <span class="neraca-sum-card-value">${escapeHtml(card3)}</span>
          </div>
        </div>
        <div class="neraca-inline-host" data-role="inline-host"></div>
      </div>
      <footer class="neraca-modal-foot">
        <button type="button" class="neraca-btn" data-action="close">Tutup</button>
      </footer>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-action="close"]')) close();
  });

  const host = backdrop.querySelector('[data-role="inline-host"]');
  await mountInlineCategoryItems(host, {
    key,
    sheet,
    endISO,
    onChanged,
  });
}
