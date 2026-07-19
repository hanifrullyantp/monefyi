/**
 * Budget edit modal — info card + item detail cards with slider & linked txs.
 * @module components/budget-form-modal
 */

import {
  PRIORITY_LEVELS,
  createBudgetRow,
  createBudgetItem,
  normalizeBudgetRow,
  calculateProgress,
  getLinkedTransactions,
  normalizeCategoryName,
} from '../services/budget-model.js';
import { Icon } from './icons.js';

/**
 * @param {unknown} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * Match expenses to a budget item by name keyword / amount proximity.
 * @param {object} item
 * @param {object[]} linkedTxs
 */
function matchItemTransactions(item, linkedTxs) {
  const name = String(item.name || '').toLowerCase().trim();
  const itemTotal = Number(item.qty || 1) * Number(item.price || 0);
  if (!name && !itemTotal) return [];

  return (linkedTxs || [])
    .map((t) => {
      const hay = `${t.merchant || ''} ${t.notes || ''} ${t.category || ''}`.toLowerCase();
      const amt = Number(t.amount || 0);
      let score = 0;
      if (name && hay.includes(name)) score += 3;
      if (name && name.split(/\s+/).some((w) => w.length > 2 && hay.includes(w))) score += 1;
      if (itemTotal > 0 && Math.abs(amt - itemTotal) / itemTotal < 0.15) score += 2;
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.t);
}

/**
 * @param {object} item
 * @param {number} maxAmount
 * @param {object[]} matchedTxs
 */
function renderItemCard(item, maxAmount, matchedTxs) {
  const isDone = item.status === 'done' || item.status === 'skipped';
  const amount = Math.round(Number(item.qty || 1) * Number(item.price || 0));
  const sliderMax = Math.max(maxAmount, amount, 1000000);

  return `
    <div class="bfm-item-card ${isDone ? 'item-done' : ''}" data-item-id="${item.id}">
      <div class="bfm-item-top">
        <input type="text" class="item-name form-input bfm-item-name" placeholder="Nama detail item" value="${escapeHtml(item.name || '')}">
        <button type="button" class="bfm-icon-btn danger tap" data-action="remove-item" title="Hapus item" aria-label="Hapus">
          ${Icon('trash', { size: 14 })}
        </button>
      </div>
      <div class="bfm-item-amount-row">
        <input type="range" class="item-amount-slider" min="0" max="${sliderMax}" step="1000" value="${amount}">
        <div class="bfm-inline-amount">
          <span>Rp</span>
          <input type="number" class="item-price form-input" min="0" step="1000" value="${amount || ''}" inputmode="numeric">
        </div>
      </div>
      <input type="hidden" class="item-qty" value="1">
      <label class="bfm-done-toggle">
        <input type="checkbox" class="item-checkbox" ${isDone ? 'checked' : ''}>
        <span>Selesai</span>
      </label>
      <div class="bfm-item-matches">
        <div class="bfm-matches-title">Realisasi cocok dengan item</div>
        ${matchedTxs.length ? matchedTxs.map((t) => `
          <div class="bfm-tx-row">
            <div class="bfm-tx-main">
              <div class="bfm-tx-name">${escapeHtml(t.merchant || t.notes || t.category || '—')}</div>
              <div class="bfm-tx-sub">${escapeHtml(String(t.date || '').slice(0, 10))}</div>
            </div>
            <div class="bfm-tx-amt">Rp ${fmt(t.amount)}</div>
          </div>
        `).join('') : '<div class="bfm-empty-soft">Belum ada transaksi yang cocok</div>'}
      </div>
    </div>
  `;
}

/**
 * @param {object[]} txs
 */
function renderCategoryTxList(txs) {
  if (!txs.length) {
    return '<div class="bfm-empty-soft">Belum ada transaksi kategori ini bulan ini</div>';
  }
  return txs.slice(0, 20).map((t) => `
    <div class="bfm-tx-row">
      <div class="bfm-tx-main">
        <div class="bfm-tx-name">${escapeHtml(t.merchant || t.notes || '—')}</div>
        <div class="bfm-tx-sub">${escapeHtml(String(t.date || '').slice(0, 10))} · ${escapeHtml(t.category || '')}</div>
      </div>
      <div class="bfm-tx-amt">Rp ${fmt(t.amount)}</div>
    </div>
  `).join('');
}

/**
 * @param {object[]} items
 */
function sortItemsForDisplay(items) {
  return [...items].sort((a, b) => {
    const aDone = a.status === 'done' || a.status === 'skipped' ? 1 : 0;
    const bDone = b.status === 'done' || b.status === 'skipped' ? 1 : 0;
    return aDone - bDone;
  });
}

/**
 * @param {object} defaults
 * @param {object} [options]
 */
export function showBudgetFormModal(defaults = {}, options = {}) {
  const existing = document.querySelector('.budget-modal-overlay');
  if (existing) existing.remove();

  const row = normalizeBudgetRow(defaults.id ? defaults : createBudgetRow(defaults));
  const isEdit = Boolean(defaults.id);
  const month = options.month || window.STATE?.selectedMonth || getCurrentPeriod();
  const transactions = options.transactions
    || (window.STATE?.transactions || []).filter((t) => String(t.date || '').startsWith(month));

  const progress = calculateProgress(row, transactions, month);
  const linkedTxs = progress.linkedTransactions || getLinkedTransactions(row, transactions, month);
  const catNorm = normalizeCategoryName(row.name);
  const categoryTxs = transactions.filter(
    (t) => t.type === 'expense' && normalizeCategoryName(t.category) === catNorm,
  );

  const items = sortItemsForDisplay(row.items?.length ? row.items : [createBudgetItem()]);
  const maxItem = Math.max(row.amount || 0, progress.spent || 0, 5_000_000);
  const priority = PRIORITY_LEVELS[(row.priority || 'penting').toUpperCase()] || PRIORITY_LEVELS.PENTING;

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.innerHTML = `
    <div class="budget-modal budget-form-simplified bfm-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>${isEdit ? 'Detail Budget' : 'Tambah Budget'}</h2>
          <p class="modal-subtitle">${escapeHtml(month)}</p>
        </div>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 18 })}</button>
      </header>
      <div class="modal-body">
        <section class="bfm-info-card" data-expanded="false">
          <button type="button" class="bfm-info-toggle tap" data-action="toggle-info">
            <div class="bfm-info-left">
              <span class="bfm-priority" style="color:${priority.color}">
                ${Icon(priority.icon || 'target', { size: 14 })} ${priority.label}
              </span>
              <div class="bfm-info-title">${escapeHtml(row.name || 'Budget baru')}</div>
              <div class="bfm-info-stats">
                Realisasi Rp ${fmt(progress.spent)} · Budget Rp ${fmt(row.amount)} · Sisa Rp ${fmt(progress.remaining)}
              </div>
            </div>
            <span class="bfm-info-chev">${Icon('chevronDown', { size: 16 })}</span>
          </button>
          <div class="bfm-info-settings hidden">
            <div class="form-section">
              <label class="form-label">Prioritas</label>
              <div class="priority-selector-compact">
                ${Object.values(PRIORITY_LEVELS).map((pl) => `
                  <label class="priority-option-compact ${row.priority === pl.key ? 'selected' : ''}" style="--priority-color:${pl.color}">
                    <input type="radio" name="priority" value="${pl.key}" ${row.priority === pl.key ? 'checked' : ''}>
                    <span class="po-icon">${Icon(pl.icon || 'target', { size: 14 })}</span>
                    <span class="po-label">${pl.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>
            <div class="form-section">
              <label class="form-label" for="budget-category">Nama Kategori</label>
              <input type="text" id="budget-category" class="form-input"
                placeholder="Contoh: Belanja Pasar, Listrik..."
                value="${escapeHtml(row.name)}">
            </div>
            <details class="form-section keywords-section" open>
              <summary>Auto-Link Keywords</summary>
              <div class="keywords-content">
                <div class="label-hint">Transaksi dengan kata kunci ini otomatis masuk budget ini</div>
                <div class="keyword-tags" id="keyword-tags">
                  ${(row.auto_link_keywords || []).map((kw) => `
                    <span class="keyword-tag" data-keyword="${escapeHtml(kw)}">
                      ${escapeHtml(kw)}
                      <button type="button" data-action="remove-keyword">${Icon('x', { size: 10 })}</button>
                    </span>
                  `).join('')}
                </div>
                <div class="keyword-input-row">
                  <input type="text" id="keyword-input" class="form-input" placeholder="Ketik keyword lalu Enter">
                  <button type="button" class="btn-add-keyword tap" data-action="add-keyword">${Icon('plus', { size: 14 })}</button>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section class="form-section">
          <div class="form-label-row">
            <label class="form-label">Detail Item</label>
            <button type="button" class="btn-add-item tap" data-action="add-item">${Icon('plus', { size: 12 })} Tambah</button>
          </div>
          <div class="bfm-items-list" id="items-list">
            ${items.map((item) => renderItemCard(item, maxItem, matchItemTransactions(item, linkedTxs))).join('')}
          </div>
          <div class="items-total">Total item: Rp <span id="items-total">0</span></div>
        </section>

        <section class="bfm-cat-txs">
          <div class="bfm-matches-title">Transaksi kategori "${escapeHtml(row.name || '—')}"</div>
          <div class="bfm-cat-tx-list">
            ${renderCategoryTxList(categoryTxs)}
          </div>
        </section>
      </div>
      <footer class="modal-footer modal-footer--split">
        ${isEdit ? `<button type="button" class="btn-danger-outline tap" data-action="delete-budget">${Icon('trash', { size: 14 })} Hapus</button>` : '<span></span>'}
        <div class="modal-footer__actions">
          <button type="button" class="btn-secondary-budget tap" data-action="close">Batal</button>
          <button type="button" class="btn-primary-budget tap" data-action="save">${Icon('check', { size: 14 })} ${isEdit ? 'Simpan' : 'Buat'}</button>
        </div>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  wireModalHandlers(modal, row, defaults, { ...options, month, transactions, linkedTxs, maxItem });
  updateItemsTotal(modal);
}

/**
 * @param {HTMLElement} modal
 * @param {object} originalRow
 * @param {object} defaults
 * @param {object} options
 */
function wireModalHandlers(modal, originalRow, defaults, options) {
  const close = () => modal.remove();
  modal.querySelectorAll('[data-action="close"]').forEach((btn) => { btn.onclick = close; });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('[data-action="toggle-info"]')?.addEventListener('click', () => {
    const card = modal.querySelector('.bfm-info-card');
    const settings = modal.querySelector('.bfm-info-settings');
    const open = card?.dataset.expanded === 'true';
    if (card) card.dataset.expanded = open ? 'false' : 'true';
    settings?.classList.toggle('hidden', open);
  });

  modal.querySelectorAll('input[name="priority"]').forEach((radio) => {
    radio.onchange = () => {
      modal.querySelectorAll('.priority-option-compact').forEach((o) => o.classList.remove('selected'));
      radio.closest('.priority-option-compact')?.classList.add('selected');
    };
  });

  modal.querySelector('[data-action="add-item"]')?.addEventListener('click', () => {
    const list = modal.querySelector('#items-list');
    const div = document.createElement('div');
    div.innerHTML = renderItemCard(createBudgetItem(), options.maxItem || 5_000_000, []);
    const newRow = div.firstElementChild;
    list?.appendChild(newRow);
    wireItemRow(modal, newRow, options);
    updateItemsTotal(modal);
  });

  modal.querySelectorAll('.bfm-item-card').forEach((rowEl) => wireItemRow(modal, rowEl, options));

  const keywordInput = modal.querySelector('#keyword-input');
  const addKeyword = () => {
    const val = keywordInput?.value.trim();
    if (!val) return;
    const tags = modal.querySelector('#keyword-tags');
    if (tags?.querySelector(`[data-keyword="${CSS.escape(val)}"]`)) {
      keywordInput.value = '';
      return;
    }
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.dataset.keyword = val;
    tag.innerHTML = `${escapeHtml(val)} <button type="button" data-action="remove-keyword">${Icon('x', { size: 10 })}</button>`;
    tag.querySelector('button')?.addEventListener('click', () => tag.remove());
    tags?.appendChild(tag);
    keywordInput.value = '';
  };

  modal.querySelector('[data-action="add-keyword"]')?.addEventListener('click', addKeyword);
  keywordInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
  });
  modal.querySelectorAll('[data-action="remove-keyword"]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.keyword-tag')?.remove());
  });

  modal.querySelector('[data-action="delete-budget"]')?.addEventListener('click', async () => {
    if (!confirm('Hapus budget kategori ini?')) return;
    const state = window.STATE;
    if (state?.budgetDraft?.rows) {
      const before = JSON.parse(JSON.stringify(state.budgetDraft.rows));
      state.budgetDraft.rows = state.budgetDraft.rows.filter((r) => r.id !== originalRow.id);
      try {
        const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
        recordBudgetRowsChange('Hapus budget', before, state.budgetDraft.rows);
      } catch { /* ignore */ }
    }
    showToast('Budget dihapus');
    close();
    options.onSaved?.();
    if (typeof window.renderBudgetPageView === 'function' && window.STATE?.ui?.budgetPageOpen) {
      window.renderBudgetPageView();
    }
  });

  modal.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    const data = collectFormData(modal, originalRow);
    if (!validateForm(data, modal)) return;
    try {
      const state = window.STATE;
      const before = JSON.parse(JSON.stringify(state?.budgetDraft?.rows || []));
      await saveToDraft(data, defaults.month || options.month);
      try {
        const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
        recordBudgetRowsChange('Edit budget', before, state.budgetDraft.rows);
      } catch { /* ignore */ }
      showToast('Budget tersimpan');
      close();
      options.onSaved?.();
      if (typeof window.renderBudgetPageView === 'function' && window.STATE?.ui?.budgetPageOpen) {
        window.renderBudgetPageView();
      }
      if (typeof window.rerender === 'function') window.rerender();
    } catch (e) {
      showToast('Gagal simpan: ' + e.message);
    }
  });
}

/**
 * @param {HTMLElement} modal
 * @param {HTMLElement} rowEl
 * @param {object} options
 */
function wireItemRow(modal, rowEl, options = {}) {
  const slider = rowEl.querySelector('.item-amount-slider');
  const priceInput = rowEl.querySelector('.item-price');

  const syncFromSlider = () => {
    const v = Number(slider?.value || 0);
    if (priceInput) priceInput.value = String(v);
    updateItemsTotal(modal);
  };
  const syncFromInput = () => {
    const v = Math.max(0, Number(priceInput?.value || 0));
    if (slider) {
      if (v > Number(slider.max)) slider.max = String(v);
      slider.value = String(v);
    }
    updateItemsTotal(modal);
  };

  slider?.addEventListener('input', syncFromSlider);
  priceInput?.addEventListener('input', syncFromInput);

  rowEl.querySelector('.item-checkbox')?.addEventListener('change', (e) => {
    rowEl.classList.toggle('item-done', e.target.checked);
  });

  rowEl.querySelector('[data-action="remove-item"]')?.addEventListener('click', () => {
    if (modal.querySelectorAll('.bfm-item-card').length <= 1) return;
    rowEl.remove();
    updateItemsTotal(modal);
  });
}

/**
 * @param {HTMLElement} modal
 */
function updateItemsTotal(modal) {
  let total = 0;
  modal.querySelectorAll('.bfm-item-card').forEach((rowEl) => {
    total += parseFloat(rowEl.querySelector('.item-price')?.value) || 0;
  });
  const el = modal.querySelector('#items-total');
  if (el) el.textContent = fmt(total);
}

/**
 * @param {string|null} dayStr
 * @param {boolean} markedDone
 */
function inferItemStatus(dayStr, markedDone) {
  if (markedDone) return 'done';
  return 'planned';
}

/**
 * @param {HTMLElement} modal
 * @param {object} originalRow
 */
function collectFormData(modal, originalRow) {
  const items = [];
  modal.querySelectorAll('.bfm-item-card').forEach((rowEl) => {
    const markedDone = rowEl.querySelector('.item-checkbox')?.checked === true;
    const price = parseFloat(rowEl.querySelector('.item-price')?.value) || 0;
    items.push(createBudgetItem({
      id: rowEl.dataset.itemId,
      name: rowEl.querySelector('.item-name')?.value || '',
      qty: 1,
      price,
      target_date_day: null,
      status: inferItemStatus(null, markedDone),
    }));
  });

  const keywords = [];
  modal.querySelectorAll('.keyword-tag').forEach((tag) => {
    keywords.push(tag.dataset.keyword || tag.textContent.trim());
  });

  const nameFromInput = modal.querySelector('#budget-category')?.value.trim();
  const nameFromTitle = modal.querySelector('.bfm-info-title')?.textContent?.trim();

  return createBudgetRow({
    id: originalRow.id,
    name: nameFromInput || nameFromTitle || '',
    priority: modal.querySelector('input[name="priority"]:checked')?.value || originalRow.priority || 'penting',
    items,
    auto_link_keywords: keywords,
    amount: items.reduce((sum, i) => sum + i.qty * i.price, 0),
    created_at: originalRow.created_at,
    target_type: originalRow.target_type || 'monthly',
    allow_overspend: originalRow.allow_overspend !== false,
    rollover_enabled: originalRow.rollover_enabled === true,
    notification_thresholds: originalRow.notification_thresholds || [75, 100],
  });
}

/**
 * @param {object} data
 * @param {HTMLElement} modal
 */
function validateForm(data, modal) {
  if (!data.name) {
    showToast('Nama kategori wajib diisi — buka pengaturan di card informasi');
    modal.querySelector('.bfm-info-settings')?.classList.remove('hidden');
    const card = modal.querySelector('.bfm-info-card');
    if (card) card.dataset.expanded = 'true';
    modal.querySelector('#budget-category')?.focus();
    return false;
  }
  if (!data.amount) {
    showToast('Tambah minimal 1 item dengan nilai');
    return false;
  }
  return true;
}

/**
 * @param {object} row
 * @param {string} [monthOverride]
 */
async function saveToDraft(row, monthOverride) {
  const state = window.STATE;
  if (!state?.budgetDraft) {
    const mk = monthOverride || state?.selectedMonth || getCurrentPeriod();
    state.budgetDraft = { month: mk, income: 0, rows: [], initialFrom: 'new' };
  }
  const idx = state.budgetDraft.rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) state.budgetDraft.rows[idx] = row;
  else state.budgetDraft.rows.push(row);
  row.amount = row.items.reduce((s, i) => s + i.qty * i.price, 0) || row.amount;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function showToast(msg) {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, 'info');
    return;
  }
  const t = document.createElement('div');
  t.className = 'action-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

if (typeof window !== 'undefined') {
  window.monefyiBudgetForm = { showBudgetFormModal };
}
