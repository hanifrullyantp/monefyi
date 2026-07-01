import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { generateTimelineDays, getMonthGroups, isWeekend } from '../../../lib/gantt/utils';
import type { TimelineRange } from '../../../lib/gantt/types';
import { GANTT_COLORS, HEADER_HEIGHT, PX_PER_DAY } from '../../../lib/gantt/constants';
import type { GanttViewMode } from '../../../lib/gantt/types';

interface TimelineHeaderProps {
  range: TimelineRange;
  viewMode: GanttViewMode;
  scrollLeft: number;
  onScroll: (delta: number) => void;
}

export default function TimelineHeader({ range, viewMode, scrollLeft, onScroll }: TimelineHeaderProps) {
  const pxPerDay = PX_PER_DAY[viewMode];
  const totalWidth = range.rangeDays * pxPerDay;

  const days = useMemo(() => generateTimelineDays(range), [range]);
  const monthGroups = useMemo(() => getMonthGroups(days), [days]);

  const todayOffset = ((Date.now() - range.minDate) / 86400000) * pxPerDay;

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-200" style={{ height: HEADER_HEIGHT }}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 bg-slate-50/80">
        <button type="button" onClick={() => onScroll(-200)} className="p-1 rounded hover:bg-slate-200">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <span className="text-xs font-bold text-slate-600">
          {monthGroups.map(g => g.label).slice(0, 3).join(' · ')}
        </span>
        <button type="button" onClick={() => onScroll(200)} className="p-1 rounded hover:bg-slate-200">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="relative overflow-hidden" style={{ height: HEADER_HEIGHT - 28 }}>
        <div
          className="absolute top-0 flex"
          style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
        >
          {monthGroups.map((group, gi) => (
            <div
              key={gi}
              className="border-r border-slate-200 text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-50 truncate"
              style={{ width: group.span * pxPerDay }}
            >
              {group.label}
            </div>
          ))}
        </div>

        <div
          className="absolute bottom-0 flex"
          style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)`, height: 20 }}
        >
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            const weekend = isWeekend(d);
            const showLabel = viewMode === 'day' || (viewMode === 'week' && d.getDay() === 1) || (viewMode === 'month' && d.getDate() === 1);

            return (
              <div
                key={i}
                className={`border-r text-center text-[9px] flex items-center justify-center ${
                  isToday ? 'bg-rose-50 text-rose-600 font-bold' : weekend ? 'bg-slate-50 text-slate-400' : 'text-slate-500'
                }`}
                style={{ width: pxPerDay, borderColor: GANTT_COLORS.grid }}
              >
                {showLabel ? d.getDate() : viewMode === 'day' ? d.getDate() : ''}
              </div>
            );
          })}
        </div>

        <div
          className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none"
          style={{ left: todayOffset - scrollLeft }}
        >
          <span className="absolute -top-0 left-1 text-[8px] font-bold text-rose-500 bg-white px-0.5 rounded whitespace-nowrap">
            Hari ini
          </span>
        </div>
      </div>
    </div>
  );
}

export { HEADER_HEIGHT };
