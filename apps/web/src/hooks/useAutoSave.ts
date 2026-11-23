import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  debounceMs?: number;
  onSave: (payload: T) => Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * Debounced auto-save queue. Coalesces rapid edits into one save call.
 */
export function useAutoSave<T>({ debounceMs = 800, onSave, onError }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [changeCount, setChangeCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T | null>(null);
  const savingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSaveRef.current = onSave;
    onErrorRef.current = onError;
  }, [onSave, onError]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savingRef.current || pendingRef.current === null) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    savingRef.current = true;
    setStatus('saving');
    try {
      await onSaveRef.current(payload);
      setChangeCount(0);
      setStatus('saved');
      window.setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Save failed');
      setStatus('error');
      onErrorRef.current?.(err);
    } finally {
      savingRef.current = false;
      if (pendingRef.current !== null) void flush();
    }
  }, []);

  const schedule = useCallback(
    (payload: T) => {
      pendingRef.current = payload;
      setChangeCount(c => c + 1);
      setStatus('pending');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flush();
      }, debounceMs);
    },
    [debounceMs, flush],
  );

  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    setChangeCount(0);
    setStatus('idle');
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { status, changeCount, schedule, flush, discard };
}
