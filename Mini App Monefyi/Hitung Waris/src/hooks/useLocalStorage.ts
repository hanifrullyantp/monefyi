"use client";

import { useState, useEffect, useCallback } from "react";
import { getItem, setItem } from "@/lib/localStorage";

/**
 * Hook untuk localStorage yang aman dari SSR error
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const item = getItem<T>(key);
    if (item !== null) {
      setStoredValue(item);
    }
  }, [key]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(prev)
            : value;
        if (isClient) {
          setItem(key, nextValue);
        }
        return nextValue;
      });
    },
    [key, isClient]
  );

  return [storedValue, setValue];
}
