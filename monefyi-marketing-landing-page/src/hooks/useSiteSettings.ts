import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { SiteSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/initial-site-settings';
import { mergeSiteSettings } from '../lib/merge-site-settings';

export { INITIAL_SETTINGS } from '../data/initial-site-settings';

export function useSiteSettings() {
  const [savedSettings, setSavedSettings] = useLocalStorage<SiteSettings>('monefyi_v6_settings', INITIAL_SETTINGS);

  const settings = mergeSiteSettings(savedSettings);

  const save = useCallback(() => {
    alert('Settings are auto-saved in this version');
  }, []);

  const reset = useCallback(() => {
    if (confirm('Hapus semua perubahan?')) {
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
    hasChanges: false,
  };
}
