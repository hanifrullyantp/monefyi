/** Register service worker in production builds. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[pwa] service worker registration failed:', err));
  });
}

/** Listen for PWA install prompt (Chrome / Edge / Android). */
export function listenForInstallPrompt(
  onAvailable: (prompt: BeforeInstallPromptEvent) => void,
): () => void {
  const handler = (e: Event) => {
    e.preventDefault();
    onAvailable(e as BeforeInstallPromptEvent);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
