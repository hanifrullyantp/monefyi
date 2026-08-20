"use client";
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ target, duration = 600, className }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const prevTargetRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevTargetRef.current;
    const endValue = target;
    const startTime = performance.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setCount(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevTargetRef.current = endValue;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return <span className={className}>{count}</span>;
}
