'use client';

import { cn } from '@/lib/utils';

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Toggle({ options, value, onChange, className }: ToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex p-1 bg-green-950/50 border border-green-500/20 rounded-2xl',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-xl transition-all',
            value === option.value
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
              : 'text-green-100/70 hover:text-white'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
