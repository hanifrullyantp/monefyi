// src/hooks/useCountUp.ts
"use client";

import { useState, useEffect, useRef } from "react";

export function useCountUp(
  target: number,
  duration = 1500,
  enabled = true
): number {
  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    startValueRef.current = 0;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startValueRef.current + eased * (target - startValueRef.current));

      setCurrent(value);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, enabled]);

  return current;
}
