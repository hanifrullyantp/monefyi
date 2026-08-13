/**
 * Banner — pending transactions awaiting confirmation.
 * @module components/pending-transactions-banner
 */

import { getPendingTransactions } from '../services/transaction-classification.js';

/**
 * @param {object} state
 * @param {{ onReview?: () => void, onConfirmAll?: () => void }} callbacks
 * @returns {HTMLElement|null}
 */
export function renderPendingTransactionsBanner(state, callbacks = {}) {
  const pending = getPendingTransactions(state?.transactions || []);
  if (!pending.length) return null;

  const el = document.createElement('div');
  el.className = 'pending-tx-banner home-section';
  el.innerHTML = `
    <span class="pending-tx-banner__icon" aria-hidden="true">📋</span>
    <div class="pending-tx-banner__text">
      <strong>${pending.length} transaksi menunggu konfirmasi</strong>
      <span>Belum masuk laporan sampai di-review</span>
    </div>
    <button type="button" class="pending-tx-banner__cta tap" data-action="review-pending">Review Sekarang</button>
  `;

  el.querySelector('[data-action="review-pending"]')?.addEventListener('click', () => {
    callbacks.onReview?.();
  });

  return el;
}

/**
 * @param {object[]} pending
 * @param {{ onConfirm?: (tx: object) => void, onDelete?: (tx: object) => void, onConfirmAll?: () => void }} callbacks
 * @returns {HTMLElement}
 */
export function renderPendingTransactionsList(pending, callbacks = {}) {
  const el = document.createElement('section');
  el.className = 'pending-tx-list';
  el.innerHTML = `
    <div class="pending-tx-list__header">
      <h3>Transaksi Pending</h3>
      ${pending.length > 1 ? '<button type="button" class="tap" data-action="confirm-all">Confirm All</button>' : ''}
    </div>
    <ul class="pending-tx-list__items"></ul>
  `;

  const list = el.querySelector('.pending-tx-list__items');
  pending.forEach((tx) => {
    const li = document.createElement('li');
    li.className = 'pending-tx-list__item';
    const amt = new Intl.NumberFormat('id-ID').format(Math.round(Number(tx.amount || 0)));
    li.innerHTML = `
      <span>${tx.merchant || tx.category || 'Transaksi'} — Rp ${amt}</span>
      <div class="pending-tx-list__actions">
        <button type="button" class="tap" data-action="confirm">Confirm</button>
        <button type="button" class="tap" data-action="delete">Delete</button>
      </div>
    `;
    li.querySelector('[data-action="confirm"]')?.addEventListener('click', () => callbacks.onConfirm?.(tx));
    li.querySelector('[data-action="delete"]')?.addEventListener('click', () => callbacks.onDelete?.(tx));
    list?.appendChild(li);
  });

  el.querySelector('[data-action="confirm-all"]')?.addEventListener('click', () => callbacks.onConfirmAll?.());

  return el;
}

if (typeof window !== 'undefined') {
  window.monefyiPendingTransactionsBanner = {
    renderPendingTransactionsBanner,
    renderPendingTransactionsList,
  };
}
