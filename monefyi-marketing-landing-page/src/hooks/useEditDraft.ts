import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useEditDraft() {
  // Permanent storage (Source of Truth)
  const [savedSettings, setSavedSettings] = useLocalStorage<any>('monefyi_lp_draft_v2', {});
  
  // Current session's draft
  const [draft, setDraft] = useState<any>(savedSettings);
  
  // History stack for Undo/Redo
  const [history, setHistory] = useState<any[]>([savedSettings]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(savedSettings);
  }, [draft, savedSettings]);

  const changeCount = useMemo(() => {
    const draftKeys = Object.keys(draft);
    const savedKeys = Object.keys(savedSettings);
    let count = 0;
    
    // Count modified or added keys
    draftKeys.forEach(key => {
      if (draft[key] !== savedSettings[key]) count++;
    });
    
    return count;
  }, [draft, savedSettings]);

  const updateDraft = useCallback((id: string, value: string) => {
    setDraft((prev: any) => {
      const next = { ...prev, [id]: value };
      
      // Update history
      const newHistory = history.slice(0, currentIndex + 1);
      newHistory.push(next);
      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);
      
      return next;
    });
  }, [history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const prev = history[currentIndex - 1];
      setDraft(prev);
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const next = history[currentIndex + 1];
      setDraft(next);
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history]);

  const save = useCallback(() => {
    setSavedSettings(draft);
    alert('Perubahan berhasil disimpan secara permanen!');
  }, [draft, setSavedSettings]);

  const discard = useCallback(() => {
    if (confirm('Batalkan semua perubahan di sesi ini?')) {
      setDraft(savedSettings);
      setHistory([savedSettings]);
      setCurrentIndex(0);
    }
  }, [savedSettings]);

  const resetToDefault = useCallback(() => {
    if (confirm('Hapus semua perubahan dan kembali ke setelan awal pabrik?')) {
      setDraft({});
      setSavedSettings({});
      setHistory([{}]);
      setCurrentIndex(0);
      window.location.reload();
    }
  }, [setSavedSettings]);

  return {
    draft,
    hasChanges,
    changeCount,
    updateDraft,
    undo,
    redo,
    save,
    discard,
    resetToDefault,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
}
