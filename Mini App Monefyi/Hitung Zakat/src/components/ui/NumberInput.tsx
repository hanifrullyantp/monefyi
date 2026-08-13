'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, hint, error, suffix, value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value) || 0;
      onChange(parsed);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-green-100 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="number"
            inputMode="decimal"
            value={value || ''}
            onChange={handleChange}
            className={cn(
              'w-full px-4 py-3.5 bg-green-950/30 border-2 border-green-500/20',
              'focus:border-green-500 focus:bg-green-950/50',
              'rounded-2xl text-white placeholder:text-green-100/40',
              'outline-none transition-all',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              suffix && 'pr-16',
              error && 'border-red-500/50 focus:border-red-500',
              className
            )}
            placeholder="0"
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

NumberInput.displayName = 'NumberInput';
