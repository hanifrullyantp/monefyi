import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { getRoomTypeById } from '../../store/appStore';
import { cn } from '../../utils/cn';
import { addDays, format, isWithinInterval, startOfDay, eachDayOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';

interface TimelineViewProps {
  startDate: Date;
  daysCount: number;
  onBookingClick: (booking: any) => void;
}

export default function TimelineView({ startDate, daysCount, onBookingClick }: TimelineViewProps) {
  const { rooms, bookings } = useAppStore();

  const dates = useMemo(() => {
    const end = addDays(startDate, daysCount - 1);
    return eachDayOfInterval({ start: startDate, end });
  }, [startDate, daysCount]);

  const getBookingForRoomAndDate = (roomId: string, date: Date) => {
    return bookings.find(b => {
      if (b.roomId !== roomId || b.status === 'cancelled') return false;
      const start = startOfDay(new Date(b.checkIn));
      const end = startOfDay(new Date(b.checkOut));
      const target = startOfDay(date);
      return isWithinInterval(target, { start, end: addDays(end, -1) });
    });
  };

  const statusColors: Record<string, string> = {
    checked_in: 'bg-rose-500 text-white',
    confirmed: 'bg-sky-500 text-white',
    pending: 'bg-amber-500 text-white',
    checked_out: 'bg-slate-400 text-white',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Timeline Header */}
      <div className="flex border-b border-slate-100 bg-slate-50 sticky top-0 z-20">
        <div className="w-32 flex-shrink-0 p-3 border-r border-slate-100 font-bold text-[10px] uppercase text-slate-400">
          Kamar
        </div>
        <div className="flex flex-1 overflow-x-auto no-scrollbar">
          {dates.map((date, i) => (
            <div key={i} className={cn(
              "flex-shrink-0 w-24 p-2 text-center border-r border-slate-100",
              format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-sky-50" : ""
            )}>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{format(date, 'EEE', { locale: id })}</p>
              <p className="text-sm font-black text-slate-700">{format(date, 'dd MMM')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {rooms.map(room => (
          <div key={room.id} className="flex border-b border-slate-50 group">
            <div className="w-32 flex-shrink-0 p-3 border-r border-slate-100 bg-white group-hover:bg-slate-50 transition-colors">
              <p className="font-bold text-slate-800">{room.number}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold truncate">
                {getRoomTypeById(room.roomTypeId)?.name}
              </p>
            </div>
            <div className="flex flex-1 overflow-x-auto no-scrollbar relative h-14">
              {dates.map((date, i) => {
                const booking = getBookingForRoomAndDate(room.id, date);
                const isStart = booking && format(new Date(booking.checkIn), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                
                return (
                  <div key={i} className="flex-shrink-0 w-24 border-r border-slate-50 relative">
                    {booking && isStart && (
                      <button
                        onClick={() => onBookingClick(booking)}
                        style={{ width: `calc(${booking.nights * 100}% - 8px)` }}
                        className={cn(
                          "absolute top-2 left-1 h-10 z-10 rounded-xl p-2 text-left shadow-sm transition-transform active:scale-95 overflow-hidden",
                          statusColors[booking.status]
                        )}
                      >
                        <p className="text-[10px] font-black uppercase truncate leading-none">{booking.guest?.name}</p>
                        <p className="text-[8px] opacity-80 mt-1 truncate">
                          {booking.bookingCode}
                        </p>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
