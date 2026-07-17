/**
 * PWA Install Prompt Handler (Add to Home Screen).
 * @module services/install-prompt
 */

let _deferredPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    localStorage.setItem('monefyi_installed', 'true');
  });
}

/**
 * @returns {boolean}
 */
export function canInstall() {
  return _deferredPrompt !== null;
}

/**
 * @returns {boolean}
 */
export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem('monefyi_installed') === 'true'
  );
}

/**
 * @returns {boolean}
 */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * @returns {Promise<{outcome: string, error?: string}>}
 */
export async function showInstallPrompt() {
  if (!_deferredPrompt) return { outcome: 'unavailable' };

  try {
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    return { outcome };
  } catch (e) {
    return { outcome: 'error', error: e.message };
  }
}

/**
 * Setup smart install banner — shows after engagement.
 * @param {object} [options]
 */
export function setupInstallBanner(options = {}) {
  const { delayAfterInteractions = 3, dismissDays = 7 } = options;

  if (isInstalled()) return;

  const dismissedAt = localStorage.getItem('monefyi_install_dismissed_at');
  if (dismissedAt) {
    const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
    if (days < dismissDays) return;
  }

  let interactions = 0;

  const track = () => {
    interactions++;
    if (interactions >= delayAfterInteractions) {
      document.removeEventListener('click', track);
      setTimeout(showBanner, 2000);
    }
  };

  document.addEventListener('click', track);

  function showBanner() {
    if (isInstalled()) return;
    if (!canInstall() && !isIOS()) return;

    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div class="install-banner-content">
        <img src="/app/icons/monefyi-logo.png" alt="" class="install-icon" />
        <div class="install-text">
          <strong>Install Monefyi</strong>
          <p>${isIOS() ? 'Tap "Bagikan" → "Ke Layar Utama"' : 'Buka lebih cepat, kerja offline, dapat notifikasi'}</p>
        </div>
        <div class="install-actions">
          ${!isIOS() ? '<button type="button" class="btn-install" data-action="install">Install</button>' : ''}
          <button type="button" class="btn-dismiss" data-action="dismiss" aria-label="Tutup">✕</button>
        </div>
      </div>
    `;

    banner.querySelector('[data-action="install"]')?.addEventListener('click', async () => {
      const r = await showInstallPrompt();
      if (r.outcome === 'accepted' || r.outcome === 'dismissed') banner.remove();
    });

    banner.querySelector('[data-action="dismiss"]').onclick = () => {
      localStorage.setItem('monefyi_install_dismissed_at', String(Date.now()));
      banner.remove();
    };

    document.body.appendChild(banner);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiInstall = { canInstall, isInstalled, isIOS, showInstallPrompt, setupInstallBanner };
}
