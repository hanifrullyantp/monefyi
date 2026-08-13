"use client";

import { useState, useCallback, useEffect } from "react";
import { saveToStorage, loadFromStorage, removeFromStorage } from "@/lib/localStorage";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (val: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loaded = loadFromStorage<T>(key, initialValue);
    setStoredValue(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (val: T) => {
      setStoredValue(val);
      if (mounted) {
        saveToStorage(key, val);
      }
    },
    [key, mounted]
  );

  const clearValue = useCallback(() => {
    setStoredValue(initialValue);
    removeFromStorage(key);
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}
