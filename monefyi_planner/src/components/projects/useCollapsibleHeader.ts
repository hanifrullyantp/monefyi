import { useCallback, useEffect, useRef, useState } from 'react';

const COLLAPSE_THRESHOLD = 40;
const EXPANDED_HEIGHT = 280;
const COLLAPSED_HEIGHT = 64;

export function useCollapsibleHeader(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapse, setCollapse] = useState(0);
  const [manualExpanded, setManualExpanded] = useState(false);
  const lastTapRef = useRef(0);

  const onScroll = useCallback(() => {
    if (!enabled || !scrollRef.current) return;
    const y = scrollRef.current.scrollTop;
    if (manualExpanded && y < COLLAPSE_THRESHOLD) {
      setManualExpanded(false);
    }
    const progress = manualExpanded
      ? 0
      : Math.min(1, Math.max(0, (y - COLLAPSE_THRESHOLD) / 80));
    setCollapse(progress);
  }, [enabled, manualExpanded]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [enabled, onScroll]);

  const headerHeight =
    EXPANDED_HEIGHT - (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) * collapse;

  const handleHeaderTap = () => {
    if (collapse < 0.5) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setManualExpanded(true);
      setCollapse(0);
    } else {
      setManualExpanded(true);
      setCollapse(0);
    }
    lastTapRef.current = now;
  };

  return {
    scrollRef,
    collapse,
    headerHeight,
    isCollapsed: collapse > 0.6,
    handleHeaderTap,
    EXPANDED_HEIGHT,
    COLLAPSED_HEIGHT,
  };
}
