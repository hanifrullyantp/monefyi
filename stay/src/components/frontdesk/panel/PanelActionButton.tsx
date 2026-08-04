import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type PanelActionVariant = 'primary' | 'warning' | 'danger' | 'secondary';

export interface PanelActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: PanelActionVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<PanelActionVariant, string> = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 shadow-sm',
  warning:
    'bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shadow-sm',
  danger: 'bg-red-500 text-white hover:bg-red-600 border-red-600 shadow-sm',
  secondary:
    'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-sm',
};

/**
 * Tombol aksi panel — icon + label + loading state.
 */
export default function PanelActionButton({
  label,
  icon,
  variant = 'secondary',
  loading = false,
  fullWidth = true,
  className,
  disabled,
  ...props
}: PanelActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex min-h-[60px] items-center justify-center gap-2 rounded-xl border px-4 py-3',
        'text-sm font-bold transition-all active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'btn-micro-bounce',
        fullWidth && 'w-full',
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{loading ? 'Memproses...' : label}</span>
    </button>
  );
}
