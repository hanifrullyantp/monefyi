/**
 * Bottom sheet — classify large / anomalous transactions.
 * @module components/large-transaction-sheet
 */

import {
  applyClassification,
  suggestResaleValue,
  ASSET_CATEGORIES,
} from '../services/transaction-classification.js';

/** @type {HTMLElement|null} */
let _root = null;
/** @type {((tx: object) => void)|null} */
let _onConfirm = null;
/** @type {object|null} */
let _currentTx = null;

function formatIDR(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(n) || 0));
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function ensureRoot() {
  if (_root && document.body.contains(_root)) return _root;
  _root = document.createElement('div');
  _root.id = 'largeTxSheetHost';
  _root.className = 'large-tx-sheet-host';
  _root.innerHTML = `
    <div class="large-tx-sheet" role="dialog" aria-labelledby="largeTxTitle">
      <div class="large-tx-sheet__header">
        <span aria-hidden="true">🔔</span>
        <h2 id="largeTxTitle">Transaksi Besar Terdeteksi</h2>
        <button type="button" class="large-tx-sheet__close tap" data-ltx-close aria-label="Tutup">×</button>
      </div>
      <div class="large-tx-sheet__body"></div>
    </div>
  `;
  document.body.appendChild(_root);
  _root.querySelector('[data-ltx-close]')?.addEventListener('click', () => hideLargeTransactionSheet());
  _root.addEventListener('click', (e) => {
    if (e.target === _root) hideLargeTransactionSheet();
  });
  return _root;
}

/**
 * @param {object} tx
 * @returns {string}
 */
function buildChoiceHtml(tx) {
  const label = escapeHtml(tx.merchant || tx.category || 'Transaksi');
  const amt = formatIDR(tx.amount);
  return `
    <p class="large-tx-sheet__summary">"${label}" — Rp ${amt}</p>
    <p class="large-tx-sheet__question">Ini apa ya?</p>
    <div class="large-tx-sheet__options">
      <label class="large-tx-sheet__option"><input type="radio" name="ltxChoice" value="asset" /> Pembelian ASET (barang bernilai jual)</label>
      <label class="large-tx-sheet__option"><input type="radio" name="ltxChoice" value="consumption" /> Pembelian KONSUMSI besar</label>
      <label class="large-tx-sheet__option"><input type="radio" name="ltxChoice" value="installment" /> Pembayaran CICILAN</label>
      <label class="large-tx-sheet__option"><input type="radio" name="ltxChoice" value="transfer" /> Transfer / Investasi ke rekening lain</label>
      <label class="large-tx-sheet__option"><input type="radio" name="ltxChoice" value="other" /> Lainnya</label>
    </div>
    <div class="large-tx-sheet__detail" data-ltx-detail hidden></div>
    <button type="button" class="large-tx-sheet__submit tap" data-ltx-submit disabled>Simpan</button>
  `;
}

/**
 * @param {object} tx
 * @returns {string}
 */
function buildAssetDetailHtml(tx) {
  const resale = suggestResaleValue(tx);
  const cats = ASSET_CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  return `
    <h3>Detail Aset</h3>
    <label>Nama<input type="text" data-ltx-asset-name value="${escapeHtml(tx.merchant || tx.category || 'Aset')}" /></label>
    <label>Nilai beli<input type="text" readonly value="Rp ${formatIDR(tx.amount)}" /></label>
    <label>Kategori aset<select data-ltx-asset-cat>${cats}</select></label>
    <label>Nilai jual saat ini<input type="number" data-ltx-resale value="${resale}" /></label>
    <p class="large-tx-sheet__impact">✓ Cash -Rp ${formatIDR(tx.amount)} · Aset +Rp ${formatIDR(tx.amount)} · Net worth: TIDAK BERUBAH</p>
  `;
}

function wireSheetEvents(root, tx) {
  const body = root.querySelector('.large-tx-sheet__body');
  const detail = body?.querySelector('[data-ltx-detail]');
  const submit = body?.querySelector('[data-ltx-submit]');
  const options = body?.querySelectorAll('input[name="ltxChoice"]');

  options?.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!detail || !submit) return;
      submit.disabled = false;
      const val = radio.value;
      if (val === 'asset') {
        detail.hidden = false;
        detail.innerHTML = buildAssetDetailHtml(tx);
      } else if (val === 'other') {
        detail.hidden = false;
        detail.innerHTML = '<label>Catatan<input type="text" data-ltx-note placeholder="Jelaskan transaksi ini" /></label>';
      } else {
        detail.hidden = true;
        detail.innerHTML = '';
      }
    });
  });

  submit?.addEventListener('click', async () => {
    const selected = body?.querySelector('input[name="ltxChoice"]:checked');
    if (!selected || !_onConfirm) return;
    const choice = selected.value;
    const details = {};
    if (choice === 'asset') {
      details.assetName = detail?.querySelector('[data-ltx-asset-name]')?.value;
      details.category = detail?.querySelector('[data-ltx-asset-cat]')?.value || 'Elektronik';
      details.resaleValue = Number(detail?.querySelector('[data-ltx-resale]')?.value || suggestResaleValue(tx));
      details.assetCategory = (details.category || 'elektronik').toLowerCase();
    }
    if (choice === 'other') {
      details.note = detail?.querySelector('[data-ltx-note]')?.value || '';
    }
    const classified = applyClassification(tx, choice, details);
    await _onConfirm(classified);
    hideLargeTransactionSheet();
  });
}

/**
 * @param {object} tx
 * @param {{ onConfirm: (tx: object) => Promise<void>|void }} opts
 */
export function showLargeTransactionSheet(tx, opts = {}) {
  _currentTx = tx;
  _onConfirm = opts.onConfirm || null;
  const root = ensureRoot();
  const body = root.querySelector('.large-tx-sheet__body');
  if (body) {
    body.innerHTML = buildChoiceHtml(tx);
    wireSheetEvents(root, tx);
  }
  root.classList.add('is-visible');
}

export function hideLargeTransactionSheet() {
  _root?.classList.remove('is-visible');
  _currentTx = null;
  _onConfirm = null;
}

/**
 * Sync asset to neraca after classification.
 * @param {object} tx
 */
export async function syncAssetToNeraca(tx) {
  if (tx.meta?.expense_treatment !== 'asset' && !tx.meta?.is_asset_purchase) return;
  try {
    const { upsertAsset } = await import('../services/neraca-store.js');
    await upsertAsset({
      name: tx.meta?.asset_name || tx.merchant || 'Aset',
      amount: Math.abs(Number(tx.amount || 0)),
      category: tx.meta?.asset_category || 'elektronik',
      acquired_at: tx.date,
      notes: `Dari transaksi: ${tx.merchant || tx.id}`,
      meta: { transaction_id: tx.id, resale_value: tx.meta?.asset_resale_value },
    });
    const { syncFromTransaction } = await import('../services/journal-engine.js');
    await syncFromTransaction(tx);
  } catch (e) {
    console.error('[large-tx] neraca sync failed', e);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiLargeTransactionSheet = {
    showLargeTransactionSheet,
    hideLargeTransactionSheet,
    syncAssetToNeraca,
  };
}
