import { useMemo } from 'react';
import { ROW_HEIGHT } from '../lib/gantt/constants';

const DEFAULT_OVERSCAN = 10;
const VIRTUAL_THRESHOLD = 60;

interface VirtualRowsResult {
  enabled: boolean;
  start: number;
  end: number;
  offsetY: number;
  totalHeight: number;
  visibleRows: number[];
}

/**
 * Windowed row indices for Gantt list/timeline when row count exceeds threshold.
 */
export function useVirtualRows(
  scrollTop: number,
  count: number,
  viewportHeight: number,
  rowHeight = ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
): VirtualRowsResult {
  return useMemo(() => {
    const totalHeight = count * rowHeight;
    const enabled = count >= VIRTUAL_THRESHOLD;

    if (!enabled || viewportHeight <= 0) {
      return {
        enabled: false,
        start: 0,
        end: count,
        offsetY: 0,
        totalHeight,
        visibleRows: Array.from({ length: count }, (_, i) => i),
      };
    }

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(count, start + visibleCount);

    return {
      enabled: true,
      start,
      end,
      offsetY: start * rowHeight,
      totalHeight,
      visibleRows: Array.from({ length: end - start }, (_, i) => start + i),
    };
  }, [scrollTop, count, viewportHeight, rowHeight, overscan]);
}

export { VIRTUAL_THRESHOLD };
