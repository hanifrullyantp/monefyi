import { useCallback, useRef, useState } from 'react';
import type { EstimationFormDraft } from '../types/estimator';

const MAX_HISTORY = 40;

export function cloneEstimationDraft(d: EstimationFormDraft): EstimationFormDraft {
  return JSON.parse(JSON.stringify({
    ...d,
    images: d.images.map(img => ({ ...img, pendingFile: undefined })),
  })) as EstimationFormDraft;
}

export function useEstimationDraftHistory() {
  const pastRef = useRef<EstimationFormDraft[]>([]);
  const futureRef = useRef<EstimationFormDraft[]>([]);
  const savedRef = useRef<EstimationFormDraft | null>(null);
  const [tick, setTick] = useState(0);

  const bump = () => setTick(t => t + 1);

  const setSavedSnapshot = useCallback((draft: EstimationFormDraft | null) => {
    savedRef.current = draft ? cloneEstimationDraft(draft) : null;
    bump();
  }, []);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    bump();
  }, []);

  const recordBeforeChange = useCallback((current: EstimationFormDraft) => {
    pastRef.current.push(cloneEstimationDraft(current));
    if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
    futureRef.current = [];
    bump();
  }, []);

  const undo = useCallback((current: EstimationFormDraft | null): EstimationFormDraft | null => {
    if (!current || pastRef.current.length === 0) return null;
    futureRef.current.unshift(cloneEstimationDraft(current));
    const prev = pastRef.current.pop()!;
    bump();
    return prev;
  }, []);

  const redo = useCallback((current: EstimationFormDraft | null): EstimationFormDraft | null => {
    if (!current || futureRef.current.length === 0) return null;
    pastRef.current.push(cloneEstimationDraft(current));
    const next = futureRef.current.shift()!;
    bump();
    return next;
  }, []);

  const revertToSaved = useCallback((): EstimationFormDraft | null => {
    if (!savedRef.current) return null;
    pastRef.current = [];
    futureRef.current = [];
    bump();
    return cloneEstimationDraft(savedRef.current);
  }, []);

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const canDiscard = savedRef.current !== null;

  void tick;

  return {
    recordBeforeChange,
    undo,
    redo,
    revertToSaved,
    setSavedSnapshot,
    resetHistory,
    canUndo,
    canRedo,
    canDiscard,
  };
}
