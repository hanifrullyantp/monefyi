/** PWA install prompt utilities — ported from Monefyi install-prompt.js */

export type InstallMode =
  | 'installed'
  | 'android_prompt'
  | 'android_manual'
  | 'ios_safari'
  | 'ios_other'
  | 'desktop_prompt'
  | 'unsupported';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    localStorage.setItem('stay_installed', 'true');
    notifyListeners();
  });
}

/** Subscribe to install prompt availability changes. */
export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return false;
  return /Safari/i.test(ua);
}

export function isDesktop(): boolean {
  return !isIOS() && !isAndroid();
}

export function getInstallMode(): InstallMode {
  if (isInstalled()) return 'installed';
  if (isIOS()) return isIOSSafari() ? 'ios_safari' : 'ios_other';
  if (isAndroid()) return canInstall() ? 'android_prompt' : 'android_manual';
  if (isDesktop()) return canInstall() ? 'desktop_prompt' : 'unsupported';
  return canInstall() ? 'android_prompt' : 'unsupported';
}

export async function showInstallPrompt(): Promise<{ outcome: string; error?: string }> {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notifyListeners();
    return { outcome };
  } catch (e) {
    return { outcome: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}

export interface InstallGuideContent {
  title: string;
  steps: string[];
  cta?: string;
}

export function getInstallGuideContent(mode?: InstallMode): InstallGuideContent {
  const m = mode ?? getInstallMode();

  if (m === 'ios_safari') {
    return {
      title: 'Pasang ke Layar Utama',
      steps: [
        'Tap tombol Bagikan (kotak dengan panah ke atas) di bawah Safari.',
        'Scroll dan pilih "Ke Layar Utama" / "Add to Home Screen".',
        'Tap "Tambah" — ikon STAY muncul di Home Screen.',
      ],
    };
  }
  if (m === 'ios_other') {
    return {
      title: 'Buka di Safari dulu',
      steps: [
        'Browser ini di iPhone tidak mendukung Install seperti Safari.',
        'Salin alamat halaman, buka Safari, lalu buka lagi monefyi.com/stay.',
        'Di Safari: Bagikan → Ke Layar Utama.',
      ],
      cta: 'Mengerti',
    };
  }
  if (m === 'android_manual') {
    return {
      title: 'Pasang STAY',
      steps: [
        'Tap menu ⋮ di pojok kanan atas Chrome.',
        'Pilih "Install app" atau "Add to Home screen".',
        'Konfirmasi — STAY bisa dibuka seperti aplikasi.',
      ],
    };
  }
  return {
    title: 'Install STAY',
    steps: [
      'Di Chrome/Edge, cari ikon Install di bilah alamat.',
      'Atau buka menu ⋮ → "Install STAY" / "Install app".',
    ],
  };
}

export async function runInstallFlow(): Promise<{ mode: InstallMode; outcome?: string }> {
  const mode = getInstallMode();

  if (mode === 'installed') return { mode, outcome: 'already_installed' };
  if (mode === 'android_prompt' || mode === 'desktop_prompt') {
    const r = await showInstallPrompt();
    if (r.outcome === 'unavailable') {
      return { mode, outcome: 'guide' };
    }
    return { mode, outcome: r.outcome };
  }
  return { mode, outcome: 'guide' };
}

const DISMISS_KEY = 'stay_install_dismissed_at';
const DISMISS_DAYS = 7;

export function isInstallBannerDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return false;
    const days = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function dismissInstallBanner(): void {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function shouldShowInstallBanner(): boolean {
  if (isInstalled()) return false;
  if (isInstallBannerDismissed()) return false;
  const mode = getInstallMode();
  return mode !== 'installed' && mode !== 'unsupported';
}

export function getInstallBannerSubtitle(mode: InstallMode): string {
  if (mode === 'ios_safari') return 'Tap "Bagikan" → "Ke Layar Utama"';
  if (mode === 'ios_other') return 'Buka di Safari untuk pasang ke layar utama';
  if (mode === 'android_prompt' || mode === 'desktop_prompt') {
    return 'Buka lebih cepat, dapat notifikasi operasional';
  }
  if (mode === 'android_manual') return 'Pasang dari menu Chrome ⋮';
  return 'Pasang STAY di perangkat Anda';
}
