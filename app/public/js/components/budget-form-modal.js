/**
 * Enhanced budget form modal — priority, items, keywords, advanced options.
 * @module components/budget-form-modal
 */

import {
  PRIORITY_LEVELS,
  TARGET_TYPES,
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
 * @param {number} idx
 * @returns {string}
 */
function renderItemRow(item, idx) {
  return `
    <div class="item-row" data-item-id="${item.id}">
      <div class="item-fields">
        <input type="text" class="item-name form-input" placeholder="Nama item" value="${escapeHtml(item.name)}">
        <input type="number" class="item-qty form-input" placeholder="Qty" value="${item.qty || 1}" min="1">
        <input type="number" class="item-price form-input" placeholder="Harga" value="${item.price || ''}" min="0">
      </div>
      <div class="item-meta">
        <input type="date" class="item-date form-input" value="${item.target_date || ''}" title="Target tanggal">
        <select class="item-status form-input">
          <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>📋 Direncanakan</option>
          <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>⏳ Berjalan</option>
          <option value="done" ${item.status === 'done' ? 'selected' : ''}>✅ Selesai</option>
          <option value="skipped" ${item.status === 'skipped' ? 'selected' : ''}>⏭️ Dilewati</option>
        </select>
      </div>
      <div class="item-subtotal">Rp <span class="subtotal-value">0</span></div>
      <button type="button" class="btn-remove-item" data-action="remove-item" aria-label="Hapus">🗑️</button>
    </div>
  `;
}

function renderSummaryCard(row, transactions, month) {
  if (!row?.id || !month) return '';
  const progress = calculateProgress(row, transactions || [], month);
  const priority = PRIORITY_LEVELS[row.priority?.toUpperCase()] || PRIORITY_LEVELS.PENTING;
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

  return `
    <div class="budget-form-summary">
      <div class="budget-form-summary__head">
        <span style="color:${priority.color}">${priority.icon} ${priority.label}</span>
        <strong>${escapeHtml(row.name)}</strong>
      </div>
      <div class="budget-form-summary__stats">
        <div><span>Terpakai</span><strong>${progress.percentUsed}%</strong></div>
        <div><span>Realisasi</span><strong>Rp ${fmt(progress.spent)}</strong></div>
        <div><span>Budget</span><strong>Rp ${fmt(row.amount)}</strong></div>
        <div><span>Sisa</span><strong class="${progress.remaining < 0 ? 'over' : ''}">Rp ${fmt(progress.remaining)}</strong></div>
      </div>
      <div class="budget-form-summary__bar">
        <div class="budget-form-summary__fill ${progress.status}" style="width:${Math.min(progress.percentUsed, 100)}%"></div>
      </div>
      ${progress.daysLeft > 0 ? `<div class="budget-form-summary__hint">💡 Rp ${fmt(progress.dailyBudget)}/hari · ${progress.daysLeft} hari tersisa</div>` : ''}
    </div>
  `;
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
  const summaryHtml = options.showSummary
    ? renderSummaryCard(row, options.transactions, options.month)
    : '';

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.innerHTML = `
    <div class="budget-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>${isEdit ? 'Edit Budget' : 'Tambah Budget'}</h2>
          <p class="modal-subtitle">Rencanakan pengeluaran dengan detail</p>
        </div>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">✕</button>
      </header>
      <div class="modal-body">
        ${summaryHtml}
        <div class="form-section">
          <label class="form-label">Prioritas *</label>
          <div class="priority-selector">
            ${Object.values(PRIORITY_LEVELS).map((pl) => `
              <label class="priority-option ${row.priority === pl.key ? 'selected' : ''}">
                <input type="radio" name="priority" value="${pl.key}" ${row.priority === pl.key ? 'checked' : ''}>
                <div class="priority-card" style="border-color:${pl.color}">
                  <div class="priority-card-icon">${pl.icon}</div>
                  <div class="priority-card-label">${pl.label}</div>
                  <div class="priority-card-desc">${pl.description}</div>
                </div>
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
          <label class="form-label">Tipe Target</label>
          <div class="target-type-selector">
            ${Object.values(TARGET_TYPES).map((tt) => `
              <label class="target-option ${row.target_type === tt.key ? 'selected' : ''}">
                <input type="radio" name="target_type" value="${tt.key}" ${row.target_type === tt.key ? 'checked' : ''}>
                <div class="target-card">
                  <div class="target-label">${tt.label}</div>
                  <div class="target-desc">${tt.description}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-section date-range-section" id="date-range-section" style="display:none">
          <label class="form-label">Rentang Tanggal Target</label>
          <div class="date-range-inputs">
            <input type="date" id="target-start" class="form-input" value="${row.target_start || ''}">
            <span>—</span>
            <input type="date" id="target-end" class="form-input" value="${row.target_end || ''}">
          </div>
        </div>
        <div class="form-section">
          <div class="form-label-row">
            <label class="form-label">Detail Item</label>
            <button type="button" class="btn-add-item" data-action="add-item">+ Tambah Item</button>
          </div>
          <div class="items-list" id="items-list">
            ${(row.items?.length ? row.items : [createBudgetItem()])
              .map((item, idx) => renderItemRow(item, idx)).join('')}
          </div>
          <div class="items-total">Total: Rp <span id="items-total">0</span></div>
        </div>
        <div class="form-section">
          <label class="form-label">
            🔗 Auto-Link Keywords
            <span class="label-hint">Transaksi dengan kata kunci ini otomatis masuk budget ini</span>
          </label>
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
            <button type="button" class="btn-add-keyword" data-action="add-keyword">+</button>
          </div>
        </div>
        <details class="form-section advanced-options">
          <summary>⚙️ Pengaturan Lanjutan</summary>
          <div class="option-row">
            <label class="switch-label">
              <input type="checkbox" id="allow-overspend" ${row.allow_overspend !== false ? 'checked' : ''}>
              <span>Izinkan melebihi budget</span>
            </label>
          </div>
          <div class="option-row">
            <label class="switch-label">
              <input type="checkbox" id="rollover-enabled" ${row.rollover_enabled ? 'checked' : ''}>
              <span>Sisa masuk bulan depan</span>
            </label>
          </div>
          <div class="option-row">
            <label class="form-label">Notifikasi saat mencapai:</label>
            <div class="threshold-chips">
              ${[50, 75, 90, 100].map((t) => `
                <label class="chip">
                  <input type="checkbox" value="${t}" name="threshold"
                    ${(row.notification_thresholds || [75, 100]).includes(t) ? 'checked' : ''}>
                  <span>${t}%</span>
                </label>
              `).join('')}
            </div>
          </div>
        </details>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary-budget" data-action="close">Batal</button>
        <button type="button" class="btn-primary-budget" data-action="save">💾 ${isEdit ? 'Simpan Perubahan' : 'Simpan Budget'}</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  wireModalHandlers(modal, row, defaults, options);
  updateItemsTotal(modal);
  updateDateRangeVisibility(modal);
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
      modal.querySelectorAll('.priority-option').forEach((o) => o.classList.remove('selected'));
      radio.closest('.priority-option')?.classList.add('selected');
    };
  });

  modal.querySelectorAll('input[name="target_type"]').forEach((radio) => {
    radio.onchange = () => {
      modal.querySelectorAll('.target-option').forEach((o) => o.classList.remove('selected'));
      radio.closest('.target-option')?.classList.add('selected');
      updateDateRangeVisibility(modal);
    };
  });

  modal.querySelector('[data-action="add-item"]')?.addEventListener('click', () => {
    const list = modal.querySelector('#items-list');
    const div = document.createElement('div');
    div.innerHTML = renderItemRow(createBudgetItem(), list.children.length);
    list.appendChild(div.firstElementChild);
    wireItemHandlers(modal, list.lastElementChild);
    updateItemsTotal(modal);
  });

  modal.querySelectorAll('.item-row').forEach((rowEl) => wireItemHandlers(modal, rowEl));

  const keywordInput = modal.querySelector('#keyword-input');
  const addKeyword = () => {
    const val = keywordInput?.value.trim();
    if (!val) return;
    const tags = modal.querySelector('#keyword-tags');
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

  modal.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    const data = collectFormData(modal, originalRow);
    if (!validateForm(data, modal)) return;

    try {
      await saveToDraft(data, defaults.month);
      showToast('✓ Budget tersimpan');
      close();
      options.onSaved?.();
      if (typeof window.renderBudgetSheet === 'function') window.renderBudgetSheet();
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
function wireItemHandlers(modal, rowEl) {
  rowEl.querySelector('[data-action="remove-item"]')?.addEventListener('click', () => {
    if (modal.querySelectorAll('.item-row').length <= 1) return;
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
  modal.querySelectorAll('.item-row').forEach((rowEl) => {
    const qty = parseFloat(rowEl.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(rowEl.querySelector('.item-price')?.value) || 0;
    total += qty * price;
  });
  const el = modal.querySelector('#items-total');
  if (el) el.textContent = new Intl.NumberFormat('id-ID').format(total);
}

/**
 * @param {HTMLElement} modal
 */
function updateDateRangeVisibility(modal) {
  const type = modal.querySelector('input[name="target_type"]:checked')?.value;
  const section = modal.querySelector('#date-range-section');
  if (section) {
    section.style.display = ['one-time', 'flexible'].includes(type || '') ? 'block' : 'none';
  }
}

/**
 * @param {HTMLElement} modal
 * @param {object} originalRow
 * @returns {object}
 */
function collectFormData(modal, originalRow) {
  const items = [];
  modal.querySelectorAll('.item-row').forEach((rowEl) => {
    items.push(createBudgetItem({
      id: rowEl.dataset.itemId,
      name: rowEl.querySelector('.item-name')?.value || '',
      qty: parseFloat(rowEl.querySelector('.item-qty')?.value) || 0,
      price: parseFloat(rowEl.querySelector('.item-price')?.value) || 0,
      target_date: rowEl.querySelector('.item-date')?.value || null,
      status: rowEl.querySelector('.item-status')?.value || 'planned',
    }));
  });

  const keywords = [];
  modal.querySelectorAll('.keyword-tag').forEach((tag) => {
    keywords.push(tag.dataset.keyword || tag.textContent.replace(/×$/, '').trim());
  });

  const thresholds = [];
  modal.querySelectorAll('input[name="threshold"]:checked').forEach((cb) => {
    thresholds.push(parseInt(cb.value, 10));
  });

  return createBudgetRow({
    id: originalRow.id,
    name: modal.querySelector('#budget-category')?.value.trim() || '',
    priority: modal.querySelector('input[name="priority"]:checked')?.value || 'penting',
    target_type: modal.querySelector('input[name="target_type"]:checked')?.value || 'monthly',
    target_start: modal.querySelector('#target-start')?.value || null,
    target_end: modal.querySelector('#target-end')?.value || null,
    items,
    auto_link_keywords: keywords,
    allow_overspend: modal.querySelector('#allow-overspend')?.checked !== false,
    rollover_enabled: modal.querySelector('#rollover-enabled')?.checked === true,
    notification_thresholds: thresholds,
    amount: items.reduce((sum, i) => sum + i.qty * i.price, 0),
    created_at: originalRow.created_at,
  });
}

/**
 * @param {object} data
 * @param {HTMLElement} modal
 * @returns {boolean}
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
  if (idx >= 0) {
    state.budgetDraft.rows[idx] = row;
  } else {
    state.budgetDraft.rows.push(row);
  }

  row.amount = row.items.reduce((s, i) => s + i.qty * i.price, 0) || row.amount;
}

/**
 * @returns {string}
 */
function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {string} msg
 */
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
