import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, GripVertical, MoreHorizontal,
  CheckCircle2, Circle,
} from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { formatShortPeriod } from '../../../lib/gantt/utils';
import type { FlatGanttRow } from '../../../lib/gantt/types';
import { GANTT_COLORS, ROW_HEIGHT } from '../../../lib/gantt/constants';
import { useVirtualRows } from '../../../hooks/useVirtualRows';

interface TaskListPanelProps {
  rows: FlatGanttRow[];
  onReorder: (order: string[]) => void;
  onEditTask?: (taskId: string) => void;
}

function TaskListRow({
  row,
  isSelected,
  isRoot,
  isDragOver,
  isDragging,
  onSelect,
  onToggle,
  onEditTask,
}: {
  row: FlatGanttRow;
  isSelected: boolean;
  isRoot: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onToggle: (id: string) => void;
  onEditTask?: (id: string) => void;
}) {
  const { task, depth, hasChildren, isExpanded } = row;
  const isDone = task.status === 'completed' || task.status === 'archived';
  const isActive = task.status === 'active' || task.status === 'in_progress';

  return (
    <div
      onClick={e => onSelect(task.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onEditTask?.(task.id)}
      className={`gantt-task-row flex items-center gap-1 px-2 border-b border-slate-100 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
          : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
      } ${isDragOver ? 'bg-emerald-50' : ''} ${isDragging ? 'opacity-50' : ''}`}
      style={{ height: ROW_HEIGHT, paddingLeft: 8 + depth * 16 }}
    >
      {isRoot ? (
        <div className="p-0.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      ) : (
        <span className="w-[18px]" />
      )}

      {hasChildren ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle(task.id); }}
          className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      ) : (
        <span className="w-4" />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-800 truncate">{task.name}</div>
        <div className="text-[10px] text-slate-400 truncate">
          {formatShortPeriod(task.startDate, task.endDate)}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-0.5 w-16">
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(task.progress, 100)}%`,
                backgroundColor: isSelected ? GANTT_COLORS.selected : GANTT_COLORS.primary,
              }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-500">{Math.round(task.progress)}%</span>
        </div>
        <div className="flex items-center gap-1">
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          ) : isActive ? (
            <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
          ) : (
            <Circle className="w-2.5 h-2.5 text-slate-300" />
          )}
          <button type="button" onClick={e => e.stopPropagation()} className="p-0.5 rounded hover:bg-slate-200 text-slate-400">
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskListPanel({ rows, onReorder, onEditTask }: TaskListPanelProps) {
  const { selectedIds, selectTask, toggleExpand, projectOrder } = useGanttStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOverRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const rootRows = rows.filter(r => r.task.parentId === null);
  const virtual = useVirtualRows(scrollTop, rows.length, viewportH);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrollTop(el.scrollTop);
      const timeline = document.querySelector('[data-gantt-scroll="timeline"]');
      if (timeline && timeline.scrollTop !== el.scrollTop) {
        timeline.scrollTop = el.scrollTop;
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleDragStart = (id: string) => setDragId(id);

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    dragOverRef.current = targetId;
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const order = [...projectOrder];
    const fromIdx = order.indexOf(dragId);
    const toIdx = order.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragId);
    onReorder(order);
    setDragId(null);
    dragOverRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shrink-0">
      <div className="flex items-center justify-between px-3 border-b border-slate-100 bg-slate-50/80" style={{ height: 56 }}>
        <span className="text-xs font-bold text-slate-700">Semua Proyek ({rootRows.length})</span>
        <button type="button" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">
          Urutkan
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto gantt-scroll gantt-sync-scroll" data-gantt-scroll="list">
        <div style={{ height: virtual.totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${virtual.offsetY}px)` }}>
            {virtual.visibleRows.map(i => {
              const row = rows[i];
              if (!row) return null;
              const { task } = row;
              const isRoot = task.parentId === null;

              return (
                <div
                  key={task.id}
                  draggable={isRoot}
                  onDragStart={() => isRoot && handleDragStart(task.id)}
                  onDragOver={e => isRoot && handleDragOver(e, task.id)}
                  onDrop={() => isRoot && handleDrop(task.id)}
                  onDragEnd={() => { setDragId(null); dragOverRef.current = null; }}
                >
                  <TaskListRow
                    row={row}
                    isSelected={selectedIds.has(task.id)}
                    isRoot={isRoot}
                    isDragOver={dragOverRef.current === task.id && dragId !== task.id}
                    isDragging={dragId === task.id}
                    onSelect={selectTask}
                    onToggle={toggleExpand}
                    onEditTask={onEditTask}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
