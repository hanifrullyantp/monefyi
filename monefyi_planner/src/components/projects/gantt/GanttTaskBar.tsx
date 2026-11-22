import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Palette, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import {
  addDays,
  daysBetween,
  getBarStyle,
  isTaskOverProjectDeadline,
} from '../../../lib/gantt/utils';
import type { FlatGanttRow, GanttDragState, GanttTask, TimelineRange } from '../../../lib/gantt/types';
import type { GanttSnapshot } from '../../../lib/gantt/snapshot';
import {
  BAR_COLOR_PRESETS,
  GANTT_COLORS,
  getEffectivePxPerDay,
  MIN_BAR_WIDTH,
  PRIORITY_LABEL,
  ROW_HEIGHT,
  WORK_ITEM_STATUS_LABEL,
} from '../../../lib/gantt/constants';
import GanttContextMenu, { type GanttContextMenuItem } from './GanttContextMenu';
import { STATUS_LABEL } from '../../../utils/projectUi';

interface GanttTaskBarProps {
  row: FlatGanttRow;
  range: TimelineRange;
  onCommitDates: (id: string, start: string, end: string) => void;
  onStartDependency: (fromId: string, x: number, y: number) => void;
  onOpenEdit?: (taskId: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
  isCriticalOverride?: boolean;
  totalFloatDaysOverride?: number;
  projectEndDate?: string;
  onAddSubTask?: (task: GanttTask) => void;
  onDuplicateTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function GanttTaskBar({
  row,
  range,
  onCommitDates,
  onStartDependency,
  onOpenEdit,
  onOpenProjectDetail,
  isCriticalOverride,
  totalFloatDaysOverride,
  projectEndDate,
  onAddSubTask,
  onDuplicateTask,
  onDeleteTask,
}: GanttTaskBarProps) {
  const { task, depth } = row;
  const {
    viewMode,
    zoomScale,
    selectedIds,
    selectTask,
    setDrag,
    pushHistory,
    updateTask,
    setBarColor,
    showCriticalPath,
  } = useGanttStore();
  const isSelected = selectedIds.has(task.id);
  const isProject = task.type === 'project';
  const { left, width, color } = getBarStyle(
    task,
    range,
    viewMode,
    isSelected && !task.barColor,
    zoomScale,
  );
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const dayCount = daysBetween(task.startDate, task.endDate);
  const pxPerDay = getEffectivePxPerDay(viewMode, zoomScale);

  const isCritical = !isProject && (isCriticalOverride ?? task.isCritical ?? false);
  const totalFloat = totalFloatDaysOverride ?? task.totalFloatDays;
  const highlightCritical = showCriticalPath && isCritical;
  const isOverDeadline = !isProject && isTaskOverProjectDeadline(task.endDate, projectEndDate);

  useEffect(
    () => () => {
      cleanupDragRef.current?.();
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: GanttDragState['mode']) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      cleanupDragRef.current?.();

      const origStart = task.startDate;
      const origEnd = task.endDate;
      setDrag({
        taskId: task.id,
        mode,
        startX: e.clientX,
        origStart,
        origEnd,
      });

      let preDragSnap: GanttSnapshot | null = null;
      let lastStart = origStart;
      let lastEnd = origEnd;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - e.clientX;
        const daysDelta = Math.round(dx / pxPerDay);

        let nextStart = lastStart;
        let nextEnd = lastEnd;

        if (mode === 'move') {
          nextStart = addDays(origStart, daysDelta);
          nextEnd = addDays(origEnd, daysDelta);
        } else if (mode === 'resize-start') {
          const newStart = addDays(origStart, daysDelta);
          if (new Date(newStart) <= new Date(origEnd)) {
            nextStart = newStart;
          }
        } else if (mode === 'resize-end') {
          const newEnd = addDays(origEnd, daysDelta);
          if (new Date(newEnd) >= new Date(origStart)) {
            nextEnd = newEnd;
          }
        }

        if (nextStart === lastStart && nextEnd === lastEnd) return;

        if (!preDragSnap && (nextStart !== origStart || nextEnd !== origEnd)) {
          preDragSnap = useGanttStore.getState().getSnapshot();
        }

        lastStart = nextStart;
        lastEnd = nextEnd;
        useGanttStore.getState().updateTask(
          task.id,
          {
            startDate: nextStart,
            endDate: nextEnd,
          },
          false,
        );
      };

      const removeListeners = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        cleanupDragRef.current = null;
      };

      const onUp = () => {
        removeListeners();
        const t = useGanttStore.getState().tasks.find(x => x.id === task.id);
        const changed = !!t && (t.startDate !== origStart || t.endDate !== origEnd);
        if (changed && t) {
          pushHistory(preDragSnap ?? undefined);
          onCommitDates(task.id, t.startDate, t.endDate);
        }
        setDrag(null);
      };

      cleanupDragRef.current = () => {
        removeListeners();
        setDrag(null);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [task, pxPerDay, onCommitDates, setDrag, pushHistory],
  );

  const buildMenuItems = (): GanttContextMenuItem[] => {
    const colorItems: GanttContextMenuItem[] = BAR_COLOR_PRESETS.map(preset => ({
      id: `color-${preset.id}`,
      label: preset.label,
      icon: preset.color ? (
        <span
          className="w-3 h-3 rounded-full border border-slate-200"
          style={{ backgroundColor: preset.color }}
        />
      ) : (
        <Palette className="w-4 h-4" />
      ),
      onClick: () => setBarColor(task.id, preset.color || null),
    }));

    const statusOptions = isProject
      ? (['planning', 'active', 'on_hold', 'completed'] as const)
      : (['pending', 'in_progress', 'completed'] as const);

    const statusLabels: Record<string, string> = isProject ? STATUS_LABEL : WORK_ITEM_STATUS_LABEL;

    const statusItems: GanttContextMenuItem[] = statusOptions.map(status => ({
      id: `status-${status}`,
      label: statusLabels[status] || status,
      onClick: () => {
        if (task.status === status) return;
        pushHistory();
        updateTask(task.id, { status }, false);
      },
    }));

    const workItemActions: GanttContextMenuItem[] = !isProject
      ? [
          {
            id: 'todo',
            label: 'Todo list',
            onClick: () => useGanttStore.getState().setTodoModalTaskId(task.id),
          },
          ...(onAddSubTask
            ? [
                {
                  id: 'add-subtask',
                  label: '+ Sub Tugas',
                  icon: <Plus className="w-4 h-4" />,
                  onClick: () => onAddSubTask(task),
                },
              ]
            : []),
          ...(onDuplicateTask
            ? [
                {
                  id: 'duplicate',
                  label: 'Duplikasi',
                  icon: <Copy className="w-4 h-4" />,
                  onClick: () => onDuplicateTask(task.id),
                },
              ]
            : []),
          ...(onDeleteTask
            ? [
                { id: 'sep-del', label: '', separator: true },
                {
                  id: 'delete',
                  label: 'Hapus pekerjaan',
                  icon: <Trash2 className="w-4 h-4" />,
                  danger: true,
                  onClick: () => {
                    if (
                      typeof window === 'undefined' ||
                      window.confirm(`Hapus pekerjaan "${task.name}"?`)
                    ) {
                      onDeleteTask(task.id);
                    }
                  },
                },
              ]
            : []),
        ]
      : [];

    return [
      {
        id: 'colors',
        label: 'Ganti warna bar',
        icon: <Palette className="w-4 h-4" />,
        children: colorItems,
      },
      {
        id: 'status',
        label: 'Ganti status',
        icon: <RefreshCw className="w-4 h-4" />,
        children: statusItems,
      },
      { id: 'sep', label: '', separator: true },
      {
        id: 'edit',
        label: isProject ? 'Edit bar proyek' : 'Edit pekerjaan',
        onClick: () => onOpenEdit?.(task.id),
      },
      ...workItemActions,
    ];
  };

  const barHeight = depth > 0 ? 24 : 28;
  const topOffset = (ROW_HEIGHT - barHeight) / 2;
  const barLeft = left + depth * 8;
  const barW = Math.max(width - depth * 8, MIN_BAR_WIDTH);
  const outline = highlightCritical
    ? isSelected
      ? `0 0 0 2px ${GANTT_COLORS.selected}, 0 0 0 4px ${GANTT_COLORS.criticalPath}`
      : `0 0 0 2px ${GANTT_COLORS.criticalPath}`
    : isSelected
      ? `0 0 0 2px ${GANTT_COLORS.selected}`
      : isOverDeadline
        ? '0 0 0 2px #F59E0B'
        : undefined;

  const tooltipLines = [
    task.name,
    `${task.startDate} – ${task.endDate}`,
    `${dayCount} hari · ${Math.round(task.progress)}%`,
    `Prioritas: ${PRIORITY_LABEL[task.priority] || task.priority}`,
    task.assigneeName ? `PJ: ${task.assigneeName}` : null,
    !isProject && totalFloat !== undefined
      ? isCritical
        ? 'Jalur Kritis (Float: 0 hari)'
        : `Total Float: +${totalFloat} hari`
      : null,
    isOverDeadline ? `Peringatan: Melewati deadline proyek (${projectEndDate})` : null,
  ].filter(Boolean);

  return (
    <div className="absolute left-0 right-0" style={{ height: ROW_HEIGHT, top: 0 }}>
      <div
        ref={barRef}
        role="button"
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => selectTask(task.id, e.ctrlKey || e.metaKey)}
        onDoubleClick={() => {
          if (isProject) onOpenProjectDetail?.(task.id);
          else onOpenEdit?.(task.id);
        }}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        title={tooltipLines.join('\n')}
        className={`gantt-bar absolute rounded-md flex items-center overflow-hidden transition-shadow ${
          hovered || isSelected ? 'shadow-md z-10' : 'shadow-sm'
        } ${depth > 0 ? 'opacity-90' : ''}`}
        style={{
          left: barLeft,
          width: barW,
          height: barHeight,
          top: topOffset,
          backgroundColor: color,
          boxShadow: outline,
          cursor: 'grab',
        }}
        onMouseDown={e => handleMouseDown(e, 'move')}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-l-md z-20"
          onMouseDown={e => handleMouseDown(e, 'resize-start')}
        />

        <div className="flex-1 px-2 truncate text-[10px] font-bold text-white pointer-events-none flex items-center gap-1">
          {barW > 48 && (
            <>
              {!isProject && task.priority === 'critical' && (
                <span className="shrink-0 bg-red-800/90 text-white text-[8px] font-black px-1 rounded">
                  KRITIS
                </span>
              )}
              {!isProject && task.priority === 'high' && (
                <span className="shrink-0 text-[9px] font-black opacity-95">↑</span>
              )}
              <span className="truncate">{task.name}</span>
              <span className="shrink-0 opacity-90">{dayCount}h</span>
              {barW > 100 && (
                <span className="shrink-0 opacity-80">{Math.round(task.progress)}%</span>
              )}
              {highlightCritical && barW > 130 && (
                <span className="shrink-0 bg-red-600 text-white text-[8px] font-black px-1 rounded">
                  CPM
                </span>
              )}
              {isOverDeadline && barW > 72 && (
                <AlertTriangle className="w-3 h-3 text-amber-200 shrink-0" />
              )}
            </>
          )}
          {barW <= 48 && barW > 20 && <span className="mx-auto">{dayCount}h</span>}
        </div>

        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 rounded-r-md z-20"
          onMouseDown={e => handleMouseDown(e, 'resize-end')}
        />

        {hovered && (
          <>
            <div
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-400 cursor-crosshair z-30"
              onMouseDown={e => {
                e.stopPropagation();
                const rect = barRef.current?.getBoundingClientRect();
                if (rect) onStartDependency(task.id, rect.left, rect.top + rect.height / 2);
              }}
            />
            <div
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-slate-400 cursor-crosshair z-30"
              onMouseDown={e => {
                e.stopPropagation();
                const rect = barRef.current?.getBoundingClientRect();
                if (rect) onStartDependency(task.id, rect.right, rect.top + rect.height / 2);
              }}
            />
          </>
        )}
      </div>

      {(highlightCritical || isOverDeadline) && (
        <div
          className="absolute flex items-center gap-1 pointer-events-none z-[6]"
          style={{
            left: barLeft + barW + 8,
            top: topOffset + (barHeight - 16) / 2,
          }}
        >
          {highlightCritical && barW <= 130 && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white shadow-xs whitespace-nowrap">
              Kritis
            </span>
          )}
          {isOverDeadline && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
              <AlertTriangle className="w-2.5 h-2.5" />
              &gt; Deadline
            </span>
          )}
        </div>
      )}

      {contextMenu && (
        <GanttContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
