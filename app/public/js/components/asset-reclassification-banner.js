/**
 * One-time banner — reclassify past large transactions.
 * @module components/asset-reclassification-banner
 */

import { findUnhandledAnomalies } from '../services/transaction-classification.js';

const LS_DISMISS = 'monefyi_asset_reclass_dismissed';

/**
 * @param {object} state
 * @param {{ onReview?: (tx: object) => void }} callbacks
 * @returns {HTMLElement|null}
 */
export function renderAssetReclassificationBanner(state, callbacks = {}) {
  if (localStorage.getItem(LS_DISMISS) === '1') return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const anomalies = findUnhandledAnomalies(state?.transactions || [])
    .filter((t) => String(t.date || '') >= cutoffStr);

  if (!anomalies.length) return null;

  const el = document.createElement('div');
  el.className = 'asset-reclass-banner home-section';
  el.innerHTML = `
    <span aria-hidden="true">💡</span>
    <div>
      <strong>${anomalies.length} transaksi besar perlu review</strong>
      <span>Supaya cash flow & score tidak terdistorsi</span>
    </div>
    <button type="button" class="tap" data-action="review-anomaly">Review</button>
    <button type="button" class="tap asset-reclass-banner__dismiss" data-action="dismiss">Nanti</button>
  `;

  el.querySelector('[data-action="review-anomaly"]')?.addEventListener('click', () => {
    callbacks.onReview?.(anomalies[0]);
  });
  el.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
    localStorage.setItem(LS_DISMISS, '1');
    el.remove();
  });

  return el;
}

if (typeof window !== 'undefined') {
  window.monefyiAssetReclassificationBanner = { renderAssetReclassificationBanner };
}
