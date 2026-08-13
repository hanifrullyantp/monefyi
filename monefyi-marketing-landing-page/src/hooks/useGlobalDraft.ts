import { useLandingCms } from '../context/LandingCmsContext';
import { useAdminMode } from './useAdminMode';

/** Inline text draft — local until Simpan sends full payload to Supabase. */
export function useGlobalDraft() {
  const cms = useLandingCms();
  const isAdmin = useAdminMode();

  return {
    draft: cms.textOverrides,
    hasChanges: cms.hasDraftChanges,
    changeCount: cms.changeCount,
    updateDraft: cms.updateTextOverride,
    undo: cms.undo,
    redo: cms.redo,
    save: async () => {
      if (!isAdmin) return;
      const result = await cms.saveToSupabase();
      if (result.ok) return;
      alert(result.error || 'Gagal menyimpan');
    },
    discard: () => {
      if (confirm('Batalkan semua perubahan draft?')) cms.discardDraft();
    },
    canUndo: cms.canUndo,
    canRedo: cms.canRedo,
  };
}

/** @deprecated Use useGlobalDraft — unified with LandingCmsContext */
export function useEditDraft() {
  const cms = useLandingCms();
  const global = useGlobalDraft();

  return {
    ...global,
    resetToDefault: () => cms.resetDraft(),
  };
}
