import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { generateTimelineDays, getMonthGroups, isWeekend } from '../../../lib/gantt/utils';
import type { TimelineRange } from '../../../lib/gantt/types';
import { GANTT_COLORS, HEADER_HEIGHT, getEffectivePxPerDay } from '../../../lib/gantt/constants';
import type { GanttViewMode } from '../../../lib/gantt/types';

interface TimelineHeaderProps {
  range: TimelineRange;
  viewMode: GanttViewMode;
  zoomScale?: number;
  scrollLeft: number;
  onScroll: (delta: number) => void;
}

export default function TimelineHeader({ range, viewMode, zoomScale = 1, scrollLeft, onScroll }: TimelineHeaderProps) {
  const pxPerDay = getEffectivePxPerDay(viewMode, zoomScale);
  const totalWidth = range.rangeDays * pxPerDay;

  const days = useMemo(() => generateTimelineDays(range), [range]);
  const monthGroups = useMemo(() => getMonthGroups(days), [days]);

  const todayOffset = ((Date.now() - range.minDate) / 86400000) * pxPerDay;

  return (
    <div
      className="sticky top-0 z-20 bg-white border-b border-slate-200 flex flex-col"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="h-5 shrink-0 flex items-center justify-between px-2 border-b border-slate-100 bg-slate-50/80">
        <button
          type="button"
          onClick={() => onScroll(-200)}
          aria-label="Geser timeline ke kiri"
          className="p-0.5 rounded hover:bg-slate-200 shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
        </button>
        <span className="text-[11px] font-bold text-slate-600 truncate min-w-0 px-2">
          {monthGroups.map(g => g.label).slice(0, 3).join(' · ')}
        </span>
        <button
          type="button"
          onClick={() => onScroll(200)}
          aria-label="Geser timeline ke kanan"
          className="p-0.5 rounded hover:bg-slate-200 shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
        <div
          className="h-[17px] shrink-0 overflow-hidden border-b border-slate-100 bg-slate-50"
        >
          <div
            className="flex h-full"
            style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
          >
            {monthGroups.map((group, gi) => {
              const cellWidth = group.span * pxPerDay;
              return (
                <div
                  key={gi}
                  className="shrink-0 h-full border-r border-slate-200 text-[10px] leading-none font-bold text-slate-600 px-1.5 flex items-center truncate overflow-hidden whitespace-nowrap"
                  style={{ width: cellWidth }}
                  title={group.label}
                >
                  {cellWidth >= 20 ? group.label : ''}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-[18px] shrink-0 overflow-hidden">
          <div
            className="flex h-full"
            style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
          >
            {days.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const weekend = isWeekend(d);
              const showLabel =
                viewMode === 'day' ||
                (viewMode === 'week' && d.getDay() === 1 && pxPerDay >= 6) ||
                (viewMode === 'month' && d.getDate() === 1 && pxPerDay >= 10);

              return (
                <div
                  key={i}
                  className={`shrink-0 h-full border-r text-center text-[9px] leading-none flex items-center justify-center overflow-hidden ${
                    isToday
                      ? 'bg-rose-50 text-rose-600 font-bold'
                      : weekend
                        ? 'bg-slate-50 text-slate-400'
                        : 'text-slate-500'
                  }`}
                  style={{ width: pxPerDay, borderColor: GANTT_COLORS.grid }}
                >
                  {showLabel ? d.getDate() : ''}
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none"
          style={{ left: todayOffset - scrollLeft }}
        >
          <span className="absolute bottom-0.5 left-1 text-[8px] leading-none font-bold text-rose-600 bg-white/95 border border-rose-200 px-1 py-0.5 rounded shadow-xs whitespace-nowrap">
            Hari ini
          </span>
        </div>
      </div>
    </div>
  );
}

export { HEADER_HEIGHT };
