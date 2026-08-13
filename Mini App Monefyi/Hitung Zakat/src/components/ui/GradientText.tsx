'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'green' | 'gold';
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

export function GradientText({
  children,
  variant = 'green',
  className,
  as: Component = 'span',
}: GradientTextProps) {
  const variants = {
    green: 'from-green-400 to-emerald-500',
    gold: 'from-amber-400 to-amber-500',
  };

  return (
    <Component
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        variants[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}
