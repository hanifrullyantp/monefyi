"use client";

import { useCallback } from "react";

export function useNisbahCalculator() {
  /**
   * Distribute remaining nisbah proportionally when one pihak changes.
   * Returns new array of nisbah values summing to 100.
   */
  const distributeNisbah = useCallback(
    (values: number[], changedIndex: number, newValue: number): number[] => {
      const clamped = Math.min(100, Math.max(0, newValue));
      const others = values.filter((_, i) => i !== changedIndex);
      const sumOthers = others.reduce((s, v) => s + v, 0);

      if (sumOthers === 0) {
        // distribute equally
        const remaining = 100 - clamped;
        const perOther = others.length > 0 ? remaining / others.length : 0;
        return values.map((v, i) =>
          i === changedIndex ? clamped : perOther
        );
      }

      const remaining = 100 - clamped;
      return values.map((v, i) => {
        if (i === changedIndex) return clamped;
        return (v / sumOthers) * remaining;
      });
    },
    []
  );

  /**
   * For 2-pihak slider: when pihak 1 changes, pihak 2 = 100 - pihak1
   */
  const twoPartyNisbah = useCallback(
    (newFirst: number): [number, number] => {
      const clamped = Math.min(99, Math.max(1, newFirst));
      return [clamped, 100 - clamped];
    },
    []
  );

  const validateTotal = useCallback((values: number[]): boolean => {
    const total = values.reduce((s, v) => s + v, 0);
    return Math.abs(total - 100) < 0.01;
  }, []);

  return { distributeNisbah, twoPartyNisbah, validateTotal };
}
