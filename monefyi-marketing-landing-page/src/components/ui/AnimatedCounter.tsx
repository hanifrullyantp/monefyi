import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';
import { useInView } from '../../hooks/useInView';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ end, prefix = '', suffix = '', decimals = 0, duration = 1500, className }: AnimatedCounterProps): React.ReactElement {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.5 });
  const value = useCountUp({ end, decimals, duration, enabled: inView });

  const formatted = decimals > 0
    ? value.toFixed(decimals)
    : new Intl.NumberFormat('id-ID').format(Math.round(value));

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
