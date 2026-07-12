// =====================================================
// PROJECT PLANNER — Modal / Bottom Sheet
// Migrated from: src/lib/app.ts (openModal, closeModal)
// Phase 2.2.3
// =====================================================

/** @typedef {() => string} ModalRenderer */
/** @typedef {(type: string) => void} ModalSetupFn */

/** @type {Map<string, ModalRenderer>} */
const registry = new Map();

/** @type {Map<string, ModalSetupFn>} */
const setupRegistry = new Map();

/** @type {HTMLElement | null} */
let currentModal = null;

/** @type {() => void} */
let closePopupFn = () => {};

/**
 * Register a popup closer (wired by card-popup.js in Phase 2.2.4).
 * @param {() => void} fn
 */
export function setPopupCloser(fn) {
  closePopupFn = fn;
}

/**
 * Register a modal type with HTML renderer.
 * @param {string} type
 * @param {ModalRenderer} renderer
 * @param {ModalSetupFn} [setup]
 */
export function registerModal(type, renderer, setup) {
  registry.set(type, renderer);
  if (setup) setupRegistry.set(type, setup);
}

/**
 * Build standard modal shell markup.
 * @param {{
 *   title: string;
 *   icon?: string;
 *   body: string;
 *   footer?: string;
 *   dialogStyle?: string;
 * }} opts
 * @returns {string}
 */
export function buildModalShell(opts) {
  const iconHtml = opts.icon
    ? `<i data-lucide="${opts.icon}"></i>`
    : "";
  const footerHtml = opts.footer
    ? `<div class="modal-footer">${opts.footer}</div>`
    : "";

  return `
    <div class="modal-backdrop" id="main-modal" data-modal-backdrop>
      <div class="modal-dialog" data-modal-dialog style="${opts.dialogStyle || ""}">
        <div class="modal-header">
          <div class="modal-title">${iconHtml} ${opts.title}</div>
          <button type="button" class="modal-close" data-modal-close aria-label="Tutup">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body">${opts.body}</div>
        ${footerHtml}
      </div>
    </div>
  `;
}

/**
 * Refresh Lucide icons inside modal.
 */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Bind backdrop click, close buttons, and stop propagation on dialog.
 * @param {HTMLElement} backdrop
 */
function bindModalEvents(backdrop) {
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop || e.target.hasAttribute("data-modal-backdrop")) {
      closeModal();
    }
  });

  const dialog = backdrop.querySelector("[data-modal-dialog]");
  dialog?.addEventListener("click", (e) => e.stopPropagation());

  backdrop.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal());
  });
}

/**
 * Render modal HTML into container.
 * @param {string} html
 * @param {string} [type]
 */
function renderModal(html, type) {
  const container = document.getElementById("modal-container");
  if (!container) return;

  container.innerHTML = html;
  currentModal = container.querySelector(".modal-backdrop");
  if (!currentModal) return;

  bindModalEvents(currentModal);
  refreshIcons();

  if (type) {
    const setup = setupRegistry.get(type);
    setup?.(type);
  }
}

/**
 * Default fallback modal for unregistered types.
 * @param {string} type
 * @returns {string}
 */
function defaultModal(type) {
  return buildModalShell({
    title: type,
    body: `<p style="color:var(--gray-500);">Modal <strong>${type}</strong> — konten dimigrasi di Phase 2.5.</p>`,
    footer: `<button type="button" class="btn btn-outline" data-modal-close>Batal</button>`,
  });
}

/**
 * Open modal by registered type.
 * @param {string} type
 */
export function openModal(type) {
  closeModal();
  closePopupFn();

  const renderer = registry.get(type);
  const html = renderer ? renderer() : defaultModal(type);
  renderModal(html, type);
}

/**
 * Open modal from raw HTML string.
 * @param {string} html
 * @param {{ type?: string }} [options]
 */
export function openModalHtml(html, options = {}) {
  closeModal();
  closePopupFn();
  renderModal(html, options.type);
}

/**
 * Close the active modal.
 */
export function closeModal() {
  const container = document.getElementById("modal-container");
  if (container) container.innerHTML = "";
  currentModal = null;
}

/**
 * Whether a modal is currently open.
 * @returns {boolean}
 */
export function isModalOpen() {
  return currentModal !== null;
}

/**
 * Register built-in demo modal for sandbox testing.
 */
function registerDemoModal() {
  registerModal("demo", () =>
    buildModalShell({
      title: "Tambah Transaksi",
      icon: "arrow-left-right",
      body: `
        <div class="input-group">
          <label class="input-label">Deskripsi</label>
          <input class="input" type="text" placeholder="Ketik nama bahan/pekerjaan..." />
        </div>
        <div class="input-group">
          <label class="input-label">Nominal (Rp)</label>
          <input class="input" type="number" placeholder="0" />
        </div>
        <p style="font-size:12px;color:var(--gray-400);margin-top:8px;">
          Modal demo — styling &amp; behavior identik existing. Konten penuh di Phase 2.5.1.
        </p>
      `,
      footer: `
        <button type="button" class="btn btn-outline" data-modal-close>Batal</button>
        <button type="button" class="btn btn-primary" data-modal-close>
          <i data-lucide="save"></i>Simpan
        </button>
      `,
    })
  );
}

/**
 * Initialize modal system — Escape key + APP namespace.
 */
export function initModal() {
  registerDemoModal();

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isModalOpen()) {
      e.preventDefault();
      closeModal();
    }
  });

  window.APP = window.APP || {};
  window.APP.openModal = openModal;
  window.APP.closeModal = closeModal;
  window.APP.registerModal = registerModal;
  window.APP.buildModalShell = buildModalShell;
}
