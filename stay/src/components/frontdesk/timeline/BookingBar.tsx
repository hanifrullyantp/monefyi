import { memo } from 'react';
import { cn } from '../../../utils/cn';
import type { TimelineBookingSegment } from '../../../hooks/useTimelineData';

const CELL_WIDTH = 96;

const VARIANT_STYLES: Record<
  TimelineBookingSegment['variant'],
  { bar: string; stripe?: boolean }
> = {
  paid: { bar: 'bg-emerald-500 text-white border-emerald-600' },
  checked_in: { bar: 'bg-emerald-600 text-white border-emerald-700' },
  unpaid: {
    bar: 'bg-amber-100 text-amber-900 border-amber-400',
    stripe: true,
  },
  reserved: { bar: 'bg-blue-500 text-white border-blue-600' },
  past: { bar: 'bg-gray-300 text-gray-700 border-gray-400' },
};

export interface BookingBarProps {
  segment: TimelineBookingSegment;
  onClick?: (segment: TimelineBookingSegment) => void;
}

function BookingBarComponent({ segment, onClick }: BookingBarProps) {
  const style = VARIANT_STYLES[segment.variant];
  const width = segment.spanDays * CELL_WIDTH - 8;

  return (
    <button
      type="button"
      onClick={() => onClick?.(segment)}
      style={{
        left: segment.startOffset * CELL_WIDTH + 4,
        width: Math.max(width, CELL_WIDTH - 8),
      }}
      className={cn(
        'absolute top-2 z-10 flex h-10 flex-col justify-center rounded-lg border px-2 text-left shadow-sm',
        'transition-transform hover:scale-[1.02] active:scale-[0.98]',
        style.bar,
        style.stripe &&
          'bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_8px,#fde68a_8px,#fde68a_16px)]'
      )}
      title={`${segment.guestName} · ${segment.booking.bookingCode}`}
      data-testid={`booking-bar-${segment.booking.id}`}
    >
      <span className="truncate text-[10px] font-bold leading-none">
        {segment.guestName}
      </span>
      <span className="mt-0.5 truncate text-[9px] opacity-80">
        {segment.booking.bookingCode}
      </span>
    </button>
  );
}

const BookingBar = memo(BookingBarComponent);
export default BookingBar;
export { CELL_WIDTH as TIMELINE_CELL_WIDTH };
