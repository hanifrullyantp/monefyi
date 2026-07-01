import { useCallback, useRef, useState } from 'react';
import { useGanttStore } from '../../../store/ganttStore';
import { addDays, getBarStyle } from '../../../lib/gantt/utils';
import type { FlatGanttRow, GanttDragState } from '../../../lib/gantt/types';
import { MIN_BAR_WIDTH, ROW_HEIGHT } from '../../../lib/gantt/constants';
import { PX_PER_DAY } from '../../../lib/gantt/constants';
import type { TimelineRange } from '../../../lib/gantt/types';

interface GanttTaskBarProps {
  row: FlatGanttRow;
  range: TimelineRange;
  onSaveDates: (id: string, start: string, end: string) => void;
  onStartDependency: (fromId: string, x: number, y: number) => void;
  onOpenEdit?: (taskId: string) => void;
}

export default function GanttTaskBar({ row, range, onSaveDates, onStartDependency, onOpenEdit }: GanttTaskBarProps) {
  const { task, depth } = row;
  const { viewMode, selectedIds, selectTask, setDrag } = useGanttStore();
  const isSelected = selectedIds.has(task.id);
  const { left, width, color } = getBarStyle(task, range, viewMode, isSelected);
  const [hovered, setHovered] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const pxPerDay = PX_PER_DAY[viewMode];

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: GanttDragState['mode']) => {
      e.stopPropagation();
      e.preventDefault();
      setDrag({
        taskId: task.id,
        mode,
        startX: e.clientX,
        origStart: task.startDate,
        origEnd: task.endDate,
      });

      const origStart = task.startDate;
      const origEnd = task.endDate;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - e.clientX;
        const daysDelta = Math.round(dx / pxPerDay);

        if (mode === 'move') {
          useGanttStore.getState().updateTask(task.id, {
            startDate: addDays(origStart, daysDelta),
            endDate: addDays(origEnd, daysDelta),
          });
        } else if (mode === 'resize-start') {
          const newStart = addDays(origStart, daysDelta);
          if (new Date(newStart) <= new Date(origEnd)) {
            useGanttStore.getState().updateTask(task.id, { startDate: newStart });
          }
        } else if (mode === 'resize-end') {
          const newEnd = addDays(origEnd, daysDelta);
          if (new Date(newEnd) >= new Date(origStart)) {
            useGanttStore.getState().updateTask(task.id, { endDate: newEnd });
          }
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const t = useGanttStore.getState().tasks.find(x => x.id === task.id);
        if (t) onSaveDates(task.id, t.startDate, t.endDate);
        setDrag(null);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [task, pxPerDay, onSaveDates, setDrag],
  );

  const barHeight = depth > 0 ? 24 : 28;
  const topOffset = (ROW_HEIGHT - barHeight) / 2;

  return (
    <div className="absolute left-0 right-0" style={{ height: ROW_HEIGHT, top: 0 }}>
      <div
        ref={barRef}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => selectTask(task.id, e.ctrlKey || e.metaKey)}
        onDoubleClick={() => onOpenEdit?.(task.id)}
        title={`${task.name}\n${task.startDate} – ${task.endDate}\nProgress: ${Math.round(task.progress)}%`}
        className={`gantt-bar absolute rounded-md flex items-center overflow-hidden transition-shadow ${
          hovered || isSelected ? 'shadow-md z-10' : 'shadow-sm'
        } ${depth > 0 ? 'opacity-90' : ''}`}
        style={{
          left: left + depth * 8,
          width: Math.max(width - depth * 8, MIN_BAR_WIDTH),
          height: barHeight,
          top: topOffset,
          backgroundColor: color,
          cursor: 'grab',
        }}
        onMouseDown={e => handleMouseDown(e, 'move')}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-l-md z-20"
          onMouseDown={e => handleMouseDown(e, 'resize-start')}
        />

        <div className="flex-1 px-2 truncate text-[10px] font-bold text-white pointer-events-none">
          {width > 60 && (
            <>
              {task.name} {Math.round(task.progress)}%
            </>
          )}
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-r-md z-20"
          onMouseDown={e => handleMouseDown(e, 'resize-end')}
        />

        {hovered && (
          <>
            <div
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-400 cursor-crosshair z-30 hover:scale-125 transition-transform"
              onMouseDown={e => {
                e.stopPropagation();
                const rect = barRef.current?.getBoundingClientRect();
                if (rect) onStartDependency(task.id, rect.left, rect.top + rect.height / 2);
              }}
            />
            <div
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-400 cursor-crosshair z-30 hover:scale-125 transition-transform"
              onMouseDown={e => {
                e.stopPropagation();
                const rect = barRef.current?.getBoundingClientRect();
                if (rect) onStartDependency(task.id, rect.right, rect.top + rect.height / 2);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
