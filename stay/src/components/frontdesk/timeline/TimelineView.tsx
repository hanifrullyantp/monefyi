import { useMemo } from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { useAppStore } from '../../../store/appStore';
import { useTimelineNavigation } from '../../../hooks/useTimelineNavigation';
import { useTimelineData } from '../../../hooks/useTimelineData';
import type { RoomCardData } from '../../../types/frontdesk.types';
import { cn } from '../../../utils/cn';
import TimelineRow from './TimelineRow';
import { TIMELINE_CELL_WIDTH } from './BookingBar';

export interface FrontDeskTimelineViewProps {
  rooms: RoomCardData[];
  loading?: boolean;
  onRoomClick?: (room: RoomCardData) => void;
  onBookingClick?: (bookingId: string, roomId: string) => void;
  onCreateBooking?: (roomId: string, date: Date) => void;
}

const RANGE_OPTIONS = [7, 14, 30] as const;

/**
 * Gantt timeline booking — kamar sebagai baris, tanggal sebagai kolom.
 */
export default function FrontDeskTimelineView({
  rooms,
  loading = false,
  onBookingClick,
  onCreateBooking,
}: FrontDeskTimelineViewProps) {
  const { bookings } = useAppStore();
  const nav = useTimelineNavigation(14);

  const { rows, daySummaries } = useTimelineData({
    rooms,
    bookings,
    rangeStart: nav.rangeStart,
    rangeEnd: nav.rangeEnd,
  });

  const gridWidth = nav.dates.length * TIMELINE_CELL_WIDTH;
  const todayLeft =
    nav.todayIndex >= 0 ? nav.todayIndex * TIMELINE_CELL_WIDTH + TIMELINE_CELL_WIDTH / 2 : null;

  const hasBookings = useMemo(
    () => bookings.some((b) => b.status !== 'cancelled'),
    [bookings]
  );

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center"
        data-testid="timeline-empty-rooms"
      >
        <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-bold text-gray-900">Belum Ada Kamar</h3>
        <p className="mt-1 text-sm text-gray-500">
          Tambahkan kamar terlebih dahulu untuk melihat timeline booking.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="frontdesk-timeline-view"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={nav.goPrevious}
            className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-100"
            aria-label="Periode sebelumnya"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={nav.goToday}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={nav.goNext}
            className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-100"
            aria-label="Periode berikutnya"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
          <input
            type="date"
            onChange={(e) => {
              if (e.target.value) nav.goToDate(new Date(e.target.value));
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700"
            aria-label="Lompat ke tanggal"
          />
        </div>

        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => nav.setViewRange(range)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-bold transition-colors',
                nav.viewRange === range
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {range} hari
            </button>
          ))}
        </div>
      </div>

      {!hasBookings && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          Belum ada booking — klik sel kosong di timeline untuk membuat booking baru.
        </div>
      )}

      {/* Scroll container */}
      <div className="relative max-h-[calc(100vh-420px)] overflow-auto">
        {/* Header dates */}
        <div className="sticky top-0 z-30 flex border-b border-gray-200 bg-white">
          <div className="sticky left-0 z-40 w-36 shrink-0 border-r border-gray-200 bg-gray-50 p-3">
            <span className="text-[10px] font-bold uppercase text-gray-500">Kamar</span>
          </div>
          <div className="relative shrink-0" style={{ width: gridWidth }}>
            {todayLeft != null && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 bg-red-500"
                style={{ left: todayLeft }}
                aria-hidden
              />
            )}
            <div className="flex">
              {nav.dates.map((date, i) => {
                const summary = daySummaries[i];
                const isToday = i === nav.todayIndex;
                return (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'shrink-0 border-r border-gray-100 p-2 text-center',
                      isToday && 'bg-red-50'
                    )}
                    style={{ width: TIMELINE_CELL_WIDTH }}
                  >
                    <p className="text-[10px] font-bold uppercase text-gray-400">
                      {format(date, 'EEE', { locale: localeId })}
                    </p>
                    <p
                      className={cn(
                        'text-sm font-black',
                        isToday ? 'text-red-600' : 'text-gray-800'
                      )}
                    >
                      {format(date, 'dd MMM', { locale: localeId })}
                    </p>
                    {summary && (
                      <p className="text-[9px] text-gray-400">{summary.occupancyRate}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rows */}
        <div className="relative min-w-max">
          {todayLeft != null && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-red-500/70"
              style={{ left: 144 + todayLeft }}
              aria-hidden
            />
          )}
          {rows.map((row) => (
            <TimelineRow
              key={row.room.id}
              row={row}
              dates={nav.dates}
              onBookingClick={(seg) =>
                onBookingClick?.(seg.booking.id, row.room.id)
              }
              onEmptyCellClick={(roomId, date) => onCreateBooking?.(roomId, date)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
