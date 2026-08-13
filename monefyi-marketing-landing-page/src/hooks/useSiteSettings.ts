import { useCallback, useEffect, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { SiteSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/initial-site-settings';
import { mergeSiteSettings } from '../lib/merge-site-settings';

export { INITIAL_SETTINGS } from '../data/initial-site-settings';

export function useSiteSettings() {
  const [savedSettings, setSavedSettings] = useLocalStorage<SiteSettings>('monefyi_v6_settings', INITIAL_SETTINGS);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('monefyi_v6_settings');
        if (raw) setSavedSettings(JSON.parse(raw));
      } catch {
        /* ignore corrupt storage */
      }
    };
    window.addEventListener('monefyi:leads-updated', sync);
    return () => window.removeEventListener('monefyi:leads-updated', sync);
  }, [setSavedSettings]);

  const settings = useMemo(() => mergeSiteSettings(savedSettings), [savedSettings]);

  const hasChanges = false;

  const save = useCallback(() => {
    /* persisted via setSettings */
  }, []);

  const reset = useCallback(() => {
    if (confirm('Hapus semua perubahan landing CMS?')) {
      setSavedSettings(INITIAL_SETTINGS);
      window.location.reload();
    }
  }, [setSavedSettings]);

  const getOrderedSections = useCallback(() => {
    const sections = settings.sections || INITIAL_SETTINGS.sections;
    return [...sections].sort((a, b) => a.order - b.order);
  }, [settings.sections]);

  const setSettings = useCallback((val: SiteSettings) => {
    setSavedSettings(val);
  }, [setSavedSettings]);

  return {
    settings,
    savedSettings,
    setSettings,
    save,
    reset,
    getOrderedSections,
    hasChanges,
  };
}
