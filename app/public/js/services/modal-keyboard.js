/**
 * Global ESC / Enter for page modals and overlays.
 * ESC = close without save · Enter = primary save (when not in textarea)
 * @module services/modal-keyboard
 */

/** @type {boolean} */
let _wired = false;

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
 * @returns {{ el: HTMLElement, z: number, save: () => void, cancel: () => void }[]}
 */
function collectOpenLayers() {
  /** @type {{ el: HTMLElement, z: number, save: () => void, cancel: () => void }[]} */
  const layers = [];

  const push = (el, save, cancel, zBoost = 0) => {
    if (!(el instanceof HTMLElement) || !el.isConnected) return;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    layers.push({ el, z: layerZ(el) + zBoost, save, cancel });
  };

  document.querySelectorAll(
    '.budget-modal-overlay, .budget-detail-overlay, .budget-eval-overlay, '
    + '.filter-popup-overlay, .btm-overlay, .btm-confirm-overlay, '
    + '.pending-modal-overlay, .notif-modal-overlay, .notif-settings-overlay, '
    + '.email-import-overlay, .install-guide-overlay, .monevisor-panel-overlay, '
    + '.income-modal-overlay',
  ).forEach((raw) => {
    const el = /** @type {HTMLElement} */ (raw);
    const needsShow = el.classList.contains('filter-popup-overlay')
      || el.classList.contains('btm-overlay')
      || el.classList.contains('btm-confirm-overlay')
      || el.classList.contains('email-import-overlay')
      || el.classList.contains('monevisor-panel-overlay')
      || el.classList.contains('notif-settings-overlay');
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
        else if (clickFirst(el, '[data-action="close"], .sheet-close-btn')) return;
        else {
          el.classList.remove('show');
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
      () => {
        if (typeof window.closeAddSheet === 'function') window.closeAddSheet();
        else sheetBackdrop.classList.remove('open');
      },
      15,
    );
  }

  document.querySelectorAll('.sheet-backdrop.open').forEach((raw) => {
    const el = /** @type {HTMLElement} */ (raw);
    if (el.id === 'editBackdrop' || el.id === 'sheetBackdrop') return;
    push(
      el,
      () => clickFirst(el, '[data-action="save"], .btn-primary, [id^="btnSave"]'),
      () => clickFirst(el, '[data-close="true"], [data-action="close"], .sheet-close-btn')
        || el.classList.remove('open'),
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
