import React from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 cursor-pointer select-none';

  const variants = {
    primary: 'bg-gradient-to-br from-green-500 to-green-700 text-white shadow-green-glow hover:scale-[1.03] hover:shadow-green-glow-lg active:scale-[0.97]',
    secondary: 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:scale-[1.02] active:scale-[0.98]',
    outline: 'border border-green-500/50 text-green-400 hover:bg-green-500/10 hover:border-green-400 hover:scale-[1.02] active:scale-[0.98]',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5 active:scale-[0.98]',
    danger: 'bg-gradient-to-br from-red-500 to-red-700 text-white hover:scale-[1.03] active:scale-[0.97]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
    xl: 'px-10 py-5 text-lg',
  };

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-60 cursor-not-allowed hover:scale-100',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
