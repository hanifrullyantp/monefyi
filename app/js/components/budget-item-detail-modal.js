/**
 * Budget item detail modal — full info + schedule for notification reminders.
 * @module components/budget-item-detail-modal
 */

import {
  BUDGET_UNITS,
  getItemTotalAmount,
  hasActiveLineItems,
  PRIORITY_LEVELS,
  syncItemTargetDate,
} from '../services/budget-model.js';
import { Icon } from './icons.js';

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Direncanakan', icon: '📋' },
  { value: 'pending', label: 'Berjalan', icon: '⏳' },
  { value: 'done', label: 'Selesai', icon: '✅' },
  { value: 'skipped', label: 'Dilewati', icon: '⏭️' },
];

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
 * @param {number} num
 * @returns {string}
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {string} month YYYY-MM
 * @returns {{ min: string, max: string, lastDay: number }}
 */
function monthDateBounds(month) {
  const [y, m] = String(month || '').split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const mk = `${y}-${String(m).padStart(2, '0')}`;
  return {
    min: `${mk}-01`,
    max: `${mk}-${String(lastDay).padStart(2, '0')}`,
    lastDay,
  };
}

/**
 * @param {object} item
 * @param {string} month YYYY-MM
 * @returns {string}
 */
function resolveItemTargetDate(item, month) {
  const iso = item?.target_date ? String(item.target_date).slice(0, 10) : '';
  if (iso && iso.startsWith(month)) return iso;
  const dayStr = item?.target_date_day;
  if (!dayStr || !month) return '';
  const day = parseInt(String(dayStr).split('-')[0], 10);
  if (!Number.isFinite(day) || day < 1) return '';
  const { lastDay } = monthDateBounds(month);
  const d = Math.min(day, lastDay);
  return `${month}-${String(d).padStart(2, '0')}`;
}

/**
 * @param {string} month YYYY-MM
 * @returns {string}
 */
function formatMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/**
 * @param {string|null} isoDate
 * @param {string} month
 * @returns {string}
 */
function buildReminderHint(isoDate, month) {
  if (!isoDate) {
    return 'Atur tanggal target realisasi agar item masuk pengingat notifikasi (H-3, H-1, dan hari H).';
  }
  const day = parseInt(isoDate.slice(8, 10), 10);
  const today = new Date();
  const inMonth = today.getFullYear() === parseInt(month.slice(0, 4), 10)
    && today.getMonth() + 1 === parseInt(month.slice(5, 7), 10);
  let extra = '';
  if (inMonth) {
    const diff = day - today.getDate();
    if (diff > 3) extra = ` Pengingat pertama ~${diff - 3} hari lagi.`;
    else if (diff === 3) extra = ' Pengingat H-3 hari ini.';
    else if (diff === 1) extra = ' Pengingat H-1 hari ini.';
    else if (diff === 0) extra = ' Hari realisasi target — pengingat hari H.';
    else if (diff < 0) extra = ' Tanggal sudah lewat bulan ini.';
  }
  return `Notifikasi otomatis tanggal ${day} ${formatMonthLabel(month)}: H-3, H-1, dan hari H.${extra}`;
}

/**
 * @param {object} item
 * @returns {string}
 */
function renderLineBreakdown(item) {
  if (!hasActiveLineItems(item)) return '';
  const lines = (item.line_items || []).filter(
    (l) => String(l.name || '').trim() || Number(l.amount) > 0,
  );
  if (!lines.length) return '';
  return `
    <section class="bid-section">
      <h3 class="bid-section-title">Rincian pengeluaran</h3>
      <div class="bid-lines">
        ${lines.map((line) => {
          const unitLabel = BUDGET_UNITS.find((u) => u.value === line.unit)?.label || line.unit;
          return `
            <div class="bid-line-row">
              <span class="bid-line-name">${escapeHtml(line.name || '—')}</span>
              <span class="bid-line-meta">${Number(line.qty) || 1} ${escapeHtml(unitLabel)}</span>
              <span class="bid-line-amt">Rp ${formatIDR(line.amount)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

/**
 * @param {object} item
 * @param {object[]} transactions
 * @returns {string}
 */
function renderLinkedTransactions(item, transactions) {
  const ids = new Set(item.linked_transactions || []);
  const linked = (transactions || []).filter((tx) => ids.has(tx.id));
  if (!linked.length) {
    return `
      <section class="bid-section">
        <h3 class="bid-section-title">Transaksi terlink</h3>
        <p class="bid-muted">Belum ada transaksi yang terhubung ke item ini.</p>
      </section>
    `;
  }
  return `
    <section class="bid-section">
      <h3 class="bid-section-title">Transaksi terlink (${linked.length})</h3>
      <div class="bid-tx-list">
        ${linked.slice(0, 8).map((tx) => `
          <div class="bid-tx-row">
            <span class="bid-tx-date">${escapeHtml(String(tx.date || '').slice(0, 10))}</span>
            <span class="bid-tx-merchant">${escapeHtml(tx.merchant || tx.category || '—')}</span>
            <span class="bid-tx-amt">Rp ${formatIDR(Math.abs(Number(tx.amount || 0)))}</span>
          </div>
        `).join('')}
        ${linked.length > 8 ? `<p class="bid-muted">+${linked.length - 8} transaksi lainnya</p>` : ''}
      </div>
    </section>
  `;
}

/**
 * @param {object} options
 * @param {string} options.budgetId
 * @param {string} options.itemId
 * @param {string} options.month YYYY-MM
 * @param {object} options.budgetRow
 * @param {object} options.item
 * @param {object[]} [options.transactions]
 * @param {(patch: object) => Promise<void>|void} [options.onSave]
 */
export function showBudgetItemDetailModal(options) {
  const {
    budgetId,
    itemId,
    month,
    budgetRow,
    item,
    transactions = [],
    onSave,
  } = options;

  if (!item || !budgetRow) return;

  const existing = document.getElementById('budgetItemDetailBackdrop');
  if (existing) existing.remove();

  const amount = Math.round(getItemTotalAmount(item));
  const pl = PRIORITY_LEVELS[(budgetRow.priority || 'penting').toUpperCase()] || PRIORITY_LEVELS.PENTING;
  const bounds = monthDateBounds(month);
  const initialDate = resolveItemTargetDate(item, month);
  const lineMode = hasActiveLineItems(item);

  const backdrop = document.createElement('div');
  backdrop.id = 'budgetItemDetailBackdrop';
  backdrop.className = 'budget-detail-overlay';
  backdrop.innerHTML = `
    <div class="budget-detail-modal budget-item-detail-modal" role="dialog" aria-modal="true" aria-labelledby="bid-title">
      <header class="budget-detail-header">
        <div>
          <span class="budget-detail-priority" style="color:${pl.color}">
            ${Icon(pl.icon || 'target', { size: 14 })} ${escapeHtml(budgetRow.name)} · ${pl.label}
          </span>
          <h2 id="bid-title">${escapeHtml(item.name?.trim() || 'Item budget')}</h2>
          <p class="modal-subtitle">Detail item · double-click dari daftar</p>
        </div>
        <button type="button" class="close-btn sheet-close-btn" data-action="close" aria-label="Tutup">${Icon('x', { size: 16 })}</button>
      </header>

      <div class="budget-detail-body">
        <div class="bid-stats">
          <div class="bid-stat">
            <span class="bid-stat-label">Anggaran item</span>
            <span class="bid-stat-value">Rp ${formatIDR(amount)}</span>
          </div>
          <div class="bid-stat">
            <span class="bid-stat-label">Sumber nominal</span>
            <span class="bid-stat-value">${lineMode ? 'Dari rincian' : 'Manual'}</span>
          </div>
          <div class="bid-stat">
            <span class="bid-stat-label">Kategori</span>
            <span class="bid-stat-value">${escapeHtml(budgetRow.name)}</span>
          </div>
          <div class="bid-stat">
            <span class="bid-stat-label">Bulan</span>
            <span class="bid-stat-value">${escapeHtml(formatMonthLabel(month))}</span>
          </div>
        </div>

        ${renderLineBreakdown(item)}
        ${renderLinkedTransactions(item, transactions)}

        <section class="bid-section bid-form-section">
          <h3 class="bid-section-title">Jadwal &amp; status</h3>

          <label class="form-label" for="bid-status">Status item</label>
          <select id="bid-status" class="form-input bid-status-select">
            ${STATUS_OPTIONS.map((opt) => `
              <option value="${opt.value}" ${(item.status || 'planned') === opt.value ? 'selected' : ''}>
                ${opt.icon} ${opt.label}
              </option>
            `).join('')}
          </select>

          <label class="form-label" for="bid-target-date" style="margin-top:12px">
            Target realisasi
            <span class="label-hint">Kapan kira-kira pengeluaran ini direalisasikan?</span>
          </label>
          <input type="date" id="bid-target-date" class="form-input" min="${bounds.min}" max="${bounds.max}" value="${escapeHtml(initialDate)}">

          <div class="bid-reminder-hint" id="bid-reminder-hint" role="status">
            ${Icon('bell', { size: 14 })}
            <span>${escapeHtml(buildReminderHint(initialDate, month))}</span>
          </div>

          <label class="form-label" for="bid-notes" style="margin-top:12px">
            Catatan
            <span class="label-hint">Opsional — konteks atau detail tambahan</span>
          </label>
          <textarea id="bid-notes" class="form-input bid-notes" rows="3" placeholder="Contoh: bayar via transfer, tagihan listrik rumah">${escapeHtml(item.notes || '')}</textarea>
        </section>
      </div>

      <footer class="budget-detail-footer">
        <button type="button" class="btn-secondary-budget tap" data-action="close">Batal</button>
        <button type="button" class="btn-primary-budget tap" data-action="save">${Icon('save', { size: 14 })} Simpan</button>
      </footer>
    </div>
  `;

  document.body.appendChild(backdrop);

  const dateInput = backdrop.querySelector('#bid-target-date');
  const hintEl = backdrop.querySelector('#bid-reminder-hint span');
  dateInput?.addEventListener('change', () => {
    if (hintEl) hintEl.textContent = buildReminderHint(dateInput.value || '', month);
  });

  const close = () => backdrop.remove();

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-action="close"]')) close();
  });

  backdrop.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    const status = backdrop.querySelector('#bid-status')?.value || 'planned';
    const targetDate = backdrop.querySelector('#bid-target-date')?.value || '';
    const notes = backdrop.querySelector('#bid-notes')?.value || '';

    const patch = {
      status,
      notes: notes.trim(),
    };
    syncItemTargetDate(patch, targetDate || null);

    try {
      if (typeof onSave === 'function') {
        await onSave(patch);
      }
      close();
    } catch (err) {
      console.error('[budget-item-detail] save failed', err);
    }
  });

  backdrop.querySelector('.budget-item-detail-modal')?.addEventListener('click', (e) => e.stopPropagation());
}
