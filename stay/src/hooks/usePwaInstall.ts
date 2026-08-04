import { useCallback, useEffect, useState } from 'react';
import {
  dismissInstallBanner,
  getInstallBannerSubtitle,
  getInstallMode,
  isInstalled,
  runInstallFlow,
  shouldShowInstallBanner,
  showInstallPrompt,
  subscribeInstallPrompt,
  type InstallMode,
} from '../services/pwa/installPrompt';

const INTERACTIONS_REQUIRED = 3;
const BANNER_DELAY_MS = 2000;

/**
 * Hook for PWA install banner state and actions.
 */
export function usePwaInstall() {
  const [installMode, setInstallMode] = useState<InstallMode>(() => getInstallMode());
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const refresh = useCallback(() => {
    setInstallMode(getInstallMode());
  }, []);

  useEffect(() => {
    return subscribeInstallPrompt(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!shouldShowInstallBanner()) return;

    let interactions = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const track = () => {
      interactions += 1;
      if (interactions >= INTERACTIONS_REQUIRED) {
        document.removeEventListener('click', track);
        timer = setTimeout(() => {
          if (shouldShowInstallBanner()) setVisible(true);
        }, BANNER_DELAY_MS);
      }
    };

    document.addEventListener('click', track);
    return () => {
      document.removeEventListener('click', track);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const mode = getInstallMode();
    if (mode === 'android_prompt' || mode === 'desktop_prompt') {
      const r = await showInstallPrompt();
      if (r.outcome === 'accepted' || r.outcome === 'dismissed') {
        setVisible(false);
      }
      if (r.outcome === 'unavailable') {
        setGuideOpen(true);
      }
      return;
    }
    setGuideOpen(true);
  }, []);

  const handleGuide = useCallback(() => {
    setGuideOpen(true);
  }, []);

  const handleDismiss = useCallback(() => {
    dismissInstallBanner();
    setVisible(false);
  }, []);

  const handleRunFlow = useCallback(async () => {
    const r = await runInstallFlow();
    if (r.outcome === 'guide') setGuideOpen(true);
    if (r.outcome === 'accepted') setVisible(false);
    refresh();
  }, [refresh]);

  return {
    visible: visible && !isInstalled(),
    installMode,
    subtitle: getInstallBannerSubtitle(installMode),
    showInstallButton: installMode === 'android_prompt' || installMode === 'desktop_prompt',
    guideOpen,
    setGuideOpen,
    handleInstall,
    handleGuide,
    handleDismiss,
    handleRunFlow,
    isInstalled: isInstalled(),
  };
}
