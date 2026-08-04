import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Pencil, Star } from 'lucide-react';

import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';
import { formatCurrency, formatShortDate } from '../../utils/format';
import {
  formatRelativeTimeId,
  getRoomStatusConfig,
} from '../../utils/roomStatus';
import { RoomStatus, type RoomCardData } from '../../types/frontdesk.types';
import { useFrontDeskStore } from '../../stores/frontDeskStore';
import { trackFrontDeskEvent } from '../../utils/frontDeskAnalytics';

import GuestAvatar from './GuestAvatar';
import RoomCardBadge, { resolvePaymentBadgeVariant } from './RoomCardBadge';
import RoomCardProgress from './RoomCardProgress';
import RoomCardInlineEdit from './RoomCardInlineEdit';
import { useAnimationsEnabled } from '../../stores/frontDeskPreferencesStore';

export interface RoomCardProps {
  room: RoomCardData;
  onClick: (room: RoomCardData) => void;
  onSaved?: (message: string) => void;
  editable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    card: 'p-2.5 min-h-[128px] sm:min-h-[148px]',
    number: 'text-3xl sm:text-4xl',
    guest: 'text-xs sm:text-sm',
  },
  md: {
    card: 'p-3 min-h-[160px] sm:min-h-[200px]',
    number: 'text-4xl sm:text-5xl',
    guest: 'text-sm sm:text-base',
  },
  lg: {
    card: 'p-4 min-h-[200px] sm:min-h-[240px]',
    number: 'text-5xl sm:text-6xl',
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
      return room.maintenanceNote ?? room.notes ?? 'Sedang diperbaiki';
    case RoomStatus.UNPAID: {
      const due = booking?.balanceDue ?? 0;
      return due > 0 ? formatCurrency(due) : 'Tagihan belum lunas';
    }
    default:
      return room.notes ?? '';
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
 * Kartu kamar Front Desk — inline edit status & catatan.
 */
export default function RoomCard({
  room,
  onClick,
  onSaved,
  editable = true,
  size = 'md',
  showActions = true,
}: RoomCardProps) {
  const editingRoomId = useFrontDeskStore((s) => s.editingRoomId);
  const setEditingRoomId = useFrontDeskStore((s) => s.setEditingRoomId);
  const isEditing = editingRoomId === room.id;

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
  const animationsEnabled = useAnimationsEnabled();
  const prevStatusRef = useRef(room.status);
  const [statusRipple, setStatusRipple] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current !== room.status) {
      setStatusRipple(true);
      prevStatusRef.current = room.status;
      const t = window.setTimeout(() => setStatusRipple(false), 600);
      return () => clearTimeout(t);
    }
  }, [room.status]);

  const handleCardClick = () => {
    if (isEditing) return;
    onClick(room);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRoomId(room.id);
    trackFrontDeskEvent('room_inline_edit_start', { roomId: room.id });
  };

  const finishEdit = (message: string) => {
    setEditingRoomId(null);
    trackFrontDeskEvent('room_inline_edit_save', { roomId: room.id });
    onSaved?.(message);
  };

  const cancelEdit = () => {
    setEditingRoomId(null);
    trackFrontDeskEvent('room_inline_edit_cancel', { roomId: room.id });
  };

  const motionProps = animationsEnabled
    ? {
        layout: true as const,
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        whileHover: isEditing ? undefined : { scale: 1.02, y: -2 },
        whileTap: isEditing ? undefined : { scale: 0.98 },
        transition: { type: 'spring' as const, stiffness: 400, damping: 28 },
      }
    : {};

  return (
    <motion.div
      {...motionProps}
      className={cn(
        'room-status-ripple h-full',
        statusRipple && animationsEnabled && 'is-updating'
      )}
      data-testid={`room-card-${room.number}`}
      data-status={room.status}
      data-editing={isEditing ? 'true' : 'false'}
    >
      <Card
        onClick={handleCardClick}
        className={cn(
          'relative flex h-full flex-col overflow-hidden border-2 transition-shadow',
          'cursor-pointer hover:shadow-lg dark:bg-slate-900',
          'min-h-[44px] touch-manipulation',
          statusConfig.colors.bgClass,
          statusConfig.colors.borderClass,
          isUrgent && 'animate-pulse-urgent ring-2 ring-coral-400/60 dark:ring-coral-500/50',
          isEditing && 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-emerald-500',
          sizeStyles.card,
          isEditing && 'pb-[7.5rem] sm:pb-[8.5rem]'
        )}
      >
        {editable && (
          <button
            type="button"
            onClick={startEdit}
            className={cn(
              'absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-300',
              isEditing && 'border-emerald-400 text-emerald-600'
            )}
            aria-label={`Edit kamar ${room.number}`}
            title="Edit inline"
            data-testid={`room-edit-${room.number}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {room.ribbon && !isEditing && (
          <div
            className={cn(
              'absolute -right-8 top-3 rotate-45 px-8 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm',
              getRibbonStyle(room.ribbon)
            )}
          >
            {room.ribbon}
          </div>
        )}

        <div className="flex items-start justify-between gap-1.5 pr-6">
          {showGuest && guest ? (
            <GuestAvatar name={guest.name} photoUrl={guest.photoUrl} size={size === 'sm' ? 'sm' : 'md'} />
          ) : (
            <div className={cn(size === 'sm' ? 'h-7 w-7' : 'h-10 w-10')} aria-hidden />
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

        <div className={cn('mt-2 flex flex-1 flex-col sm:mt-3', isEditing && 'opacity-60')}>
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
              'mt-1 line-clamp-2 font-semibold',
              room.status === RoomStatus.UNPAID
                ? 'text-lg text-coral-600 dark:text-coral-400 sm:text-xl'
                : 'text-xs text-slate-600 dark:text-slate-400 sm:text-sm',
              room.status === RoomStatus.AVAILABLE && 'text-sm text-slate-700 dark:text-slate-300 sm:text-base'
            )}
          >
            {contextual}
          </p>
        </div>

        {showActions && !isEditing && (
          <div className="mt-auto space-y-2 pt-2 sm:space-y-3 sm:pt-3">
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
              <div className="flex flex-wrap gap-1">
                {activeIndicators.map((item) => (
                  <span
                    key={item.key}
                    title={item.label}
                    className="flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 text-sm dark:border-slate-600 dark:bg-slate-800/80 sm:h-9 sm:min-w-[36px] sm:text-base"
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

        {isEditing && (
          <RoomCardInlineEdit
            room={room}
            compact={size === 'sm'}
            onDone={finishEdit}
            onCancel={cancelEdit}
          />
        )}
      </Card>
    </motion.div>
  );
}
