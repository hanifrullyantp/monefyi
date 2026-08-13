'use client';

import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'gold';
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  hover = false,
}: CardProps) {
  const variants = {
    default: 'border-green-500/20',
    glow: 'border-green-500/30 shadow-lg shadow-green-500/10',
    gold: 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-amber-900/20',
  };

  return (
    <div
      className={cn(
        'relative bg-gradient-to-br from-green-950/50 to-green-900/30',
        'border rounded-3xl p-6 md:p-8',
        variants[variant],
        hover && 'hover:border-green-500/40 transition-all cursor-pointer group',
        className
      )}
    >
      {hover && (
        <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 rounded-3xl transition-colors" />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
