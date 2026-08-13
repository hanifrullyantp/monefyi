import { useCallback } from 'react';
import { useLandingCms } from '../context/LandingCmsContext';
import type { SiteSettings } from '../types';

export { INITIAL_SETTINGS } from '../data/initial-site-settings';

export function useSiteSettings() {
  const cms = useLandingCms();

  const reset = () => {
    if (confirm('Reset draft ke versi terakhir disimpan di Supabase?')) {
      cms.discardDraft();
    }
  };

  const save = useCallback(
    (settingsOverride?: SiteSettings) => cms.saveToSupabase(settingsOverride),
    [cms]
  );

  return {
    settings: cms.settings,
    savedSettings: cms.settings,
    setSettings: cms.setSettings,
    save,
    reset,
    getOrderedSections: cms.getOrderedSections,
    hasChanges: cms.hasDraftChanges,
    isReady: cms.isReady,
    isLoading: cms.isLoading,
    isSaving: cms.isSaving,
    saveError: cms.saveError,
  };
}

export type { SiteSettings };
