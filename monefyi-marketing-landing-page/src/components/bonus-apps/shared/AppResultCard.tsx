import React from 'react';
import { cn } from '../../../lib/cn';
import { AnimatedCounter } from '../../ui/AnimatedCounter';

interface AppResultCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  variant?: 'default' | 'highlight' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function AppResultCard({ label, value, prefix = '', suffix = '', variant = 'default', className }: AppResultCardProps) {
  const variants = {
    default: 'bg-slate-800 border-slate-700',
    highlight: 'bg-blue-500/10 border-blue-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
  };

  const textColors = {
    default: 'text-slate-100',
    highlight: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
  };

  return (
    <div className={cn('p-4 border rounded-2xl flex flex-col', variants[variant], className)}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</span>
      <div className={cn('text-xl font-extrabold', textColors[variant])}>
        <AnimatedCounter end={value} prefix={prefix} suffix={suffix} />
      </div>
    </div>
  );
}
