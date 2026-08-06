/**
 * Mini win celebration bottom toast.
 * @module components/mini-win-celebration
 */

/** @type {HTMLElement|null} */
let _root = null;
/** @type {number|null} */
let _timer = null;

function ensureRoot() {
  if (_root && document.body.contains(_root)) return _root;
  _root = document.createElement('div');
  _root.id = 'miniWinHost';
  _root.innerHTML = `
    <div class="mini-win-celebration" role="status" aria-live="polite">
      <button type="button" class="mini-win-celebration__dismiss" data-dismiss aria-label="Tutup">×</button>
      <div class="mini-win-celebration__body"></div>
    </div>
  `;
  document.body.appendChild(_root);
  _root.querySelector('[data-dismiss]')?.addEventListener('click', hideMiniWinCelebration);
  return _root;
}

/**
 * @param {{ title: string, message: string }} win
 */
export function showMiniWinCelebration(win) {
  const root = ensureRoot();
  const body = root.querySelector('.mini-win-celebration__body');
  if (!body) return;

  body.innerHTML = `
    <div class="mini-win-celebration__title">${escapeHtml(win.title)}</div>
    <div class="mini-win-celebration__msg">${escapeHtml(win.message)}</div>
  `;

  root.classList.add('is-visible');
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => hideMiniWinCelebration(), 5500);
}

export function hideMiniWinCelebration() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  _root?.classList.remove('is-visible');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
