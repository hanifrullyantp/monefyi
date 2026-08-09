/**
 * Global ESC / Enter for page modals and overlays.
 * ESC = close without save · Enter = primary save (when not in textarea)
 * @module services/modal-keyboard
 */

/** @type {boolean} */
let _wired = false;

/** @type {Record<string, string>} */
const SHEET_BACKDROP_CLOSE_FN = {
  sheetBackdrop: 'closeAddSheet',
  budgetBackdrop: 'closeBudget',
  advisorBackdrop: 'closeAdvisor',
  menuBackdrop: 'closeMenu',
  userBackdrop: 'closeUser',
  accountsBackdrop: 'closeAccounts',
  accountDetailBackdrop: 'closeAccountDetail',
  editBackdrop: 'closeEditModal',
  affBackdrop: 'closeAffModal',
  adminBackdrop: 'closeAdminPanel',
  tutorialBackdrop: 'closeTutorial',
};

/**
 * @param {Element|null|undefined} root
 * @param {string} selectors
 * @returns {HTMLElement|null}
 */
function clickFirst(root, selectors) {
  if (!root) return null;
  for (const sel of selectors.split(',').map((s) => s.trim()).filter(Boolean)) {
    const el = root.querySelector(sel);
    if (el instanceof HTMLElement && !el.disabled) {
      el.click();
      return el;
    }
  }
  return null;
}

/**
 * @param {Element|null|undefined} el
 */
function shouldSkipEnter(el) {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'BUTTON' || tag === 'A') return true;
  return false;
}

/**
 * @param {HTMLElement} el
 */
function layerZ(el) {
  const z = parseInt(getComputedStyle(el).zIndex, 10);
  return Number.isFinite(z) ? z : 0;
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isVisibleLayer(el) {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.classList.contains('hidden')) return false;
  return true;
}

/**
 * Close a native sheet backdrop by id or generic fallback.
 * @param {HTMLElement} el
 */
function cancelSheetBackdrop(el) {
  const fnName = SHEET_BACKDROP_CLOSE_FN[el.id];
  const fn = fnName && typeof window[fnName] === 'function' ? window[fnName] : null;
  if (fn) {
    fn();
    return;
  }

  const closeBtn = el.querySelector(
    '[data-close-menu], [data-close-advisor], [data-close-budget], [data-close-user], '
    + '[data-close-accounts], [data-close-account-detail], [data-close-edit], [data-close-aff], '
    + '[data-close-admin], [data-close-tutorial], [data-close="true"], [data-action="close"], .sheet-close-btn',
  );
  if (closeBtn instanceof HTMLElement) {
    closeBtn.click();
    return;
  }

  el.classList.remove('open');
  el.querySelector('.sheet.open, .sheet-panel.open')?.classList.remove('open');
  if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
}

/**
 * @returns {{ el: HTMLElement, z: number, save: () => void, cancel: () => void }[]}
 */
function collectOpenLayers() {
  /** @type {{ el: HTMLElement, z: number, save: () => void, cancel: () => void }[]} */
  const layers = [];

  const push = (el, save, cancel, zBoost = 0) => {
    if (!isVisibleLayer(el)) return;
    layers.push({ el, z: layerZ(el) + zBoost, save, cancel });
  };

  document.querySelectorAll(
    '.budget-modal-overlay, .budget-detail-overlay, .budget-eval-overlay, '
    + '.filter-popup-overlay, .btm-overlay, .btm-confirm-overlay, '
    + '.pending-modal-overlay, .notif-modal-overlay, .notif-settings-overlay, '
    + '.email-import-overlay, .install-guide-overlay, .monevisor-panel-overlay, '
    + '.income-modal-overlay, .target-manager-overlay, .bfp-picker-overlay',
  ).forEach((raw) => {
    const el = /** @type {HTMLElement} */ (raw);

    if (el.classList.contains('notif-modal-overlay') && !el.classList.contains('is-open')) return;

    const needsShow = el.classList.contains('filter-popup-overlay')
      || el.classList.contains('btm-overlay')
      || el.classList.contains('btm-confirm-overlay')
      || el.classList.contains('email-import-overlay')
      || el.classList.contains('monevisor-panel-overlay')
      || el.classList.contains('notif-settings-overlay')
      || el.classList.contains('install-guide-overlay');
    if (needsShow && !el.classList.contains('show')) return;

    const custom = el._modalKeyboard;
    push(
      el,
      () => {
        if (typeof custom?.onSave === 'function') custom.onSave();
        else clickFirst(el, custom?.saveSelector || '[data-action="confirm"], [data-action="save"], [data-action="apply"], .btn-primary-budget, .btc-btn.primary');
      },
      () => {
        if (typeof custom?.onCancel === 'function') custom.onCancel();
        else if (clickFirst(el, '[data-action="close"], .sheet-close-btn, .close-btn, .ns-close')) return;
        else {
          el.classList.remove('show', 'is-open');
          el.remove();
        }
      },
      10,
    );
  });

  const editBackdrop = document.getElementById('editBackdrop');
  if (editBackdrop?.classList.contains('open')) {
    push(
      editBackdrop,
      () => document.getElementById('btnUpdateTx')?.click(),
      () => {
        if (typeof window.closeEditModal === 'function') window.closeEditModal();
        else editBackdrop.classList.remove('open');
      },
      20,
    );
  }

  const sheetBackdrop = document.getElementById('sheetBackdrop');
  if (sheetBackdrop?.classList.contains('open')) {
    push(
      sheetBackdrop,
      () => {
        const panel = document.querySelector('.tabPanel:not(.hidden)');
        const tab = panel?.dataset?.tabPanel || 'quick';
        const map = {
          manual: 'btnSaveManual',
          quick: 'btnUnifiedParse',
          batch: 'btnBatchSaveValid',
          receipt: 'btnSaveReceiptAuto',
        };
        const id = map[tab] || map.quick;
        document.getElementById(id)?.click();
      },
      () => cancelSheetBackdrop(sheetBackdrop),
      15,
    );
  }

  document.querySelectorAll('.sheet-backdrop.open').forEach((raw) => {
    const el = /** @type {HTMLElement} */ (raw);
    if (el.id === 'editBackdrop' || el.id === 'sheetBackdrop') return;
    push(
      el,
      () => clickFirst(el, '[data-action="save"], .btn-primary, [id^="btnSave"]'),
      () => cancelSheetBackdrop(el),
      5,
    );
  });

  const onboarding = document.getElementById('onboardingBackdrop');
  if (onboarding?.classList.contains('open')) {
    push(
      onboarding,
      () => document.getElementById('btnOnboardingStart')?.click(),
      () => window.MonefyiUI?.hideOnboarding?.(),
      1,
    );
  }

  return layers.sort((a, b) => a.z - b.z);
}

/**
 * @returns {{ save: () => void, cancel: () => void }|null}
 */
function getTopLayer() {
  const layers = collectOpenLayers();
  if (!layers.length) return null;
  return layers[layers.length - 1];
}

/**
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function handleModalEscape(e) {
  const top = getTopLayer();
  if (!top) return false;
  top.cancel();
  return true;
}

/**
 * @param {KeyboardEvent} e
 * @returns {boolean}
 */
export function handleModalEnter(e) {
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return false;
  const top = getTopLayer();
  if (!top) return false;
  if (shouldSkipEnter(document.activeElement)) return false;
  top.save();
  return true;
}

/**
 * Attach explicit handlers on a modal root (optional).
 * @param {HTMLElement} el
 * @param {{ onSave?: () => void, onCancel?: () => void, saveSelector?: string }} handlers
 */
export function attachModalKeyboard(el, handlers = {}) {
  if (!(el instanceof HTMLElement)) return;
  el._modalKeyboard = handlers;
}

/**
 * Wire document-level ESC / Enter (capture phase).
 */
export function initGlobalModalKeyboard() {
  if (_wired) return;
  _wired = true;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (handleModalEscape(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (e.key === 'Enter') {
      if (handleModalEnter(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
  }, true);
}

if (typeof window !== 'undefined') {
  window.monefyiModalKeyboard = {
    initGlobalModalKeyboard,
    handleModalEscape,
    handleModalEnter,
    attachModalKeyboard,
  };
}
