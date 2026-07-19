/**
 * PWA Install Prompt Handler (Add to Home Screen).
 * @module services/install-prompt
 */

let _deferredPrompt = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    try {
      document.getElementById('btnPwaInstall')?.classList.remove('hidden');
    } catch { /* ignore */ }
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    localStorage.setItem('monefyi_installed', 'true');
    try {
      document.getElementById('btnPwaInstall')?.classList.add('hidden');
    } catch { /* ignore */ }
  });
}

/**
 * @returns {boolean}
 */
export function canInstall() {
  return _deferredPrompt !== null;
}

/**
 * Hard install check (standalone). localStorage is soft-only.
 * @returns {boolean}
 */
export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

/**
 * @returns {boolean}
 */
export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * @returns {boolean}
 */
export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * True Safari on iOS (not Chrome/Firefox/Edge WebKit wrappers).
 * @returns {boolean}
 */
export function isIOSSafari() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

/**
 * @returns {boolean}
 */
export function isDesktop() {
  return !isIOS() && !isAndroid();
}

/**
 * Platform-aware install UX mode.
 * @returns {'installed'|'android_prompt'|'android_manual'|'ios_safari'|'ios_other'|'desktop_prompt'|'unsupported'}
 */
export function getInstallMode() {
  if (isInstalled()) return 'installed';

  if (isIOS()) {
    return isIOSSafari() ? 'ios_safari' : 'ios_other';
  }
  if (isAndroid()) {
    return canInstall() ? 'android_prompt' : 'android_manual';
  }
  if (isDesktop()) {
    return canInstall() ? 'desktop_prompt' : 'unsupported';
  }
  return canInstall() ? 'android_prompt' : 'unsupported';
}

/**
 * Whether Install App shortcut should appear in Quick Access.
 * @returns {boolean}
 */
export function shouldShowInstallShortcut() {
  return getInstallMode() !== 'installed';
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
 * @param {string} mode
 * @returns {{ title: string, steps: string[], cta?: string }}
 */
function guideContent(mode) {
  if (mode === 'ios_safari') {
    return {
      title: 'Pasang ke Layar Utama',
      steps: [
        'Tap tombol Bagikan (kotak dengan panah ke atas) di bawah Safari.',
        'Scroll dan pilih “Ke Layar Utama” / “Add to Home Screen”.',
        'Tap “Tambah” — ikon Monefyi muncul di Home Screen.',
      ],
    };
  }
  if (mode === 'ios_other') {
    return {
      title: 'Buka di Safari dulu',
      steps: [
        'Browser ini di iPhone tidak mendukung Install seperti Safari.',
        'Salin alamat halaman, buka Safari, lalu buka lagi monefyi.com/app.',
        'Di Safari: Bagikan → Ke Layar Utama.',
      ],
      cta: 'Mengerti',
    };
  }
  if (mode === 'android_manual') {
    return {
      title: 'Pasang Monefyi',
      steps: [
        'Tap menu ⋮ di pojok kanan atas Chrome.',
        'Pilih “Install app” atau “Add to Home screen”.',
        'Konfirmasi — Monefyi bisa dibuka seperti aplikasi.',
      ],
    };
  }
  return {
    title: 'Install Monefyi',
    steps: [
      'Di Chrome/Edge, cari ikon Install di bilah alamat.',
      'Atau buka menu ⋮ → “Install Monefyi” / “Install app”.',
    ],
  };
}

/**
 * Modal langkah install (iOS Safari / Android manual / dll).
 * @param {string} [mode]
 */
export function showInstallGuide(mode) {
  const m = mode || getInstallMode();
  document.querySelector('.install-guide-overlay')?.remove();

  const content = guideContent(m);
  const overlay = document.createElement('div');
  overlay.className = 'install-guide-overlay';
  overlay.innerHTML = `
    <div class="install-guide-sheet" role="dialog" aria-modal="true" aria-label="${content.title}">
      <div class="install-guide-head">
        <h3>${content.title}</h3>
        <button type="button" class="install-guide-close" data-action="close" aria-label="Tutup">✕</button>
      </div>
      <ol class="install-guide-steps">
        ${content.steps.map((s) => `<li>${s}</li>`).join('')}
      </ol>
      <button type="button" class="install-guide-cta" data-action="close">${content.cta || 'Mengerti'}</button>
    </div>
  `;

  const close = () => {
    overlay.classList.remove('is-open');
    setTimeout(() => overlay.remove(), 220);
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('[data-action="close"]').forEach((b) => { b.onclick = close; });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}

/**
 * Run the right install action for current platform.
 * @returns {Promise<{mode: string, outcome?: string}>}
 */
export async function runInstallFlow() {
  const mode = getInstallMode();

  if (mode === 'installed') {
    return { mode, outcome: 'already_installed' };
  }
  if (mode === 'android_prompt' || mode === 'desktop_prompt') {
    const r = await showInstallPrompt();
    if (r.outcome === 'unavailable') {
      showInstallGuide(mode === 'desktop_prompt' ? 'unsupported' : 'android_manual');
      return { mode, outcome: 'guide' };
    }
    return { mode, outcome: r.outcome };
  }
  if (mode === 'ios_safari' || mode === 'ios_other' || mode === 'android_manual') {
    showInstallGuide(mode);
    return { mode, outcome: 'guide' };
  }
  showInstallGuide('unsupported');
  return { mode, outcome: 'guide' };
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
    const mode = getInstallMode();
    if (mode === 'installed' || mode === 'unsupported') return;

    let subtitle = 'Buka lebih cepat, kerja offline, dapat notifikasi';
    let showInstallBtn = false;
    if (mode === 'ios_safari') {
      subtitle = 'Tap “Bagikan” → “Ke Layar Utama”';
    } else if (mode === 'ios_other') {
      subtitle = 'Buka di Safari untuk pasang ke layar utama';
    } else if (mode === 'android_prompt' || mode === 'desktop_prompt') {
      showInstallBtn = true;
    } else if (mode === 'android_manual') {
      subtitle = 'Pasang dari menu Chrome ⋮';
    }

    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div class="install-banner-content">
        <img src="/app/icons/monefyi-logo.png" alt="" class="install-icon" />
        <div class="install-text">
          <strong>Install Monefyi</strong>
          <p>${subtitle}</p>
        </div>
        <div class="install-actions">
          ${showInstallBtn ? '<button type="button" class="btn-install" data-action="install">Install</button>' : ''}
          <button type="button" class="btn-install btn-install--soft" data-action="guide">Cara</button>
          <button type="button" class="btn-dismiss" data-action="dismiss" aria-label="Tutup">✕</button>
        </div>
      </div>
    `;

    banner.querySelector('[data-action="install"]')?.addEventListener('click', async () => {
      const r = await showInstallPrompt();
      if (r.outcome === 'accepted' || r.outcome === 'dismissed') banner.remove();
    });

    banner.querySelector('[data-action="guide"]')?.addEventListener('click', () => {
      showInstallGuide(mode);
    });

    banner.querySelector('[data-action="dismiss"]').onclick = () => {
      localStorage.setItem('monefyi_install_dismissed_at', String(Date.now()));
      banner.remove();
    };

    document.body.appendChild(banner);
  }
}

if (typeof window !== 'undefined') {
  window.monefyiInstall = {
    canInstall,
    isInstalled,
    isIOS,
    isAndroid,
    isIOSSafari,
    getInstallMode,
    shouldShowInstallShortcut,
    showInstallPrompt,
    showInstallGuide,
    runInstallFlow,
    setupInstallBanner,
  };
}
