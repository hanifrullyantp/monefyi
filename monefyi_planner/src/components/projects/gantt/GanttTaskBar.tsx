import { useCallback, useRef, useState } from 'react';
import { Palette, RefreshCw } from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { addDays, daysBetween, getBarStyle } from '../../../lib/gantt/utils';
import type { FlatGanttRow, GanttDragState } from '../../../lib/gantt/types';
import { BAR_COLOR_PRESETS, GANTT_COLORS, getEffectivePxPerDay, MIN_BAR_WIDTH, ROW_HEIGHT, WORK_ITEM_STATUS_LABEL } from '../../../lib/gantt/constants';
import type { TimelineRange } from '../../../lib/gantt/types';
import GanttContextMenu, { type GanttContextMenuItem } from './GanttContextMenu';
import { STATUS_LABEL } from '../../../utils/projectUi';

interface GanttTaskBarProps {
  row: FlatGanttRow;
  range: TimelineRange;
  onCommitDates: (id: string, start: string, end: string) => void;
  onStartDependency: (fromId: string, x: number, y: number) => void;
  onOpenEdit?: (taskId: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
}

export default function GanttTaskBar({
  row,
  range,
  onCommitDates,
  onStartDependency,
  onOpenEdit,
  onOpenProjectDetail,
}: GanttTaskBarProps) {
  const { task, depth } = row;
  const {
    viewMode, zoomScale, selectedIds, selectTask, setDrag, pushHistory,
    updateTask, setBarColor,
  } = useGanttStore();
  const isSelected = selectedIds.has(task.id);
  const isProject = task.type === 'project';
  const { left, width, color } = getBarStyle(task, range, viewMode, isSelected && !task.barColor, zoomScale);
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dayCount = daysBetween(task.startDate, task.endDate);
  const pxPerDay = getEffectivePxPerDay(viewMode, zoomScale);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: GanttDragState['mode']) => {
      e.stopPropagation();
      e.preventDefault();
      pushHistory();
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
          }, false);
        } else if (mode === 'resize-start') {
          const newStart = addDays(origStart, daysDelta);
          if (new Date(newStart) <= new Date(origEnd)) {
            useGanttStore.getState().updateTask(task.id, { startDate: newStart }, false);
          }
        } else if (mode === 'resize-end') {
          const newEnd = addDays(origEnd, daysDelta);
          if (new Date(newEnd) >= new Date(origStart)) {
            useGanttStore.getState().updateTask(task.id, { endDate: newEnd }, false);
          }
        }
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const t = useGanttStore.getState().tasks.find(x => x.id === task.id);
        if (t) onCommitDates(task.id, t.startDate, t.endDate);
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
        <span className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: preset.color }} />
      ) : (
        <Palette className="w-4 h-4" />
      ),
      onClick: () => setBarColor(task.id, preset.color || null),
    }));

    const statusOptions = isProject
      ? (['planning', 'active', 'on_hold', 'completed'] as const)
      : (['pending', 'in_progress', 'completed'] as const);

    const statusLabels = isProject ? STATUS_LABEL : WORK_ITEM_STATUS_LABEL;

    const statusItems: GanttContextMenuItem[] = statusOptions.map(status => ({
      id: `status-${status}`,
      label: statusLabels[status] || status,
      onClick: () => {
        pushHistory();
        updateTask(task.id, { status }, false);
        useGanttStore.setState({ isDirty: true });
      },
    }));

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
      ...(!isProject ? [{
        id: 'todo',
        label: 'Todo list',
        onClick: () => useGanttStore.getState().setTodoModalTaskId(task.id),
      }] : []),
    ];
  };

  const barHeight = depth > 0 ? 24 : 28;
  const topOffset = (ROW_HEIGHT - barHeight) / 2;
  const barW = Math.max(width - depth * 8, MIN_BAR_WIDTH);
  const outline = isSelected ? `0 0 0 2px ${GANTT_COLORS.selected}` : undefined;

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
        title={`${task.name}\n${task.startDate} – ${task.endDate}\n${dayCount} hari · ${Math.round(task.progress)}%`}
        className={`gantt-bar absolute rounded-md flex items-center overflow-hidden transition-shadow ${
          hovered || isSelected ? 'shadow-md z-10' : 'shadow-sm'
        } ${depth > 0 ? 'opacity-90' : ''}`}
        style={{
          left: left + depth * 8,
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
              <span className="truncate">{task.name}</span>
              <span className="shrink-0 opacity-90">{dayCount}h</span>
              {barW > 100 && <span className="shrink-0 opacity-80">{Math.round(task.progress)}%</span>}
            </>
          )}
          {barW <= 48 && barW > 20 && (
            <span className="mx-auto">{dayCount}h</span>
          )}
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
