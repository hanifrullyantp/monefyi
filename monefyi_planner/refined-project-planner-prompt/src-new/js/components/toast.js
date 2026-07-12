// =====================================================
// PROJECT PLANNER — Toast Notifications
// Migrated from: src/lib/app.ts (showToast)
// Phase 2.2.2
// =====================================================

/** @typedef {'success' | 'error' | 'warning' | 'info'} ToastType */

const ICON_MAP = {
  success: "check-circle-2",
  error: "alert-circle",
  warning: "alert-triangle",
  info: "info",
};

const DEFAULT_DURATION_MS = 3500;
const DISMISS_ANIMATION_MS = 300;

/**
 * Refresh Lucide icons inside a toast element.
 */
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Get or create the toast container element.
 * @returns {HTMLElement | null}
 */
function getContainer() {
  return document.getElementById("toast-container");
}

/**
 * Animate toast out and remove from DOM.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  toast.style.animation = "toastIn 0.3s ease reverse";
  setTimeout(() => toast.remove(), DISMISS_ANIMATION_MS);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {ToastType} [type='info']
 * @param {{ duration?: number }} [options]
 * @returns {HTMLElement | null}
 */
export function showToast(message, type = "info", options = {}) {
  const container = getContainer();
  if (!container) {
    console.warn("[toast] Container #toast-container not found");
    return null;
  }

  const safeType = ICON_MAP[type] ? type : "info";
  const duration = options.duration ?? DEFAULT_DURATION_MS;

  const toast = document.createElement("div");
  toast.className = `toast ${safeType}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <i data-lucide="${ICON_MAP[safeType]}"></i>
    <span style="flex:1">${message}</span>
    <button class="toast-close" type="button" aria-label="Tutup notifikasi">
      <i data-lucide="x" style="width:14px;height:14px;"></i>
    </button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn?.addEventListener("click", () => dismissToast(toast));

  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => dismissToast(toast), duration);

  return toast;
}

/**
 * Initialize toast — expose on global APP namespace.
 */
export function initToast() {
  window.APP = window.APP || {};
  window.APP.showToast = showToast;
}
