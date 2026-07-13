import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, MoreHorizontal,
  CheckCircle2, Circle, Plus, Pencil, FolderOpen, ListTree,
} from 'lucide-react';
import { useGanttStore } from '../../../store/ganttStore';
import { formatShortPeriod } from '../../../lib/gantt/utils';
import type { FlatGanttRow } from '../../../lib/gantt/types';
import { GANTT_COLORS, ROW_HEIGHT } from '../../../lib/gantt/constants';
import { useVirtualRows } from '../../../hooks/useVirtualRows';
import GanttContextMenu, { type GanttContextMenuItem } from './GanttContextMenu';

interface TaskListPanelProps {
  rows: FlatGanttRow[];
  onReorder: (order: string[]) => void;
  onEditTask?: (taskId: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
}

interface ContextState {
  x: number;
  y: number;
  taskId: string;
}

function TaskListRow({
  row,
  isSelected,
  isRoot,
  isDragOver,
  isDragging,
  isHidden,
  onSelect,
  onToggle,
  onContextMenu,
}: {
  row: FlatGanttRow;
  isSelected: boolean;
  isRoot: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  isHidden?: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
}) {
  const { task, depth, hasChildren, isExpanded } = row;
  const isDone = task.status === 'completed' || task.status === 'archived';
  const isActive = task.status === 'active' || task.status === 'in_progress';

  return (
    <div
      onClick={e => onSelect(task.id, e.ctrlKey || e.metaKey)}
      onContextMenu={e => onContextMenu(e, task.id)}
      className={`gantt-task-row flex items-center gap-1 px-2 border-b border-slate-100 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
          : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
      } ${isDragOver ? 'bg-emerald-50' : ''} ${isDragging ? 'opacity-50' : ''} ${isHidden ? 'opacity-40' : ''}`}
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
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onContextMenu(e, task.id); }}
            className="p-0.5 rounded hover:bg-slate-200 text-slate-400"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskListPanel({
  rows,
  onReorder,
  onEditTask,
  onOpenProjectDetail,
}: TaskListPanelProps) {
  const {
    selectedIds, selectTask, toggleExpand, projectOrder, hiddenProjectIds,
    toggleHideProject, setAddWorkItemProjectId, setEditProjectId, setEditTaskId,
    setTodoModalTaskId, expandedIds,
  } = useGanttStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOverRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
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

  const openContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, taskId });
  };

  const buildMenuItems = (taskId: string): GanttContextMenuItem[] => {
    const task = rows.find(r => r.task.id === taskId)?.task
      ?? useGanttStore.getState().tasks.find(t => t.id === taskId);
    if (!task) return [];

    if (task.type === 'project') {
      const isExpanded = expandedIds.has(task.id);
      const isHidden = hiddenProjectIds.has(task.id);
      return [
        {
          id: 'open-detail',
          label: 'Buka detail proyek',
          icon: <FolderOpen className="w-4 h-4" />,
          onClick: () => onOpenProjectDetail?.(task.id),
        },
        {
          id: 'edit-project',
          label: 'Edit detail proyek',
          icon: <Pencil className="w-4 h-4" />,
          onClick: () => setEditProjectId(task.id),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'add-work',
          label: 'Tambah pekerjaan',
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setAddWorkItemProjectId(task.id),
        },
        {
          id: 'toggle-children',
          label: isExpanded ? 'Sembunyikan pekerjaan' : 'Tampilkan pekerjaan',
          icon: <ListTree className="w-4 h-4" />,
          onClick: () => toggleExpand(task.id),
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'toggle-hide',
          label: isHidden ? 'Tampilkan proyek' : 'Sembunyikan proyek',
          icon: isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
          onClick: () => toggleHideProject(task.id),
        },
        {
          id: 'edit-gantt',
          label: 'Edit di Gantt',
          icon: <Pencil className="w-4 h-4" />,
          onClick: () => setEditTaskId(task.id),
        },
      ];
    }

    return [
      {
        id: 'edit-work',
        label: 'Edit pekerjaan',
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => onEditTask?.(task.id),
      },
      {
        id: 'todo',
        label: 'Todo list',
        icon: <ListTree className="w-4 h-4" />,
        onClick: () => setTodoModalTaskId(task.id),
      },
      {
        id: 'edit-gantt',
        label: 'Edit di Gantt',
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => setEditTaskId(task.id),
      },
    ];
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 shrink-0">
      <div className="flex items-center justify-between px-3 border-b border-slate-100 bg-slate-50/80" style={{ height: 56 }}>
        <span className="text-xs font-bold text-slate-700">Semua Proyek ({rootRows.length})</span>
        {hiddenProjectIds.size > 0 && (
          <button
            type="button"
            onClick={() => {
              hiddenProjectIds.forEach(id => toggleHideProject(id));
            }}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700"
          >
            Tampilkan {hiddenProjectIds.size} tersembunyi
          </button>
        )}
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
                  onDoubleClick={() => {
                    if (task.type === 'project') onOpenProjectDetail?.(task.id);
                    else onEditTask?.(task.id);
                  }}
                >
                  <TaskListRow
                    row={row}
                    isSelected={selectedIds.has(task.id)}
                    isRoot={isRoot}
                    isDragOver={dragOverRef.current === task.id && dragId !== task.id}
                    isDragging={dragId === task.id}
                    isHidden={isRoot && hiddenProjectIds.has(task.id)}
                    onSelect={selectTask}
                    onToggle={toggleExpand}
                    onContextMenu={openContextMenu}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {contextMenu && (
        <GanttContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.taskId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
