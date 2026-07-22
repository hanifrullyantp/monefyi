/**
 * Soft-sell upgrade bottom sheet for locked features / caps.
 * @module components/upgrade-sheet
 */

import { getFeatureCopy } from '../services/entitlements.js';

let _root = null;

function ensureRoot() {
  if (_root && document.body.contains(_root)) return _root;
  _root = document.createElement('div');
  _root.id = 'upgradeSheetHost';
  _root.innerHTML = `
    <div class="upgrade-sheet-backdrop" data-upgrade-close="1"></div>
    <div class="upgrade-sheet" role="dialog" aria-modal="true" aria-labelledby="upgradeSheetTitle">
      <div class="upgrade-sheet__handle"></div>
      <div class="upgrade-sheet__icon">✨</div>
      <h2 id="upgradeSheetTitle" class="upgrade-sheet__title"></h2>
      <p class="upgrade-sheet__body"></p>
      <div class="upgrade-sheet__preview">
        <div class="upgrade-sheet__preview-label">Preview</div>
        <p class="upgrade-sheet__preview-text"></p>
      </div>
      <div class="upgrade-sheet__actions">
        <button type="button" class="upgrade-sheet__btn upgrade-sheet__btn--ghost" data-upgrade-close="1">Nanti</button>
        <a class="upgrade-sheet__btn upgrade-sheet__btn--primary" id="upgradeSheetCta" href="#paket">Lihat Paket</a>
      </div>
    </div>
  `;
  document.body.appendChild(_root);
  _root.addEventListener('click', (e) => {
    if (e.target?.dataset?.upgradeClose === '1') closeUpgradeSheet();
  });
  return _root;
}

/**
 * @param {object} opts
 * @param {string} [opts.featureKey]
 * @param {string} [opts.title]
 * @param {string} [opts.body]
 * @param {string} [opts.preview]
 * @param {string} [opts.ctaUrl]
 * @param {string} [opts.ctaLabel]
 */
export function openUpgradeSheet(opts = {}) {
  const copy = opts.featureKey ? getFeatureCopy(opts.featureKey) : {};
  const root = ensureRoot();
  root.classList.add('is-open');
  document.body.classList.add('upgrade-sheet-open');
  root.querySelector('.upgrade-sheet__title').textContent = opts.title || copy.title || 'Fitur Premium';
  root.querySelector('.upgrade-sheet__body').textContent = opts.body || copy.body || '';
  root.querySelector('.upgrade-sheet__preview-text').textContent = opts.preview || copy.preview || '';
  const cta = root.querySelector('#upgradeSheetCta');
  const url = opts.ctaUrl
    || window.STATE?.appConfig?.checkout_monthly_url
    || window.MONEFYI_CONFIG?.checkoutMonthly
    || 'https://monefyi.com#daftar';
  cta.href = url;
  cta.target = '_blank';
  cta.rel = 'noopener';
  cta.textContent = opts.ctaLabel || 'Lihat Paket';
}

export function closeUpgradeSheet() {
  if (!_root) return;
  _root.classList.remove('is-open');
  document.body.classList.remove('upgrade-sheet-open');
}

/**
 * Require feature or open upgrade sheet.
 * @param {string} featureKey
 * @param {object} access from computeAccessState
 * @returns {boolean}
 */
export function requireFeature(featureKey, access) {
  const api = window.__monefyiEntitlements;
  if (api?.canUseFeature?.(featureKey, access)) return true;
  openUpgradeSheet({ featureKey });
  return false;
}

if (typeof window !== 'undefined') {
  window.monefyiUpgradeSheet = { openUpgradeSheet, closeUpgradeSheet, requireFeature };
}
