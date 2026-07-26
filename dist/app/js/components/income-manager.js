/**
 * Income sources manager modal.
 * @module components/income-manager
 */

import {
  INCOME_TYPES,
  createIncomeSource,
  saveIncomeSource,
  deleteIncomeSource,
  getIncomeSources,
  getTotalIncome,
  getCurrentPeriod,
} from '../services/income-source.js';
import { Icon } from './icons.js';

/**
 * @param {() => void|null} [onSaved]
 * @param {string} [periodOverride] YYYY-MM
 */
export async function showIncomeManagerModal(onSaved = null, periodOverride = null) {
  const period = periodOverride || getCurrentPeriod();
  const sources = await getIncomeSources(period);
  const total = await getTotalIncome(period);

  const existing = document.querySelector('.income-modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay income-modal-overlay';
  modal.innerHTML = `
    <div class="budget-modal income-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <div>
          <h2>Kelola Income Bulan Ini</h2>
          <p class="modal-subtitle">${formatPeriod(period)}</p>
        </div>
        <button type="button" class="close-btn sheet-close-btn" data-action="close" aria-label="Tutup"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </header>
      <div class="modal-body">
        <div class="income-summary">
          <div class="income-summary-label">Total Income</div>
          <div class="income-summary-amount" id="income-total">Rp ${fmt(total)}</div>
          <div class="income-summary-count">${sources.length} sumber</div>
        </div>
        <div class="income-list" id="income-list">
          ${sources.length ? sources.map((s) => renderSourceRow(s)).join('') : renderEmptyState()}
        </div>
        <button type="button" class="btn-add-income tap" data-action="add-source">+ Tambah Sumber Income</button>
      </div>
      <footer class="modal-footer modal-footer--single">
        <button type="button" class="btn-primary-budget tap" data-action="close">Selesai</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  wireHandlers(modal, onSaved, period);
}

/**
 * @param {object} source
 */
function renderSourceRow(source) {
  const type = INCOME_TYPES.find((t) => t.key === source.type) || INCOME_TYPES[0];
  return `
    <div class="income-source-row" data-id="${source.id}">
      <div class="income-source-icon">${type.icon}</div>
      <div class="income-source-info">
        <div class="income-source-name">${escapeHtml(source.name || type.label)}</div>
        <div class="income-source-meta">
          <span class="income-type-badge">${type.label}</span>
          ${source.date_expected ? `<span class="income-date">📅 Tgl ${source.date_expected}</span>` : ''}
          ${source.is_recurring ? '<span class="income-recurring">🔄 Rutin</span>' : ''}
        </div>
      </div>
      <div class="income-source-amount">Rp ${fmt(source.amount)}</div>
      <div class="income-source-actions">
        <button type="button" class="btn-icon-sm tap" data-action="edit" data-id="${source.id}" title="Edit">✏️</button>
        <button type="button" class="btn-icon-sm danger tap" data-action="delete" data-id="${source.id}" title="Hapus">🗑️</button>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="income-empty">
      <div class="income-empty-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></div>
      <div class="income-empty-title">Belum ada sumber income</div>
      <div class="income-empty-desc">Tambah gaji, freelance, investasi, dll</div>
    </div>
  `;
}

/**
 * @param {HTMLElement} modal
 * @param {string} period
 */
async function refreshList(modal, period) {
  const sources = await getIncomeSources(period);
  const total = await getTotalIncome(period);
  const totalEl = modal.querySelector('#income-total');
  if (totalEl) totalEl.textContent = `Rp ${fmt(total)}`;
  const countEl = modal.querySelector('.income-summary-count');
  if (countEl) countEl.textContent = `${sources.length} sumber`;
  const list = modal.querySelector('#income-list');
  if (list) {
    list.innerHTML = sources.length ? sources.map((s) => renderSourceRow(s)).join('') : renderEmptyState();
  }
  wireItemHandlers(modal, period);
}

/**
 * @param {HTMLElement} modal
 * @param {() => void|null} onSaved
 * @param {string} period
 */
function wireHandlers(modal, onSaved, period) {
  const close = async () => {
    const total = await getTotalIncome(period);
    if (window.STATE?.budgetDraft) {
      window.STATE.budgetDraft.income = total;
    }
    if (window.STATE?.budgetsByMonth?.[period]) {
      window.STATE.budgetsByMonth[period].income = total;
    }
    modal.remove();
    onSaved?.();
  };
  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('[data-action="add-source"]')?.addEventListener('click', () => {
    showSourceFormModal(null, () => refreshList(modal, period), period);
  });
  wireItemHandlers(modal, period);
}

/**
 * @param {HTMLElement} modal
 * @param {string} period
 */
function wireItemHandlers(modal, period) {
  modal.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.onclick = async () => {
      const sources = await getIncomeSources(period);
      const source = sources.find((s) => s.id === btn.dataset.id);
      if (source) showSourceFormModal(source, () => refreshList(modal, period), period);
    };
  });
  modal.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('Hapus sumber income ini?')) return;
      await deleteIncomeSource(btn.dataset.id);
      if (typeof window !== 'undefined' && window.STATE?.incomeSourcesByMonth && period) {
        delete window.STATE.incomeSourcesByMonth[period];
      }
      await refreshList(modal, period);
    };
  });
}

/**
 * @param {object|null} source
 * @param {() => void|null} onSaved
 * @param {string} [period]
 */
function showSourceFormModal(source = null, onSaved = null, period = null) {
  const isEdit = !!source;
  const data = source || createIncomeSource({ period: period || getCurrentPeriod() });

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.style.zIndex = '10001';
  modal.innerHTML = `
    <div class="budget-modal source-form-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <h2>${isEdit ? '✏️ Edit Sumber Income' : '➕ Tambah Sumber Income'}</h2>
        <button type="button" class="close-btn sheet-close-btn" data-action="close" aria-label="Tutup"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
      </header>
      <div class="modal-body">
        <div class="form-section">
          <label class="form-label">Tipe Income</label>
          <div class="income-type-grid">
            ${INCOME_TYPES.map((t) => `
              <label class="income-type-option ${data.type === t.key ? 'selected' : ''}">
                <input type="radio" name="type" value="${t.key}" ${data.type === t.key ? 'checked' : ''}>
                <div class="income-type-card">
                  <div class="income-type-icon">${t.icon}</div>
                  <div class="income-type-label">${t.label}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-section">
          <label class="form-label" for="income-name">Nama Sumber</label>
          <input type="text" id="income-name" class="form-input"
            placeholder="Contoh: Gaji PT ABC, Freelance Design..."
            value="${escapeHtml(data.name || '')}">
        </div>
        <div class="form-section">
          <label class="form-label" for="income-amount">Nominal (Rp) *</label>
          <input type="number" id="income-amount" class="form-input" placeholder="0" min="0" value="${data.amount || ''}">
        </div>
        <div class="form-section">
          <label class="form-label" for="income-date">Tanggal Diterima (Opsional)</label>
          <input type="number" id="income-date" class="form-input"
            placeholder="Contoh: 25 (tanggal 25 tiap bulan)" min="1" max="31"
            value="${data.date_expected || ''}">
          <div class="label-hint">Isi jika income diterima di tanggal spesifik</div>
        </div>
        <div class="form-section">
          <label class="switch-label">
            <input type="checkbox" id="income-recurring" ${data.is_recurring ? 'checked' : ''}>
            <span>Income rutin bulanan</span>
          </label>
        </div>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn-secondary-budget tap" data-action="close">Batal</button>
        <button type="button" class="btn-primary-budget tap" data-action="save">${Icon('save', { size: 14 })} Simpan</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelectorAll('input[name="type"]').forEach((radio) => {
    radio.onchange = () => {
      modal.querySelectorAll('.income-type-option').forEach((o) => o.classList.remove('selected'));
      radio.closest('.income-type-option')?.classList.add('selected');
    };
  });

  modal.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    const amount = parseFloat(modal.querySelector('#income-amount')?.value) || 0;
    if (amount <= 0) {
      alert('Nominal harus diisi');
      return;
    }
    const updated = createIncomeSource({
      ...data,
      period: period || data.period || getCurrentPeriod(),
      type: modal.querySelector('input[name="type"]:checked')?.value || 'salary',
      name: modal.querySelector('#income-name')?.value.trim() || '',
      amount,
      date_expected: modal.querySelector('#income-date')?.value || null,
      is_recurring: modal.querySelector('#income-recurring')?.checked !== false,
    });
    await saveIncomeSource(updated);
    if (typeof window !== 'undefined' && window.STATE) {
      const p = updated.period || period || getCurrentPeriod();
      window.STATE.incomeSourcesByMonth = window.STATE.incomeSourcesByMonth || {};
      delete window.STATE.incomeSourcesByMonth[p];
    }
    close();
    onSaved?.();
  });
}

/**
 * @param {string} period
 */
function formatPeriod(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * @param {number} num
 */
function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

if (typeof window !== 'undefined') {
  window.monefyiIncomeManager = { showIncomeManagerModal };
}
