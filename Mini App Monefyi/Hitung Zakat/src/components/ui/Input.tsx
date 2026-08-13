'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefix, suffix, className, onChange, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-green-100 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-medium">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-3.5 bg-green-950/30 border-2 border-green-500/20',
              'focus:border-green-500 focus:bg-green-950/50',
              'rounded-2xl text-white placeholder:text-green-100/40',
              'outline-none transition-all',
              prefix && 'pl-12',
              suffix && 'pr-16',
              error && 'border-red-500/50 focus:border-red-500',
              className
            )}
            onChange={(e) => onChange?.(e.target.value)}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400/70 text-sm">
              {suffix}
            </span>
          )}
        </div>
        {hint && !error && (
          <p className="mt-2 text-sm text-green-100/50">{hint}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
