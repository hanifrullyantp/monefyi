"use client";

import { useState, useEffect, useCallback } from "react";
import { loadFromStorage, saveToStorage } from "@/lib/localStorage";

export function useLocalStorage<T>(
  key: string,
  fallback: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    const stored = loadFromStorage<T>(key, fallback);
    setState(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        saveToStorage(key, next);
        return next;
      });
    },
    [key]
  );

  return [state, setValue];
}
