import {
  AlertTriangle,
  Brush,
  CircleDollarSign,
  Crown,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type RoomCardBadgeVariant =
  | 'paid'
  | 'unpaid'
  | 'clean'
  | 'dirty'
  | 'vip'
  | 'urgent';

export interface RoomCardBadgeProps {
  variant: RoomCardBadgeVariant;
  className?: string;
  compact?: boolean;
}

const BADGE_CONFIG: Record<
  RoomCardBadgeVariant,
  { label: string; icon: typeof CircleDollarSign; className: string }
> = {
  paid: {
    label: 'LUNAS',
    icon: Sparkles,
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  unpaid: {
    label: 'BELUM BAYAR',
    icon: CircleDollarSign,
    className:
      'bg-coral-100 text-coral-900 border-coral-300 dark:bg-coral-950 dark:text-coral-200 dark:border-coral-800',
  },
  clean: {
    label: 'CLEAN',
    icon: Sparkles,
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  },
  dirty: {
    label: 'DIRTY',
    icon: Brush,
    className:
      'bg-dirty-100 text-dirty-800 border-dirty-300 dark:bg-dirty-950 dark:text-dirty-200 dark:border-dirty-800',
  },
  vip: {
    label: 'VIP',
    icon: Crown,
    className:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:border-violet-800',
  },
  urgent: {
    label: 'URGENT',
    icon: AlertTriangle,
    className:
      'bg-coral-100 text-coral-900 border-coral-400 dark:bg-coral-950 dark:text-coral-200 dark:border-coral-700',
  },
};

/**
 * Badge kecil status pembayaran / kebersihan pada kartu kamar.
 */
export default function RoomCardBadge({
  variant,
  className,
  compact = false,
}: RoomCardBadgeProps) {
  const config = BADGE_CONFIG[variant];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider',
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
        'min-h-[22px]',
        config.className,
        className
      )}
    >
      <Icon className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden />
      {config.label}
    </span>
  );
}

/** Map status kamar ke variant badge header */
export function resolvePaymentBadgeVariant(
  status: string,
  paymentStatus?: string,
  balanceDue?: number
): RoomCardBadgeVariant {
  if (status === 'UNPAID' || (balanceDue != null && balanceDue > 0)) return 'unpaid';
  if (status === 'DIRTY') return 'dirty';
  if (paymentStatus === 'paid') return 'paid';
  if (status === 'AVAILABLE' || status === 'MAINTENANCE') return 'clean';
  return 'paid';
}
