/**
 * Enhanced undo toast — 10s window with undo button.
 * @module components/undo-toast
 */

/**
 * @param {string} message
 * @param {() => void|Promise<void>} onUndo
 */
export function showUndoToast(message, onUndo) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'success', {
      duration: 10000,
      undo: onUndo,
    });
    return;
  }

  if (window.MonefyiUI?.showToast) {
    window.MonefyiUI.showToast(message, 'success', {
      duration: 10000,
      undo: onUndo,
    });
  }
}
