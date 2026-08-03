import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';
import { formatCurrency, formatShortDate } from '../../utils/format';
import {
  formatRelativeTimeId,
  getRoomStatusConfig,
} from '../../utils/roomStatus';
import { RoomStatus, type RoomCardData } from '../../types/frontdesk.types';

import GuestAvatar from './GuestAvatar';
import RoomCardBadge, { resolvePaymentBadgeVariant } from './RoomCardBadge';
import RoomCardProgress from './RoomCardProgress';

export interface RoomCardProps {
  room: RoomCardData;
  onClick: (room: RoomCardData) => void;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    card: 'p-3 min-h-[180px]',
    number: 'text-4xl',
    guest: 'text-sm',
  },
  md: {
    card: 'p-4 min-h-[240px]',
    number: 'text-5xl',
    guest: 'text-base',
  },
  lg: {
    card: 'p-5 min-h-[280px]',
    number: 'text-6xl',
    guest: 'text-base',
  },
};

const INDICATOR_ICONS = [
  { key: 'unpaid' as const, label: 'Belum bayar', emoji: '💰' },
  { key: 'needsCleaning' as const, label: 'Perlu dibersihkan', emoji: '🧹' },
  { key: 'breakfast' as const, label: 'Sarapan', emoji: '🍳' },
  { key: 'vip' as const, label: 'VIP', emoji: '⭐' },
  { key: 'kids' as const, label: 'Anak', emoji: '👶' },
  { key: 'extended' as const, label: 'Perpanjangan', emoji: '⏰' },
];

function getContextualInfo(room: RoomCardData): string {
  const booking = room.activeBooking ?? room.upcomingBooking;

  switch (room.status) {
    case RoomStatus.OCCUPIED:
      return room.checkoutLabel ?? 'Check-out besok 12:00';
    case RoomStatus.AVAILABLE:
      return `${formatCurrency(room.basePrice)}/malam`;
    case RoomStatus.DIRTY:
      if (room.lastCheckoutAt) {
        return `Checkout ${formatRelativeTimeId(room.lastCheckoutAt)}`;
      }
      return 'Menunggu housekeeping';
    case RoomStatus.RESERVED:
      if (booking?.checkIn) {
        return `Datang ${format(parseISO(booking.checkIn), 'dd MMM · HH:mm', { locale: localeId })}`;
      }
      return 'Booking menunggu check-in';
    case RoomStatus.MAINTENANCE:
      return room.maintenanceNote ?? 'Sedang diperbaiki';
    case RoomStatus.UNPAID: {
      const due = booking?.balanceDue ?? 0;
      return due > 0 ? formatCurrency(due) : 'Tagihan belum lunas';
    }
    default:
      return '';
  }
}

function getRibbonStyle(ribbon: RoomCardData['ribbon']) {
  switch (ribbon) {
    case 'VIP':
      return 'bg-violet-600 text-white';
    case 'BARU':
      return 'bg-blue-600 text-white';
    case 'URGENT':
      return 'bg-coral-600 text-white';
    default:
      return '';
  }
}

function shouldShowGuest(room: RoomCardData): boolean {
  return (
    room.status === RoomStatus.OCCUPIED ||
    room.status === RoomStatus.RESERVED ||
    room.status === RoomStatus.UNPAID
  );
}

function getActiveIndicators(room: RoomCardData) {
  const indicators = room.indicators ?? {};
  return INDICATOR_ICONS.filter((item) => indicators[item.key]).slice(0, 4);
}

/**
 * Kartu kamar utama Front Desk — kaya informasi dengan animasi status.
 */
export default function RoomCard({
  room,
  onClick,
  size = 'md',
  showActions = true,
}: RoomCardProps) {
  const statusConfig = getRoomStatusConfig(room.status);
  const sizeStyles = SIZE_CONFIG[size];
  const guest = room.activeBooking?.guest ?? room.upcomingBooking?.guest;
  const booking = room.activeBooking ?? room.upcomingBooking;
  const contextual = getContextualInfo(room);
  const badgeVariant = resolvePaymentBadgeVariant(
    room.status,
    booking?.paymentStatus,
    booking?.balanceDue
  );
  const showGuest = shouldShowGuest(room) && guest;
  const activeIndicators = getActiveIndicators(room);
  const isUrgent = room.shouldPulse;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="h-full"
      data-testid={`room-card-${room.number}`}
      data-status={room.status}
    >
      <Card
        onClick={() => onClick(room)}
        className={cn(
          'relative flex h-full flex-col overflow-hidden border-2 transition-shadow',
          'cursor-pointer hover:shadow-lg dark:bg-slate-900',
          'min-h-[44px] touch-manipulation',
          statusConfig.colors.bgClass,
          statusConfig.colors.borderClass,
          isUrgent && 'animate-pulse-urgent ring-2 ring-coral-400/60 dark:ring-coral-500/50',
          sizeStyles.card
        )}
      >
        {room.ribbon && (
          <div
            className={cn(
              'absolute -right-8 top-3 rotate-45 px-8 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm',
              getRibbonStyle(room.ribbon)
            )}
          >
            {room.ribbon}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          {showGuest && guest ? (
            <GuestAvatar name={guest.name} photoUrl={guest.photoUrl} size="md" />
          ) : (
            <div className="h-10 w-10" aria-hidden />
          )}

          <RoomCardBadge
            variant={
              room.status === RoomStatus.UNPAID
                ? 'unpaid'
                : room.status === RoomStatus.DIRTY
                  ? 'dirty'
                  : badgeVariant
            }
            compact={size === 'sm'}
          />
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          <p
            className={cn(
              'font-black leading-none tracking-tighter',
              sizeStyles.number,
              statusConfig.colors.textClass,
              'dark:text-slate-100'
            )}
          >
            {room.number}
          </p>

          <Badge
            variant="gray"
            className={cn(
              'mt-2 w-fit text-[10px] dark:bg-slate-800 dark:text-slate-300',
              statusConfig.colors.bgClass
            )}
          >
            {room.roomTypeName}
          </Badge>

          {showGuest && guest && (
            <p
              className={cn(
                'mt-2 truncate font-medium text-slate-800 dark:text-slate-100',
                sizeStyles.guest
              )}
            >
              {guest.name}
            </p>
          )}

          <p
            className={cn(
              'mt-1 font-semibold',
              room.status === RoomStatus.UNPAID
                ? 'text-xl text-coral-600 dark:text-coral-400'
                : 'text-sm text-slate-600 dark:text-slate-400',
              room.status === RoomStatus.AVAILABLE && 'text-base text-slate-700 dark:text-slate-300'
            )}
          >
            {contextual}
          </p>
        </div>

        {showActions && (
          <div className="mt-auto space-y-3 pt-4">
            {(room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.UNPAID) &&
              room.activeBooking && (
                <>
                  <RoomCardProgress
                    checkIn={room.activeBooking.checkIn}
                    checkOut={room.activeBooking.checkOut}
                    showLabel={size !== 'sm'}
                  />
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>{formatShortDate(room.activeBooking.checkIn)}</span>
                    <span className="text-slate-300 dark:text-slate-600">↔</span>
                    <span>{formatShortDate(room.activeBooking.checkOut)}</span>
                  </div>
                </>
              )}

            {room.status === RoomStatus.RESERVED && room.upcomingBooking && (
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>{formatShortDate(room.upcomingBooking.checkIn)}</span>
                <span className="text-slate-300 dark:text-slate-600">↔</span>
                <span>{formatShortDate(room.upcomingBooking.checkOut)}</span>
              </div>
            )}

            {activeIndicators.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeIndicators.map((item) => (
                  <span
                    key={item.key}
                    title={item.label}
                    className="flex h-11 min-w-[44px] items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-base dark:border-slate-600 dark:bg-slate-800/80"
                    aria-label={item.label}
                  >
                    <span aria-hidden>{item.emoji}</span>
                  </span>
                ))}
              </div>
            )}

            {room.status === RoomStatus.MAINTENANCE && (
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-mist-700 dark:text-indigo-mist-300">
                <Star className="h-3 w-3" />
                Lantai {room.floor}
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
