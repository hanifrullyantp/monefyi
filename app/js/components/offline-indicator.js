/**
 * Offline / online status indicator.
 * @module components/offline-indicator
 */

/**
 * @returns {HTMLElement}
 */
export function renderOfflineIndicator() {
  const el = document.createElement('div');
  el.className = 'offline-indicator';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  let hideTimer = 0;

  function update() {
    // Prefer hard browser offline; connectivity helper only for false-online cases
    const offline =
      (typeof navigator !== 'undefined' && !navigator.onLine)
      || (typeof window.monefyiConnectivity?.isOnline === 'function'
        && !window.monefyiConnectivity.isOnline());
    const online = !offline;

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = 0;
    }

    el.className = `offline-indicator ${online ? 'online' : 'offline'}`;
    el.innerHTML = `
      <span class="dot"></span>
      <span class="label">${online ? 'Online' : 'Mode Offline'}</span>
    `;

    if (online) {
      el.classList.add('flash');
      el.style.display = 'flex';
      hideTimer = window.setTimeout(() => {
        el.style.display = 'none';
        el.classList.remove('flash');
        hideTimer = 0;
      }, 3000);
    } else {
      el.classList.remove('flash');
      el.style.display = 'flex';
    }
  }

  update();

  window.addEventListener('online', () => {
    update();
    setTimeout(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (window.monefyiConnectivity?.isOnline && !window.monefyiConnectivity.isOnline()) return;
      window.monefyiSync?.triggerSync?.('back-online');
      window.monefyiPending?.processPendingQueue?.();
    }, 1500);
  });

  window.addEventListener('offline', update);
  window.addEventListener('monefyi:connectivity', update);

  return el;
}
