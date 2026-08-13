'use client';

import { cn } from '@/lib/utils';
import { formatRupiahDisplay, parseRupiahInput } from '@/lib/formatters';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface RupiahInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  hint?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
}

export const RupiahInput = forwardRef<HTMLInputElement, RupiahInputProps>(
  ({ label, hint, error, value, onChange, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseRupiahInput(e.target.value);
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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-medium">
            Rp
          </span>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={formatRupiahDisplay(value)}
            onChange={handleChange}
            className={cn(
              'w-full pl-12 pr-4 py-3.5 bg-green-950/30 border-2 border-green-500/20',
              'focus:border-green-500 focus:bg-green-950/50',
              'rounded-2xl text-white placeholder:text-green-100/40',
              'outline-none transition-all',
              error && 'border-red-500/50 focus:border-red-500',
              className
            )}
            placeholder="0"
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="mt-2 text-sm text-green-100/50">{hint}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

RupiahInput.displayName = 'RupiahInput';
