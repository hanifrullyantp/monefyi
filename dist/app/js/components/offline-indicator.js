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

  function update() {
    const online =
      typeof window.monefyiConnectivity?.isOnline === 'function'
        ? window.monefyiConnectivity.isOnline()
        : navigator.onLine;

    el.className = `offline-indicator ${online ? 'online' : 'offline'}`;
    el.innerHTML = `
      <span class="dot"></span>
      <span class="label">${online ? 'Online' : 'Mode Offline'}</span>
    `;

    if (online) {
      el.classList.add('flash');
      el.style.display = 'flex';
      setTimeout(() => {
        el.style.display = 'none';
        el.classList.remove('flash');
      }, 3000);
    } else {
      el.style.display = 'flex';
    }
  }

  update();

  window.addEventListener('online', () => {
    update();
    setTimeout(() => {
      window.monefyiSync?.triggerSync?.('back-online');
      window.monefyiPending?.processPendingQueue?.();
    }, 1500);
  });

  window.addEventListener('offline', update);

  return el;
}
