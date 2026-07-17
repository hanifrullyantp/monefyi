/**
 * Simplified budget form modal — compact priority, item list, auto status.
 * @module components/budget-form-modal
 */

import {
  PRIORITY_LEVELS,
  createBudgetRow,
  createBudgetItem,
  normalizeBudgetRow,
  calculateProgress,
} from '../services/budget-model.js';

/**
 * @param {unknown} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {object} item
 */
function renderItemRowSimplified(item) {
  const isDone = item.status === 'done' || item.status === 'skipped';
  const dayVal = item.target_date_day || '';

  return `
    <div class="item-row-simplified ${isDone ? 'item-done' : ''}" data-item-id="${item.id}">
      <div class="item-row-main">
        <label class="item-checkbox-wrap" title="Tandai selesai">
          <input type="checkbox" class="item-checkbox" ${isDone ? 'checked' : ''}>
          <span class="item-check-visual">${isDone ? '✓' : ''}</span>
        </label>
        <input type="text" class="item-name form-input" placeholder="Nama item" value="${escapeHtml(item.name || '')}">
      </div>
      <div class="item-row-details">
        <div class="item-detail-field">
          <label class="item-detail-label">Tgl</label>
          <input type="text" class="item-date-day form-input" placeholder="5 atau 5-10" value="${escapeHtml(dayVal)}" inputmode="numeric">
        </div>
        <div class="item-detail-field">
          <label class="item-detail-label">Qty</label>
          <input type="number" class="item-qty form-input" placeholder="1" value="${item.qty || 1}" min="1">
        </div>
        <div class="item-detail-field">
          <label class="item-detail-label">Harga</label>
          <input type="number" class="item-price form-input" placeholder="0" value="${item.price || ''}" min="0">
        </div>
        <button type="button" class="btn-remove-item tap" data-action="remove-item" title="Hapus">🗑️</button>
      </div>
      <div class="item-subtotal-row">
        <span class="item-subtotal-label">Subtotal:</span>
        <span class="item-subtotal-value">Rp <span class="subtotal-value">0</span></span>
      </div>
    </div>
  `;
}

/**
 * @param {object} row
 * @param {object[]} transactions
 * @param {string} month
 */
function renderSummaryCard(row, transactions, month) {
  if (!row?.id || !month) return '';
  const progress = calculateProgress(row, transactions || [], month);
  const priority = PRIORITY_LEVELS[row.priority?.toUpperCase()] || PRIORITY_LEVELS.PENTING;
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

  return `
    <div class="category-info-card budget-form-summary" data-priority="${row.priority}">
      <div class="cic-header">
        <div class="cic-priority" style="color:${priority.color}">${priority.icon} ${priority.label}</div>
      </div>
      <div class="cic-title">${escapeHtml(row.name)}</div>
      <div class="cic-stats-grid">
        <div class="cic-stat"><div class="cic-stat-label">Terpakai</div><div class="cic-stat-value">${progress.percentUsed}%</div></div>
        <div class="cic-stat"><div class="cic-stat-label">Realisasi</div><div class="cic-stat-value">Rp ${fmt(progress.spent)}</div></div>
        <div class="cic-stat"><div class="cic-stat-label">Budget</div><div class="cic-stat-value">Rp ${fmt(row.amount)}</div></div>
        <div class="cic-stat"><div class="cic-stat-label">Sisa</div><div class="cic-stat-value ${progress.remaining < 0 ? 'over' : ''}">Rp ${fmt(progress.remaining)}</div></div>
      </div>
      <div class="cic-progress-bar">
        <div class="cic-progress-fill ${progress.status}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
      </div>
      ${progress.daysLeft > 0 ? `<div class="cic-hint">💡 Rp ${fmt(progress.dailyBudget)}/hari · ${progress.daysLeft} hari tersisa</div>` : ''}
    </div>
  `;
}

/**
 * Sort items: active first, done/skipped last.
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
  const items = sortItemsForDisplay(row.items?.length ? row.items : [createBudgetItem()]);
  const summaryHtml = options.showSummary
    ? renderSummaryCard(row, options.transactions, options.month)
    : '';

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.innerHTML = `
    <div class="budget-modal budget-form-simplified" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>${isEdit ? 'Edit Budget' : 'Tambah Budget'}</h2>
          <p class="modal-subtitle">Rencanakan pengeluaran</p>
        </div>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">✕</button>
      </header>
      <div class="modal-body">
        ${summaryHtml}
        <div class="form-section">
          <label class="form-label">Prioritas *</label>
          <div class="priority-selector-compact">
            ${Object.values(PRIORITY_LEVELS).map((pl) => `
              <label class="priority-option-compact ${row.priority === pl.key ? 'selected' : ''}" style="--priority-color:${pl.color}">
                <input type="radio" name="priority" value="${pl.key}" ${row.priority === pl.key ? 'checked' : ''}>
                <span class="po-icon">${pl.icon}</span>
                <span class="po-label">${pl.label}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-section">
          <label class="form-label" for="budget-category">Nama Kategori *</label>
          <input type="text" id="budget-category" class="form-input"
            placeholder="Contoh: Belanja Pasar, Listrik..."
            value="${escapeHtml(row.name)}">
        </div>
        <div class="form-section">
          <div class="form-label-row">
            <label class="form-label">Detail Item</label>
            <button type="button" class="btn-add-item tap" data-action="add-item">+ Tambah Item</button>
          </div>
          <div class="items-list-simplified" id="items-list">
            ${items.map((item) => renderItemRowSimplified(item)).join('')}
          </div>
          <div class="items-total">Total: Rp <span id="items-total">0</span></div>
        </div>
        <details class="form-section keywords-section">
          <summary>🔗 Auto-Link Keywords (opsional)</summary>
          <div class="keywords-content">
            <div class="label-hint">Transaksi dengan kata kunci ini otomatis masuk budget ini</div>
            <div class="keyword-tags" id="keyword-tags">
              ${(row.auto_link_keywords || []).map((kw) => `
                <span class="keyword-tag" data-keyword="${escapeHtml(kw)}">
                  ${escapeHtml(kw)}
                  <button type="button" data-action="remove-keyword">×</button>
                </span>
              `).join('')}
            </div>
            <div class="keyword-input-row">
              <input type="text" id="keyword-input" class="form-input" placeholder="Ketik keyword lalu Enter">
              <button type="button" class="btn-add-keyword tap" data-action="add-keyword">+</button>
            </div>
          </div>
        </details>
      </div>
      <footer class="modal-footer modal-footer--split">
        ${isEdit ? '<button type="button" class="btn-danger-outline tap" data-action="delete-budget">🗑️ Hapus</button>' : '<span></span>'}
        <div class="modal-footer__actions">
          <button type="button" class="btn-secondary-budget tap" data-action="close">Batal</button>
          <button type="button" class="btn-primary-budget tap" data-action="save">💾 ${isEdit ? 'Simpan Perubahan' : 'Simpan Budget'}</button>
        </div>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  wireModalHandlers(modal, row, defaults, options);
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

  modal.querySelectorAll('input[name="priority"]').forEach((radio) => {
    radio.onchange = () => {
      modal.querySelectorAll('.priority-option-compact').forEach((o) => o.classList.remove('selected'));
      radio.closest('.priority-option-compact')?.classList.add('selected');
    };
  });

  modal.querySelector('[data-action="add-item"]')?.addEventListener('click', () => {
    const list = modal.querySelector('#items-list');
    const div = document.createElement('div');
    div.innerHTML = renderItemRowSimplified(createBudgetItem());
    const newRow = div.firstElementChild;
    list?.insertBefore(newRow, list.querySelector('.item-done') || null);
    wireItemRow(modal, newRow);
    updateItemsTotal(modal);
  });

  modal.querySelectorAll('.item-row-simplified').forEach((rowEl) => wireItemRow(modal, rowEl));

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
    tag.innerHTML = `${escapeHtml(val)} <button type="button" data-action="remove-keyword">×</button>`;
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
    showToast('✓ Budget dihapus');
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
      await saveToDraft(data, defaults.month);
      try {
        const { recordBudgetRowsChange } = await import('../services/budget-changes-tracker.js');
        recordBudgetRowsChange('Edit budget', before, state.budgetDraft.rows);
      } catch { /* ignore */ }
      showToast('✓ Budget tersimpan');
      close();
      options.onSaved?.();
      if (typeof window.renderBudgetPageView === 'function' && window.STATE?.ui?.budgetPageOpen) {
        window.renderBudgetPageView();
      }
      if (typeof window.rerender === 'function') window.rerender();
    } catch (e) {
      showToast('❌ Gagal simpan: ' + e.message);
    }
  });
}

/**
 * @param {HTMLElement} modal
 * @param {HTMLElement} rowEl
 */
function wireItemRow(modal, rowEl) {
  const checkbox = rowEl.querySelector('.item-checkbox');
  checkbox?.addEventListener('change', () => {
    const done = checkbox.checked;
    rowEl.classList.toggle('item-done', done);
    const visual = rowEl.querySelector('.item-check-visual');
    if (visual) visual.textContent = done ? '✓' : '';
    const list = modal.querySelector('#items-list');
    if (done && list) list.appendChild(rowEl);
    else if (!done && list) list.insertBefore(rowEl, list.querySelector('.item-done') || null);
  });

  rowEl.querySelector('[data-action="remove-item"]')?.addEventListener('click', () => {
    if (modal.querySelectorAll('.item-row-simplified').length <= 1) return;
    rowEl.remove();
    updateItemsTotal(modal);
  });

  rowEl.querySelectorAll('.item-qty, .item-price').forEach((input) => {
    input.addEventListener('input', () => {
      const qty = parseFloat(rowEl.querySelector('.item-qty')?.value) || 0;
      const price = parseFloat(rowEl.querySelector('.item-price')?.value) || 0;
      const sub = rowEl.querySelector('.subtotal-value');
      if (sub) sub.textContent = new Intl.NumberFormat('id-ID').format(qty * price);
      updateItemsTotal(modal);
    });
  });

  rowEl.querySelector('.item-qty')?.dispatchEvent(new Event('input'));
}

/**
 * @param {HTMLElement} modal
 */
function updateItemsTotal(modal) {
  let total = 0;
  modal.querySelectorAll('.item-row-simplified').forEach((rowEl) => {
    const qty = parseFloat(rowEl.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(rowEl.querySelector('.item-price')?.value) || 0;
    total += qty * price;
  });
  const el = modal.querySelector('#items-total');
  if (el) el.textContent = new Intl.NumberFormat('id-ID').format(total);
}

/**
 * @param {string|null} dayStr
 * @param {boolean} markedDone
 */
function inferItemStatus(dayStr, markedDone) {
  if (markedDone) return 'done';
  if (dayStr) {
    const today = new Date().getDate();
    const startDay = parseInt(String(dayStr).split('-')[0], 10);
    if (!Number.isNaN(startDay) && today >= startDay) return 'pending';
  }
  return 'planned';
}

/**
 * @param {HTMLElement} modal
 * @param {object} originalRow
 */
function collectFormData(modal, originalRow) {
  const items = [];
  modal.querySelectorAll('.item-row-simplified').forEach((rowEl) => {
    const markedDone = rowEl.querySelector('.item-checkbox')?.checked === true;
    const dayStr = rowEl.querySelector('.item-date-day')?.value?.trim() || null;
    items.push(createBudgetItem({
      id: rowEl.dataset.itemId,
      name: rowEl.querySelector('.item-name')?.value || '',
      qty: parseFloat(rowEl.querySelector('.item-qty')?.value) || 0,
      price: parseFloat(rowEl.querySelector('.item-price')?.value) || 0,
      target_date_day: dayStr,
      status: inferItemStatus(dayStr, markedDone),
    }));
  });

  const keywords = [];
  modal.querySelectorAll('.keyword-tag').forEach((tag) => {
    keywords.push(tag.dataset.keyword || tag.textContent.replace(/×$/, '').trim());
  });

  return createBudgetRow({
    id: originalRow.id,
    name: modal.querySelector('#budget-category')?.value.trim() || '',
    priority: modal.querySelector('input[name="priority"]:checked')?.value || 'penting',
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
    showToast('❌ Nama kategori wajib diisi');
    modal.querySelector('#budget-category')?.focus();
    return false;
  }
  if (!data.amount) {
    showToast('❌ Tambah minimal 1 item dengan nilai');
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
