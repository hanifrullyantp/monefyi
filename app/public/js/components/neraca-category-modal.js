/**
 * Category detail modal for Neraca rows.
 * @module components/neraca-category-modal
 */

import { Icon } from './icons.js';
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

const ASSET_KEYS = new Set(['stok', 'properti', 'pra_bayar', 'investasi', 'aset_lainnya']);
const DEBT_KEYS = new Set(['hutang_dagang', 'hutang_pajak', 'hutang_lainnya', 'kewajiban_lainnya']);

/**
 * @param {object} opts
 */
export async function showNeracaCategoryModal(opts) {
  const { key, sheet, endISO, onChanged } = opts;
  const existing = document.getElementById('neracaCategoryBackdrop');
  if (existing) existing.remove();

  const row = [...(sheet?.aktiva || []), ...(sheet?.pasiva || [])].find((r) => r.key === key);
  const title = row?.label || key;

  let items = [];
  let card3 = '—';
  let editable = true;

  if (key === 'kas') {
    const accounts = window.STATE?.settings?.accounts || [];
    const txs = window.STATE?.transactions || [];
    items = computeCashBalancesUpto(endISO || new Date().toISOString().slice(0, 10), txs, accounts)
      .map((a) => ({
        id: a.account,
        name: a.account,
        amount: a.balance,
        meta: 'Akun Monefyi',
        readonly: true,
      }));
    card3 = `${items.filter((i) => i.amount !== 0).length} akun aktif`;
    editable = false;
  } else if (key === 'laba_ditahan') {
    const pnl = sheet?.pnl || {};
    items = [
      { id: 'inc', name: 'Total Pendapatan', amount: pnl.income || 0, meta: 'Sampai cutoff', readonly: true },
      { id: 'exp', name: 'Total Beban', amount: -(pnl.expense || 0), meta: 'Sampai cutoff', readonly: true },
      { id: 'net', name: 'Laba Ditahan (neto)', amount: pnl.net || 0, meta: 'Pendapatan − Beban', readonly: true },
    ];
    card3 = (pnl.net || 0) >= 0 ? 'Surplus' : 'Defisit';
    editable = false;
  } else if (key === 'suspense') {
    items = [{
      id: 'sus',
      name: 'Selisih belum teridentifikasi',
      amount: sheet?.suspense?.amount || Math.abs(sheet?.diff || 0),
      meta: sheet?.suspense?.message || '',
      readonly: true,
    }];
    card3 = 'Perlu koreksi';
    editable = false;
  } else {
    const entities = await loadNeracaEntities();
    if (key === 'piutang') {
      items = (entities.receivables || []).map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        meta: r.due_date ? `Jatuh tempo ${r.due_date}` : (r.status || 'open'),
        kind: 'receivable',
        raw: r,
      }));
      const nextDue = items.map((i) => i.raw?.due_date).filter(Boolean).sort()[0];
      card3 = nextDue ? `JT terdekat ${nextDue}` : `${items.length} piutang`;
    } else if (ASSET_KEYS.has(key)) {
      items = (entities.assets || [])
        .filter((a) => a.category === key)
        .map((a) => ({
          id: a.id,
          name: a.name,
          amount: a.amount,
          meta: a.acquired_at || a.notes || key,
          kind: 'asset',
          raw: a,
        }));
      const top = items.slice().sort((a, b) => b.amount - a.amount)[0];
      card3 = top ? `Terbesar: ${top.name}` : 'Belum ada item';
    } else if (DEBT_KEYS.has(key)) {
      items = (entities.debts || [])
        .filter((d) => d.category === key)
        .map((d) => ({
          id: d.id,
          name: d.name,
          amount: d.amount,
          meta: d.due_date ? `Jatuh tempo ${d.due_date}` : (d.notes || key),
          kind: 'debt',
          raw: d,
        }));
      const nextDue = items.map((i) => i.raw?.due_date).filter(Boolean).sort()[0];
      card3 = nextDue ? `JT terdekat ${nextDue}` : `${items.length} hutang`;
    } else if (key === 'modal' || key === 'simpanan') {
      items = (entities.equity || [])
        .filter((e) => e.kind === key)
        .map((e) => ({
          id: e.id,
          name: e.name || key,
          amount: e.amount,
          meta: e.event_date || '',
          kind: 'equity',
          raw: e,
        }));
      card3 = key === 'modal' ? 'Riwayat modal' : 'Alokasi simpanan';
    }
  }

  let draft = JSON.parse(JSON.stringify(items));
  /** @type {object[][]} */
  const undoStack = [];
  /** @type {object[][]} */
  const redoStack = [];
  let sortDir = 'desc';
  let query = '';

  const backdrop = document.createElement('div');
  backdrop.id = 'neracaCategoryBackdrop';
  backdrop.className = 'neraca-overlay';

  const renderList = () => {
    let list = draft.filter((i) => {
      if (!query) return true;
      return String(i.name || '').toLowerCase().includes(query.toLowerCase());
    });
    list = list.slice().sort((a, b) => sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount);
    const total = draft.reduce((s, i) => s + Number(i.amount || 0), 0);

    backdrop.querySelector('[data-role="card-count"]').textContent = `${draft.length} item`;
    backdrop.querySelector('[data-role="card-total"]').textContent = `Rp ${formatIDR(total)}`;
    backdrop.querySelector('[data-role="list"]').innerHTML = list.length
      ? list.map((item) => `
          <div class="neraca-item" data-id="${escapeHtml(item.id)}">
            <div>
              <div class="neraca-item-name">${escapeHtml(item.name)}</div>
              <div class="neraca-item-meta">${escapeHtml(item.meta || '')}</div>
            </div>
            <div class="neraca-item-amt ${item.amount < 0 ? 'is-neg' : ''}">Rp ${formatIDR(item.amount)}</div>
            ${!item.readonly && editable ? `
              <div class="neraca-item-actions">
                <button type="button" class="neraca-btn" data-action="edit-item" data-id="${escapeHtml(item.id)}">Edit</button>
                <button type="button" class="neraca-btn neraca-btn-danger" data-action="del-item" data-id="${escapeHtml(item.id)}">Hapus</button>
              </div>
            ` : ''}
          </div>
        `).join('')
      : `<p class="bid-muted" style="color:var(--app-muted);font-size:12px">Belum ada item.</p>`;
  };

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
            <span class="neraca-sum-card-value" data-role="card-count">${draft.length} item</span>
          </div>
          <div class="neraca-sum-card">
            <span class="neraca-sum-card-label">Total</span>
            <span class="neraca-sum-card-value" data-role="card-total">Rp ${formatIDR(draft.reduce((s, i) => s + Number(i.amount || 0), 0))}</span>
          </div>
          <div class="neraca-sum-card">
            <span class="neraca-sum-card-label">Info</span>
            <span class="neraca-sum-card-value">${escapeHtml(card3)}</span>
          </div>
        </div>

        <div class="neraca-toolbar">
          <button type="button" class="neraca-tool" data-action="undo" title="Undo" ${!editable ? 'disabled' : ''}>${Icon('undo', { size: 14 })}</button>
          <button type="button" class="neraca-tool" data-action="redo" title="Redo" ${!editable ? 'disabled' : ''}>${Icon('redo', { size: 14 })}</button>
          <button type="button" class="neraca-tool" data-action="add" title="Tambah" ${!editable ? 'disabled' : ''}>${Icon('plus', { size: 14 })}</button>
          <button type="button" class="neraca-tool" data-action="sort" title="Sort">${Icon('sort', { size: 14 })}</button>
          <button type="button" class="neraca-tool" data-action="refresh" title="Refresh">${Icon('refresh', { size: 14 })}</button>
          <input type="search" class="neraca-search" data-role="search" placeholder="Cari…" aria-label="Cari">
        </div>

        <div class="neraca-item-list" data-role="list"></div>
        <div data-role="form-host"></div>
      </div>
      <footer class="neraca-modal-foot">
        ${editable ? `<button type="button" class="neraca-btn neraca-btn-primary" data-action="add">${Icon('plus', { size: 12 })} Tambah Baru</button>` : ''}
        <button type="button" class="neraca-btn" data-action="close">Tutup</button>
      </footer>
    </div>
  `;

  document.body.appendChild(backdrop);
  renderList();

  const pushUndo = () => {
    undoStack.push(JSON.parse(JSON.stringify(draft)));
    redoStack.length = 0;
  };

  const close = () => backdrop.remove();

  const showForm = (item = null) => {
    const host = backdrop.querySelector('[data-role="form-host"]');
    if (!host || !editable) return;
    host.innerHTML = `
      <div class="neraca-form-grid" style="margin-top:8px;padding:12px;border:1px solid var(--app-border);border-radius:12px">
        <input type="text" class="form-input" data-f="name" placeholder="Nama" value="${escapeHtml(item?.name || '')}">
        <input type="number" class="form-input" data-f="amount" placeholder="Nominal" value="${item ? Number(item.amount) : ''}">
        <input type="date" class="form-input" data-f="date" value="${escapeHtml(item?.raw?.due_date || item?.raw?.event_date || item?.raw?.acquired_at || '')}">
        <input type="text" class="form-input" data-f="notes" placeholder="Catatan" value="${escapeHtml(item?.raw?.notes || '')}">
        <div style="display:flex;gap:8px">
          <button type="button" class="neraca-btn neraca-btn-primary" data-action="save-form">${item ? 'Update' : 'Simpan'}</button>
          <button type="button" class="neraca-btn" data-action="cancel-form">Batal</button>
        </div>
      </div>
    `;
    host.querySelector('[data-action="cancel-form"]')?.addEventListener('click', () => { host.innerHTML = ''; });
    host.querySelector('[data-action="save-form"]')?.addEventListener('click', async () => {
      const name = host.querySelector('[data-f="name"]')?.value?.trim() || 'Item';
      const amount = Number(host.querySelector('[data-f="amount"]')?.value || 0);
      const date = host.querySelector('[data-f="date"]')?.value || null;
      const notes = host.querySelector('[data-f="notes"]')?.value || '';
      pushUndo();
      try {
        if (key === 'piutang') {
          const saved = await upsertReceivable({
            id: item?.id,
            name,
            amount,
            due_date: date,
            notes,
            status: item?.raw?.status || 'open',
          });
          if (item) {
            draft = draft.map((d) => (d.id === item.id
              ? { id: saved.id, name: saved.name, amount: saved.amount, meta: saved.due_date || '', kind: 'receivable', raw: saved }
              : d));
          } else {
            draft.push({ id: saved.id, name: saved.name, amount: saved.amount, meta: saved.due_date || '', kind: 'receivable', raw: saved });
          }
        } else if (ASSET_KEYS.has(key)) {
          const saved = await upsertAsset({
            id: item?.id,
            category: key,
            name,
            amount,
            acquired_at: date,
            notes,
          });
          const mapped = { id: saved.id, name: saved.name, amount: saved.amount, meta: saved.acquired_at || '', kind: 'asset', raw: saved };
          if (item) draft = draft.map((d) => (d.id === item.id ? mapped : d));
          else draft.push(mapped);
        } else if (DEBT_KEYS.has(key)) {
          const saved = await upsertDebt({
            id: item?.id,
            category: key,
            name,
            amount,
            due_date: date,
            notes,
          });
          const mapped = { id: saved.id, name: saved.name, amount: saved.amount, meta: saved.due_date || '', kind: 'debt', raw: saved };
          if (item) draft = draft.map((d) => (d.id === item.id ? mapped : d));
          else draft.push(mapped);
        } else if (key === 'modal' || key === 'simpanan') {
          const saved = await upsertEquityEvent({
            id: item?.id,
            kind: key,
            name,
            amount,
            event_date: date || new Date().toISOString().slice(0, 10),
            notes,
          });
          const mapped = { id: saved.id, name: saved.name, amount: saved.amount, meta: saved.event_date || '', kind: 'equity', raw: saved };
          if (item) draft = draft.map((d) => (d.id === item.id ? mapped : d));
          else draft.push(mapped);
        }
        host.innerHTML = '';
        renderList();
        onChanged?.();
      } catch (err) {
        console.error('[neraca-modal] save failed', err);
      }
    });
  };

  backdrop.addEventListener('click', async (e) => {
    if (e.target === backdrop || e.target.closest('[data-action="close"]')) {
      close();
      return;
    }
    const addBtn = e.target.closest('[data-action="add"]');
    if (addBtn && editable) {
      showForm(null);
      return;
    }
    if (e.target.closest('[data-action="sort"]')) {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      renderList();
      return;
    }
    if (e.target.closest('[data-action="undo"]') && undoStack.length) {
      redoStack.push(JSON.parse(JSON.stringify(draft)));
      draft = undoStack.pop();
      renderList();
      return;
    }
    if (e.target.closest('[data-action="redo"]') && redoStack.length) {
      undoStack.push(JSON.parse(JSON.stringify(draft)));
      draft = redoStack.pop();
      renderList();
      return;
    }
    if (e.target.closest('[data-action="refresh"]')) {
      close();
      showNeracaCategoryModal(opts);
      return;
    }
    const editBtn = e.target.closest('[data-action="edit-item"]');
    if (editBtn) {
      const item = draft.find((d) => d.id === editBtn.dataset.id);
      if (item) showForm(item);
      return;
    }
    const delBtn = e.target.closest('[data-action="del-item"]');
    if (delBtn) {
      const id = delBtn.dataset.id;
      const item = draft.find((d) => d.id === id);
      if (!item || !confirm('Hapus item ini?')) return;
      pushUndo();
      try {
        if (item.kind === 'receivable') await deleteReceivable(id);
        else if (item.kind === 'asset') await deleteAsset(id);
        else if (item.kind === 'debt') await deleteDebt(id);
        else if (item.kind === 'equity') await deleteEquityEvent(id);
        draft = draft.filter((d) => d.id !== id);
        renderList();
        onChanged?.();
      } catch (err) {
        console.error('[neraca-modal] delete failed', err);
      }
    }
  });

  backdrop.querySelector('[data-role="search"]')?.addEventListener('input', (e) => {
    query = e.target.value || '';
    renderList();
  });
}
