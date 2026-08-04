import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import RoomCardProgress from '../RoomCardProgress';
import type { RoomCardBookingSummary } from '../../../types/frontdesk.types';

export interface StayTimelineProps {
  booking: RoomCardBookingSummary;
  progress?: number;
  remainingLabel: string;
}

export default function StayTimeline({
  booking,
  progress = 0,
  remainingLabel,
}: StayTimelineProps) {
  const checkInLabel = format(parseISO(booking.checkIn), 'dd MMM · HH:mm', {
    locale: localeId,
  });
  const checkOutLabel = format(parseISO(booking.checkOut), 'dd MMM · 12:00', {
    locale: localeId,
  });

  return (
    <section className="space-y-4" aria-labelledby="stay-timeline-heading">
      <h3 id="stay-timeline-heading" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Timeline Menginap
      </h3>

      <div className="relative flex items-center justify-between px-2">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-gray-400">Check-in</p>
          <p className="text-sm font-bold text-gray-900">{checkInLabel}</p>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            Sekarang
          </span>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-gray-400">Check-out</p>
          <p className="text-sm font-bold text-gray-900">{checkOutLabel}</p>
        </div>
      </div>

      <RoomCardProgress
        checkIn={booking.checkIn}
        checkOut={booking.checkOut}
        showLabel
      />

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-emerald-700">{remainingLabel}</span>
        <span className="text-gray-500">
          {booking.nights} malam · {Math.round(progress)}% selesai
        </span>
      </div>
    </section>
  );
}
