import { type ReactNode } from 'react';
import {
  BedDouble,
  CalendarCheck,
  PartyPopper,
  SearchX,
  Sparkles,
} from 'lucide-react';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

export type EmptyStateVariant =
  | 'no-rooms'
  | 'no-bookings'
  | 'no-search-results'
  | 'all-occupied'
  | 'no-urgent';

interface EmptyStateConfig {
  icon: typeof BedDouble;
  title: string;
  description: string;
  emoji?: string;
}

const CONFIG: Record<EmptyStateVariant, EmptyStateConfig> = {
  'no-rooms': {
    icon: BedDouble,
    title: 'Belum Ada Kamar',
    description: 'Tambahkan kamar pertama untuk mulai menerima tamu di front desk.',
    emoji: '🏨',
  },
  'no-bookings': {
    icon: CalendarCheck,
    title: 'Belum Ada Booking',
    description: 'Booking baru akan muncul di sini. Buat booking manual atau tunggu reservasi online.',
    emoji: '📅',
  },
  'no-search-results': {
    icon: SearchX,
    title: 'Tidak Ditemukan',
    description: 'Coba kata kunci lain atau reset filter pencarian.',
    emoji: '🔍',
  },
  'all-occupied': {
    icon: Sparkles,
    title: 'Semua Kamar Terisi!',
    description: 'Okupansi penuh — pertimbangkan upsell atau waitlist untuk tamu walk-in.',
    emoji: '🎉',
  },
  'no-urgent': {
    icon: PartyPopper,
    title: 'Semua Tenang!',
    description: 'Tidak ada aksi urgent saat ini. Kerja bagus, tim!',
    emoji: '✨',
  },
};

export interface EmptyStateProps {
  variant: EmptyStateVariant;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

/**
 * Empty state dengan ilustrasi icon untuk berbagai skenario front desk.
 */
export default function EmptyState({
  variant,
  actionLabel,
  onAction,
  className,
  children,
  'data-testid': testId,
}: EmptyStateProps) {
  const { icon: Icon, title, description, emoji } = CONFIG[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900',
        className
      )}
      data-testid={testId ?? `empty-state-${variant}`}
    >
      <span className="mb-2 text-4xl" aria-hidden>
        {emoji}
      </span>
      <Icon className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden />
      <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {children}
      {actionLabel && onAction && (
        <Button className="mt-6 min-h-[44px] rounded-2xl" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
