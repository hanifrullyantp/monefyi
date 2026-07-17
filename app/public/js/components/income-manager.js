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

/**
 * @param {() => void|null} [onSaved]
 */
export async function showIncomeManagerModal(onSaved = null) {
  const period = getCurrentPeriod();
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
          <h2>💰 Kelola Income Bulan Ini</h2>
          <p class="modal-subtitle">${formatPeriod(period)}</p>
        </div>
        <button type="button" class="close-btn" data-action="close" aria-label="Tutup">✕</button>
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
      <footer class="modal-footer">
        <button type="button" class="btn-primary-budget tap" data-action="close">Selesai</button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  wireHandlers(modal, onSaved);
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
      <div class="income-empty-icon">💰</div>
      <div class="income-empty-title">Belum ada sumber income</div>
      <div class="income-empty-desc">Tambah gaji, freelance, investasi, dll</div>
    </div>
  `;
}

/**
 * @param {HTMLElement} modal
 */
async function refreshList(modal) {
  const sources = await getIncomeSources();
  const total = await getTotalIncome();
  const totalEl = modal.querySelector('#income-total');
  if (totalEl) totalEl.textContent = `Rp ${fmt(total)}`;
  const countEl = modal.querySelector('.income-summary-count');
  if (countEl) countEl.textContent = `${sources.length} sumber`;
  const list = modal.querySelector('#income-list');
  if (list) {
    list.innerHTML = sources.length ? sources.map((s) => renderSourceRow(s)).join('') : renderEmptyState();
  }
  wireItemHandlers(modal);
}

/**
 * @param {HTMLElement} modal
 * @param {() => void|null} onSaved
 */
function wireHandlers(modal, onSaved) {
  const close = () => {
    modal.remove();
    onSaved?.();
  };
  modal.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('[data-action="add-source"]')?.addEventListener('click', () => {
    showSourceFormModal(null, () => refreshList(modal));
  });
  wireItemHandlers(modal);
}

/**
 * @param {HTMLElement} modal
 */
function wireItemHandlers(modal) {
  modal.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.onclick = async () => {
      const sources = await getIncomeSources();
      const source = sources.find((s) => s.id === btn.dataset.id);
      if (source) showSourceFormModal(source, () => refreshList(modal));
    };
  });
  modal.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('Hapus sumber income ini?')) return;
      await deleteIncomeSource(btn.dataset.id);
      await refreshList(modal);
    };
  });
}

/**
 * @param {object|null} source
 * @param {() => void|null} onSaved
 */
function showSourceFormModal(source = null, onSaved = null) {
  const isEdit = !!source;
  const data = source || createIncomeSource();

  const modal = document.createElement('div');
  modal.className = 'budget-modal-overlay';
  modal.style.zIndex = '10001';
  modal.innerHTML = `
    <div class="budget-modal source-form-modal" role="dialog" aria-modal="true">
      <header class="modal-header">
        <h2>${isEdit ? '✏️ Edit Sumber Income' : '➕ Tambah Sumber Income'}</h2>
        <button type="button" class="close-btn" data-action="close">✕</button>
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
        <button type="button" class="btn-primary-budget tap" data-action="save">💾 Simpan</button>
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
      type: modal.querySelector('input[name="type"]:checked')?.value || 'salary',
      name: modal.querySelector('#income-name')?.value.trim() || '',
      amount,
      date_expected: modal.querySelector('#income-date')?.value || null,
      is_recurring: modal.querySelector('#income-recurring')?.checked !== false,
    });
    await saveIncomeSource(updated);
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
