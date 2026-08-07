/**
 * Shared load/save + inline CRUD for Neraca category line items.
 * @module components/neraca-category-items
 */

import { Icon } from './icons.js';
import { LABELS } from '../constants/language.js';
import {
  deleteAsset,
  deleteDebt,
  deleteEquityEvent,
  deleteReceivable,
  loadNeracaEntities,
  upsertAsset,
  upsertDebt,
  upsertEquityEvent,
  upsertReceivable,
} from '../services/neraca-store.js';
import { computeCashBalancesUpto } from '../services/journal-engine.js';

export const READONLY_KEYS = new Set(['kas', 'laba_ditahan', 'suspense']);
export const ASSET_KEYS = new Set(['stok', 'properti', 'pra_bayar', 'investasi', 'aset_lainnya']);
export const DEBT_KEYS = new Set(['hutang_dagang', 'hutang_pajak', 'hutang_lainnya', 'kewajiban_lainnya']);

/**
 * @param {string} key
 */
export function isCategoryEditable(key) {
  return !READONLY_KEYS.has(key);
}

/**
 * @param {unknown} str
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

/**
 * @param {unknown} str
 */
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

/**
 * @param {number} num
 */
function formatIDR(num) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num || 0));
}

/**
 * @param {string} key
 * @param {object} sheet
 * @param {string} endISO
 */
export async function loadCategoryItems(key, sheet, endISO) {
  if (key === 'kas') {
    const accounts = window.STATE?.settings?.accounts || [];
    const txs = window.STATE?.transactions || [];
    return computeCashBalancesUpto(endISO, txs, accounts).map((a) => ({
      id: a.account,
      name: a.account,
      amount: a.balance,
      date: '',
      notes: '',
      readonly: true,
      kind: 'kas',
      raw: a,
    }));
  }

  if (key === 'laba_ditahan') {
    const pnl = sheet?.pnl || {};
    return [
      { id: 'inc', name: 'Total Pendapatan', amount: pnl.income || 0, readonly: true, kind: 'pnl' },
      { id: 'exp', name: 'Total Beban', amount: -(pnl.expense || 0), readonly: true, kind: 'pnl' },
      { id: 'net', name: LABELS.NERACA.RETAINED_EARNINGS, amount: pnl.net || 0, readonly: true, kind: 'pnl' },
    ];
  }

  if (key === 'suspense') {
    return [{
      id: 'sus',
      name: 'Selisih belum teridentifikasi',
      amount: sheet?.suspense?.amount || Math.abs(sheet?.diff || 0),
      notes: sheet?.suspense?.message || '',
      readonly: true,
      kind: 'suspense',
    }];
  }

  const entities = await loadNeracaEntities();

  if (key === 'piutang') {
    return (entities.receivables || []).map((r) => ({
      id: r.id,
      name: r.name,
      amount: r.amount,
      date: r.due_date || '',
      notes: r.notes || '',
      kind: 'receivable',
      raw: r,
    }));
  }

  if (ASSET_KEYS.has(key)) {
    return (entities.assets || [])
      .filter((a) => a.category === key)
      .map((a) => ({
        id: a.id,
        name: a.name,
        amount: a.amount,
        date: a.acquired_at || '',
        notes: a.notes || '',
        kind: 'asset',
        raw: a,
      }));
  }

  if (DEBT_KEYS.has(key)) {
    return (entities.debts || [])
      .filter((d) => d.category === key)
      .map((d) => ({
        id: d.id,
        name: d.name,
        amount: d.amount,
        date: d.due_date || '',
        notes: d.notes || '',
        kind: 'debt',
        raw: d,
      }));
  }

  if (key === 'modal' || key === 'simpanan') {
    return (entities.equity || [])
      .filter((e) => e.kind === key)
      .map((e) => ({
        id: e.id,
        name: e.name || key,
        amount: e.amount,
        date: e.event_date || '',
        notes: e.notes || '',
        kind: 'equity',
        raw: e,
      }));
  }

  return [];
}

/**
 * @param {string} key
 * @param {object|null} item
 * @param {{ name: string, amount: number, date?: string, notes?: string }} data
 */
export async function saveCategoryItem(key, item, data) {
  const name = data.name?.trim() || 'Item';
  const amount = Math.abs(Number(data.amount || 0));
  const date = data.date || null;
  const notes = data.notes || '';

  if (key === 'piutang') {
    return upsertReceivable({
      id: item?.id,
      name,
      amount,
      due_date: date,
      notes,
      status: item?.raw?.status || 'open',
    });
  }

  if (ASSET_KEYS.has(key)) {
    return upsertAsset({
      id: item?.id,
      category: key,
      name,
      amount,
      acquired_at: date,
      notes,
    });
  }

  if (DEBT_KEYS.has(key)) {
    return upsertDebt({
      id: item?.id,
      category: key,
      name,
      amount,
      due_date: date,
      notes,
    });
  }

  if (key === 'modal' || key === 'simpanan') {
    return upsertEquityEvent({
      id: item?.id,
      kind: key,
      name,
      amount,
      event_date: date || new Date().toISOString().slice(0, 10),
      notes,
    });
  }

  throw new Error('Kategori tidak dapat diedit');
}

/**
 * @param {object} item
 */
export async function deleteCategoryItem(item) {
  if (item.readonly) return;
  if (item.kind === 'receivable') await deleteReceivable(item.id);
  else if (item.kind === 'asset') await deleteAsset(item.id);
  else if (item.kind === 'debt') await deleteDebt(item.id);
  else if (item.kind === 'equity') await deleteEquityEvent(item.id);
}

/**
 * @param {object} item
 * @param {object} saved
 */
function mapSavedItem(item, saved, key) {
  if (key === 'piutang') {
    return {
      id: saved.id,
      name: saved.name,
      amount: saved.amount,
      date: saved.due_date || '',
      notes: saved.notes || '',
      kind: 'receivable',
      raw: saved,
    };
  }
  if (ASSET_KEYS.has(key)) {
    return {
      id: saved.id,
      name: saved.name,
      amount: saved.amount,
      date: saved.acquired_at || '',
      notes: saved.notes || '',
      kind: 'asset',
      raw: saved,
    };
  }
  if (DEBT_KEYS.has(key)) {
    return {
      id: saved.id,
      name: saved.name,
      amount: saved.amount,
      date: saved.due_date || '',
      notes: saved.notes || '',
      kind: 'debt',
      raw: saved,
    };
  }
  if (key === 'modal' || key === 'simpanan') {
    return {
      id: saved.id,
      name: saved.name,
      amount: saved.amount,
      date: saved.event_date || '',
      notes: saved.notes || '',
      kind: 'equity',
      raw: saved,
    };
  }
  return { ...item, ...saved };
}

/**
 * @param {string} key
 */
function dateLabel(key) {
  if (key === 'piutang' || DEBT_KEYS.has(key)) return 'Jatuh tempo';
  if (key === 'modal' || key === 'simpanan') return 'Tanggal';
  if (ASSET_KEYS.has(key)) return 'Perolehan';
  return 'Tanggal';
}

/**
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {string} opts.key
 * @param {object} opts.sheet
 * @param {string} opts.endISO
 * @param {() => void} [opts.onChanged]
 */
export async function mountInlineCategoryItems(host, opts) {
  const { key, sheet, endISO, onChanged } = opts;
  if (!host) return;

  const editable = isCategoryEditable(key);
  host.innerHTML = `<div class="neraca-inline-loading">Memuat…</div>`;

  /** @type {object[]} */
  let items = [];
  try {
    items = await loadCategoryItems(key, sheet, endISO);
  } catch (err) {
    console.error('[neraca-inline] load failed', err);
    host.innerHTML = `<div class="neraca-inline-empty">Gagal memuat item.</div>`;
    return;
  }

  const render = () => {
    const rows = items.map((item) => {
      if (item.readonly) {
        return `
          <div class="neraca-inline-row is-readonly" data-id="${escapeAttr(item.id)}">
            <span class="neraca-inline-name">${escapeHtml(item.name)}</span>
            <span class="neraca-inline-amt">Rp ${formatIDR(item.amount)}</span>
            ${item.notes ? `<span class="neraca-inline-meta">${escapeHtml(item.notes)}</span>` : ''}
          </div>
        `;
      }
      return `
        <div class="neraca-inline-row" data-id="${escapeAttr(item.id)}" data-kind="${escapeAttr(item.kind)}">
          <input type="text" class="neraca-inline-input neraca-inline-input--name" data-f="name"
            value="${escapeAttr(item.name)}" placeholder="Nama" aria-label="Nama">
          <input type="number" class="neraca-inline-input neraca-inline-input--amt" data-f="amount"
            value="${Number(item.amount || 0)}" min="0" step="1000" placeholder="0" aria-label="Nominal">
          <input type="date" class="neraca-inline-input neraca-inline-input--date" data-f="date"
            value="${escapeAttr(item.date || '')}" aria-label="${escapeAttr(dateLabel(key))}">
          <div class="neraca-inline-actions">
            <button type="button" class="neraca-inline-btn" data-action="inline-save" title="Simpan">${Icon('check', { size: 14 })}</button>
            <button type="button" class="neraca-inline-btn is-danger" data-action="inline-del" title="Hapus">${Icon('trash', { size: 14 })}</button>
          </div>
        </div>
      `;
    }).join('');

    host.innerHTML = `
      <div class="neraca-inline-list">
        ${editable ? `
          <div class="neraca-inline-head">
            <span>Nama</span>
            <span>Nominal</span>
            <span>${escapeHtml(dateLabel(key))}</span>
            <span></span>
          </div>
        ` : ''}
        ${rows || `<div class="neraca-inline-empty">${editable ? 'Belum ada item.' : 'Tidak ada detail.'}</div>`}
        ${editable ? `
          <div class="neraca-inline-row is-new" data-id="__new__">
            <input type="text" class="neraca-inline-input neraca-inline-input--name" data-f="name"
              placeholder="Nama baru" aria-label="Nama baru">
            <input type="number" class="neraca-inline-input neraca-inline-input--amt" data-f="amount"
              value="" min="0" step="1000" placeholder="0" aria-label="Nominal baru">
            <input type="date" class="neraca-inline-input neraca-inline-input--date" data-f="date"
              aria-label="${escapeAttr(dateLabel(key))}">
            <div class="neraca-inline-actions">
              <button type="button" class="neraca-inline-btn is-primary" data-action="inline-add" title="Tambah">${Icon('plus', { size: 14 })}</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  };

  const readRow = (rowEl) => ({
    name: rowEl.querySelector('[data-f="name"]')?.value?.trim() || '',
    amount: Number(rowEl.querySelector('[data-f="amount"]')?.value || 0),
    date: rowEl.querySelector('[data-f="date"]')?.value || '',
    notes: '',
  });

  const flashRow = (rowEl) => {
    rowEl?.classList.add('is-saved');
    setTimeout(() => rowEl?.classList.remove('is-saved'), 600);
  };

  render();

  host.onclick = async (e) => {
    const saveBtn = e.target.closest('[data-action="inline-save"]');
    const delBtn = e.target.closest('[data-action="inline-del"]');
    const addBtn = e.target.closest('[data-action="inline-add"]');
    if (!saveBtn && !delBtn && !addBtn) return;

    e.stopPropagation();

    const rowEl = e.target.closest('.neraca-inline-row');
    if (!rowEl) return;

    if (delBtn) {
      const id = rowEl.dataset.id;
      const item = items.find((i) => i.id === id);
      if (!item || !confirm('Hapus item ini?')) return;
      try {
        await deleteCategoryItem(item);
        items = items.filter((i) => i.id !== id);
        render();
        onChanged?.();
      } catch (err) {
        console.error('[neraca-inline] delete failed', err);
      }
      return;
    }

    const data = readRow(rowEl);
    if (!data.name) {
      rowEl.querySelector('[data-f="name"]')?.focus();
      return;
    }

    try {
      if (addBtn) {
        const saved = await saveCategoryItem(key, null, data);
        items.push(mapSavedItem(null, saved, key));
        render();
        onChanged?.();
        return;
      }

      const id = rowEl.dataset.id;
      const item = items.find((i) => i.id === id);
      const saved = await saveCategoryItem(key, item, data);
      items = items.map((i) => (i.id === id ? mapSavedItem(i, saved, key) : i));
      render();
      flashRow(host.querySelector(`[data-id="${String(id).replace(/"/g, '\\"')}"]`));
      onChanged?.();
    } catch (err) {
      console.error('[neraca-inline] save failed', err);
    }
  };

  host.onkeydown = async (e) => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    const rowEl = e.target.closest('.neraca-inline-row');
    if (!rowEl || rowEl.classList.contains('is-readonly')) return;
    e.preventDefault();
    const isNew = rowEl.dataset.id === '__new__';
    rowEl.querySelector(isNew ? '[data-action="inline-add"]' : '[data-action="inline-save"]')?.click();
  };
}
