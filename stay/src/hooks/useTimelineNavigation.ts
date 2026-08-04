import { useCallback, useMemo, useState } from 'react';
import {
  addDays,
  startOfDay,
  subDays,
} from 'date-fns';

export type TimelineViewRange = 7 | 14 | 30;

export interface TimelineNavigationState {
  rangeStart: Date;
  viewRange: TimelineViewRange;
  rangeEnd: Date;
  dates: Date[];
  todayIndex: number;
}

/**
 * Navigasi timeline Gantt — prev/next/today + jump date.
 */
export function useTimelineNavigation(initialRange: TimelineViewRange = 14) {
  const [viewRange, setViewRange] = useState<TimelineViewRange>(initialRange);
  const [rangeStart, setRangeStart] = useState(() =>
    startOfDay(subDays(new Date(), 1))
  );

  const rangeEnd = useMemo(
    () => addDays(rangeStart, viewRange - 1),
    [rangeStart, viewRange]
  );

  const dates = useMemo(() => {
    return Array.from({ length: viewRange }, (_, i) => addDays(rangeStart, i));
  }, [rangeStart, viewRange]);

  const todayIndex = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    return dates.findIndex((d) => startOfDay(d).getTime() === today);
  }, [dates]);

  const goPrevious = useCallback(() => {
    setRangeStart((prev) => addDays(prev, -viewRange));
  }, [viewRange]);

  const goNext = useCallback(() => {
    setRangeStart((prev) => addDays(prev, viewRange));
  }, [viewRange]);

  const goToday = useCallback(() => {
    const today = startOfDay(new Date());
    setRangeStart(addDays(today, -Math.floor(viewRange / 3)));
  }, [viewRange]);

  const goToDate = useCallback(
    (date: Date) => {
      setRangeStart(startOfDay(date));
    },
    []
  );

  const setViewRangeAndReset = useCallback((range: TimelineViewRange) => {
    setViewRange(range);
    goToday();
  }, [goToday]);

  return {
    rangeStart,
    rangeEnd,
    viewRange,
    dates,
    todayIndex,
    goPrevious,
    goNext,
    goToday,
    goToDate,
    setViewRange: setViewRangeAndReset,
  };
}

export type UseTimelineNavigationResult = ReturnType<typeof useTimelineNavigation>;
