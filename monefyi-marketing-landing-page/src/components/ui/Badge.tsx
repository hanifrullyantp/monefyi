import React from 'react';
import { cn } from '../../lib/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'gold' | 'red' | 'blue' | 'purple' | 'slate' | 'amber' | 'white';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'green', size = 'sm', className }: BadgeProps): React.ReactElement {
  const variants = {
    green: 'bg-green-500/10 text-green-400 border border-green-500/30',
    gold: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    red: 'bg-red-500/10 text-red-400 border border-red-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    slate: 'bg-slate-500/10 text-slate-400 border border-slate-500/30',
    white: 'bg-white/10 text-white border border-white/20',
  };
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}
