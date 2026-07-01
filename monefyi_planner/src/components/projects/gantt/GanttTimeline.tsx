import { useCallback, useEffect, useRef, useState } from 'react';
import { useGanttStore } from '../../../store/ganttStore';
import {
  computeTimelineRange, generateTimelineDays, isWeekend, wouldCreateCycle,
} from '../../../lib/gantt/utils';
import type { FlatGanttRow, GanttDependency } from '../../../lib/gantt/types';
import { GANTT_COLORS, ROW_HEIGHT, PX_PER_DAY } from '../../../lib/gantt/constants';
import TimelineHeader from './TimelineHeader';
import GanttTaskBar from './GanttTaskBar';
import DependencyOverlay from './DependencyOverlay';
import { useUiStore } from '../../../store/uiStore';
import { useVirtualRows } from '../../../hooks/useVirtualRows';
import { depId } from '../../../services/ganttDependencyService';

interface GanttTimelineProps {
  rows: FlatGanttRow[];
  onSaveDates: (id: string, start: string, end: string) => void;
  scrollToTodayRef: React.MutableRefObject<(() => void) | null>;
  onEditTask?: (taskId: string) => void;
  onPersistDependency?: (dep: GanttDependency) => Promise<void>;
  onRemoveDependency?: (dep: GanttDependency) => Promise<void>;
}

export default function GanttTimeline({
  rows,
  onSaveDates,
  scrollToTodayRef,
  onEditTask,
  onPersistDependency,
  onRemoveDependency,
}: GanttTimelineProps) {
  const {
    tasks, viewMode, scrollLeft, setScrollLeft,
    addDependency, removeDependency, dependencies, searchQuery, filterStatus,
  } = useGanttStore();

  const showToast = useUiStore(s => s.showToast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [depDrag, setDepDrag] = useState<{ fromId: string; x: number; y: number; curX: number; curY: number } | null>(null);

  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase();
    if (q && !t.name.toLowerCase().includes(q) && !(t.code?.toLowerCase().includes(q))) {
      if (t.parentId) return false;
    }
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return t.status === 'active' || t.status === 'in_progress';
    if (filterStatus === 'planning') return t.status === 'planning' || t.status === 'draft' || t.status === 'pending';
    if (filterStatus === 'at_risk') return t.healthStatus === 'at_risk' || t.healthStatus === 'behind';
    if (filterStatus === 'completed') return t.status === 'completed' || t.status === 'archived';
    return true;
  });

  const activeRows = rows;
  const range = computeTimelineRange(filteredTasks.length ? filteredTasks : tasks);
  const pxPerDay = PX_PER_DAY[viewMode];
  const totalWidth = range.rangeDays * pxPerDay;
  const days = generateTimelineDays(range);
  const virtual = useVirtualRows(scrollTop, activeRows.length, viewportH);

  const todayOffset = ((Date.now() - range.minDate) / 86400000) * pxPerDay;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const scrollToToday = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = todayOffset - container.clientWidth / 2;
    setScrollLeft(Math.max(0, target));
    container.scrollLeft = Math.max(0, target);
  }, [todayOffset, setScrollLeft]);

  useEffect(() => {
    scrollToTodayRef.current = scrollToToday;
  }, [scrollToToday, scrollToTodayRef]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = scrollLeft;
  }, [scrollLeft]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
    setScrollTop(e.currentTarget.scrollTop);

    const listEl = document.querySelector('[data-gantt-scroll="list"]');
    if (listEl && listEl.scrollTop !== e.currentTarget.scrollTop) {
      listEl.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      const next = scrollLeft + e.deltaY;
      setScrollLeft(Math.max(0, next));
      if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, next);
    }
  };

  const handleStartDependency = (fromId: string, x: number, y: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setDepDrag({
      fromId,
      x: x - rect.left + scrollLeft,
      y: y - rect.top + scrollTop,
      curX: x - rect.left + scrollLeft,
      curY: y - rect.top + scrollTop,
    });
  };

  useEffect(() => {
    if (!depDrag) return;

    const onMove = (e: MouseEvent) => {
      const container = scrollRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setDepDrag(d => d ? {
        ...d,
        curX: e.clientX - rect.left + scrollLeft,
        curY: e.clientY - rect.top + scrollTop,
      } : null);
    };

    const onUp = (e: MouseEvent) => {
      const container = scrollRef.current;
      if (!container || !depDrag) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top + scrollTop;
      const rowIdx = Math.floor(y / ROW_HEIGHT);
      const targetRow = activeRows[rowIdx];

      if (targetRow && targetRow.task.id !== depDrag.fromId) {
        if (wouldCreateCycle(depDrag.fromId, targetRow.task.id, dependencies)) {
          showToast('Dependency circular tidak diizinkan', 'error');
        } else {
          const dep: GanttDependency = {
            id: depId(depDrag.fromId, targetRow.task.id),
            fromTaskId: depDrag.fromId,
            toTaskId: targetRow.task.id,
            type: 'finish_to_start',
          };
          addDependency(dep);
          onPersistDependency?.(dep).catch(err => {
            removeDependency(dep.id);
            showToast(err instanceof Error ? err.message : 'Gagal menyimpan dependency', 'error');
          });
          showToast('Dependency ditambahkan', 'success');
        }
      }
      setDepDrag(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [depDrag, activeRows, dependencies, addDependency, removeDependency, scrollLeft, scrollTop, showToast, onPersistDependency]);

  const handleRemoveDep = (id: string) => {
    const dep = dependencies.find(d => d.id === id);
    if (!dep) return;
    removeDependency(id);
    onRemoveDependency?.(dep).catch(err => {
      addDependency(dep);
      showToast(err instanceof Error ? err.message : 'Gagal menghapus dependency', 'error');
    });
    showToast('Dependency dihapus', 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
      <TimelineHeader
        range={range}
        viewMode={viewMode}
        scrollLeft={scrollLeft}
        onScroll={delta => {
          const next = Math.max(0, scrollLeft + delta);
          setScrollLeft(next);
          if (scrollRef.current) scrollRef.current.scrollLeft = next;
        }}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto gantt-scroll gantt-sync-scroll relative"
        data-gantt-scroll="timeline"
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        <div className="relative" style={{ width: totalWidth, height: virtual.totalHeight }}>
          <div className="absolute inset-0 flex pointer-events-none">
            {days.map((d, i) => (
              <div
                key={i}
                className="border-r h-full"
                style={{
                  width: pxPerDay,
                  borderColor: GANTT_COLORS.grid,
                  backgroundColor: isWeekend(d) ? GANTT_COLORS.weekend : undefined,
                }}
              />
            ))}
          </div>

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-[4] pointer-events-none"
            style={{ left: todayOffset }}
          />

          <DependencyOverlay
            rows={activeRows}
            range={range}
            scrollTop={scrollTop}
            onRemove={handleRemoveDep}
          />

          <div className="absolute left-0 right-0" style={{ top: virtual.offsetY }}>
            {virtual.visibleRows.map(i => {
              const row = activeRows[i];
              if (!row) return null;
              return (
                <div
                  key={row.task.id}
                  className="relative border-b border-slate-100/80"
                  style={{ height: ROW_HEIGHT }}
                >
                  <GanttTaskBar
                    row={row}
                    range={range}
                    onSaveDates={onSaveDates}
                    onStartDependency={handleStartDependency}
                    onOpenEdit={onEditTask}
                  />
                </div>
              );
            })}
          </div>

          {depDrag && (
            <svg className="absolute inset-0 z-50 pointer-events-none" style={{ width: totalWidth, height: virtual.totalHeight }}>
              <line
                x1={depDrag.x}
                y1={depDrag.y}
                x2={depDrag.curX}
                y2={depDrag.curY}
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
