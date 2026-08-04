import { memo } from 'react';
import { cn } from '../../../utils/cn';
import { getRoomStatusConfig } from '../../../utils/roomStatus';
import type { TimelineRoomRowData } from '../../../hooks/useTimelineData';
import BookingBar, { TIMELINE_CELL_WIDTH } from './BookingBar';

export interface TimelineRowProps {
  row: TimelineRoomRowData;
  dates: Date[];
  onBookingClick?: (segment: TimelineRoomRowData['segments'][0]) => void;
  onEmptyCellClick?: (roomId: string, date: Date) => void;
}

function TimelineRowComponent({
  row,
  dates,
  onBookingClick,
  onEmptyCellClick,
}: TimelineRowProps) {
  const statusConfig = getRoomStatusConfig(row.room.status);
  const gridWidth = dates.length * TIMELINE_CELL_WIDTH;

  return (
    <div
      className="flex border-b border-gray-100 group"
      data-testid={`timeline-row-${row.room.number}`}
    >
      <div className="sticky left-0 z-20 w-36 shrink-0 border-r border-gray-200 bg-white p-3 group-hover:bg-gray-50">
        <p className="font-bold text-gray-900">{row.room.number}</p>
        <p className="truncate text-[10px] font-semibold uppercase text-gray-500">
          {row.room.roomTypeName}
        </p>
        <span
          className={cn(
            'mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
            statusConfig.colors.bgClass,
            statusConfig.colors.textClass
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      <div
        className="relative h-14 shrink-0 overflow-visible"
        style={{ width: gridWidth, minWidth: gridWidth }}
      >
        {dates.map((date, i) => (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onEmptyCellClick?.(row.room.id, date)}
            className="absolute top-0 h-full border-r border-gray-50 hover:bg-emerald-50/40"
            style={{
              left: i * TIMELINE_CELL_WIDTH,
              width: TIMELINE_CELL_WIDTH,
            }}
            aria-label={`Kamar ${row.room.number} ${date.toDateString()}`}
          />
        ))}

        {row.segments.map((segment) => (
          <BookingBar
            key={`${segment.booking.id}-${segment.startOffset}`}
            segment={segment}
            onClick={onBookingClick}
          />
        ))}
      </div>
    </div>
  );
}

const TimelineRow = memo(TimelineRowComponent);
export default TimelineRow;
