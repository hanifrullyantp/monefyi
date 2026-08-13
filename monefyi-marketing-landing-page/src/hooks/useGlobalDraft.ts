import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Singleton-like state for draft
let globalDraft: any = null;
let listeners: any[] = [];

function notify() {
  listeners.forEach(l => l(globalDraft));
}

export function useGlobalDraft() {
  const [savedSettings, setSavedSettings] = useLocalStorage<any>('monefyi_lp_draft_v2', {});
  const [localDraft, setLocalDraft] = useState(globalDraft || savedSettings);

  if (!globalDraft) globalDraft = savedSettings;

  const [history, setHistory] = useState<any[]>([savedSettings]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handler = (newDraft: any) => setLocalDraft(newDraft);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter(l => l !== handler);
    };
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify(localDraft) !== JSON.stringify(savedSettings);
  }, [localDraft, savedSettings]);

  const changeCount = useMemo(() => {
    let count = 0;
    Object.keys(localDraft).forEach(key => {
      if (localDraft[key] !== savedSettings[key]) count++;
    });
    return count;
  }, [localDraft, savedSettings]);

  const updateDraft = useCallback((id: string, value: string) => {
    const next = { ...localDraft, [id]: value };
    globalDraft = next;
    
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(next);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    
    notify();
  }, [localDraft, history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const next = history[currentIndex - 1];
      globalDraft = next;
      setCurrentIndex(currentIndex - 1);
      notify();
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const next = history[currentIndex + 1];
      globalDraft = next;
      setCurrentIndex(currentIndex + 1);
      notify();
    }
  }, [currentIndex, history]);

  const save = useCallback(() => {
    setSavedSettings(localDraft);
    alert('Perubahan disimpan!');
  }, [localDraft, setSavedSettings]);

  const discard = useCallback(() => {
    globalDraft = savedSettings;
    setHistory([savedSettings]);
    setCurrentIndex(0);
    notify();
  }, [savedSettings]);

  return {
    draft: localDraft,
    hasChanges,
    changeCount,
    updateDraft,
    undo,
    redo,
    save,
    discard,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
}

import { useEffect } from 'react';
