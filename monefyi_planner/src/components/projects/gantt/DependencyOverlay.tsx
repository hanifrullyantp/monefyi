import { useMemo } from 'react';
import { useGanttStore } from '../../../store/ganttStore';
import { bezierPath, getBarStyle } from '../../../lib/gantt/utils';
import { computeCriticalPath } from '../../../lib/gantt/criticalPath';
import type { FlatGanttRow, TimelineRange } from '../../../lib/gantt/types';
import { GANTT_COLORS, ROW_HEIGHT, getEffectivePxPerDay } from '../../../lib/gantt/constants';

interface DependencyOverlayProps {
  rows: FlatGanttRow[];
  range: TimelineRange;
  scrollTop: number;
  onRemove?: (id: string) => void;
  criticalDependencyIds?: Set<string>;
  showCriticalPath?: boolean;
}

export default function DependencyOverlay({
  rows,
  range,
  scrollTop,
  onRemove,
  criticalDependencyIds,
  showCriticalPath: showCriticalProp,
}: DependencyOverlayProps) {
  const {
    tasks,
    dependencies,
    viewMode,
    zoomScale,
    showCriticalPath: storeShowCriticalPath,
  } = useGanttStore();
  const pxPerDay = getEffectivePxPerDay(viewMode, zoomScale);
  const showCritical = showCriticalProp ?? storeShowCriticalPath;

  const fallbackCriticalIds = useMemo(() => {
    if (criticalDependencyIds) return criticalDependencyIds;
    return computeCriticalPath(tasks, dependencies).criticalDependencyIds;
  }, [criticalDependencyIds, tasks, dependencies]);

  const rowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r, i) => map.set(r.task.id, i));
    return map;
  }, [rows]);

  const paths = useMemo(() => {
    const mapped = dependencies
      .map(dep => {
        const fromRow = rowIndexMap.get(dep.fromTaskId);
        const toRow = rowIndexMap.get(dep.toTaskId);
        if (fromRow === undefined || toRow === undefined) return null;

        const fromTask = rows[fromRow].task;
        const toTask = rows[toRow].task;
        const fromBar = getBarStyle(fromTask, range, viewMode, false, zoomScale);
        const toBar = getBarStyle(toTask, range, viewMode, false, zoomScale);

        const x1 = fromBar.left + fromBar.width;
        const y1 = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;
        const x2 = toBar.left;
        const y2 = toRow * ROW_HEIGHT + ROW_HEIGHT / 2 - scrollTop;
        const isCritical = showCritical && fallbackCriticalIds.has(dep.id);

        return {
          id: dep.id,
          d: bezierPath(x1, y1, x2, y2),
          pending: dep.type === 'pending',
          isCritical,
        };
      })
      .filter(Boolean) as { id: string; d: string; pending: boolean; isCritical: boolean }[];

    // Render critical arrows after regular arrows so red lines sit cleanly on top.
    mapped.sort((a, b) => Number(a.isCritical) - Number(b.isCritical));
    return mapped;
  }, [
    dependencies,
    rows,
    range,
    viewMode,
    zoomScale,
    rowIndexMap,
    scrollTop,
    showCritical,
    fallbackCriticalIds,
  ]);

  const height = rows.length * ROW_HEIGHT;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-[5]"
      style={{ width: range.rangeDays * pxPerDay, height }}
    >
      <defs>
        <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94A3B8" />
        </marker>
        <marker
          id="gantt-arrow-critical"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={GANTT_COLORS.criticalPath} />
        </marker>
      </defs>
      {paths.map(p => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={
            p.isCritical ? GANTT_COLORS.criticalPath : p.pending ? '#CBD5E1' : '#94A3B8'
          }
          strokeWidth={p.isCritical ? 2 : 1.5}
          strokeDasharray={p.pending && !p.isCritical ? '4 3' : undefined}
          markerEnd={p.isCritical ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow)'}
          className="pointer-events-stroke cursor-pointer"
          style={{ pointerEvents: 'stroke' }}
          onContextMenu={e => {
            e.preventDefault();
            onRemove?.(p.id);
          }}
        />
      ))}
    </svg>
  );
}
