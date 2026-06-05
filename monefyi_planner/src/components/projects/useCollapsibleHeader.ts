import { useCallback, useRef, useState } from 'react';

export const EXPANDED_HEIGHT = 280;
export const COLLAPSED_HEIGHT = 64;

/** Manual toggle only — no scroll-driven auto collapse (avoids janky animations). */
export function useCollapsibleHeader(defaultCollapsed = false) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const expandHeader = useCallback(() => {
    setIsCollapsed(false);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const compactHeader = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const toggleHeaderCompact = useCallback(() => {
    setIsCollapsed(v => !v);
    if (isCollapsed) {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isCollapsed]);

  const handleHeaderTap = useCallback(() => {
    if (isCollapsed) expandHeader();
  }, [isCollapsed, expandHeader]);

  return {
    scrollRef,
    collapse: isCollapsed ? 1 : 0,
    isCollapsed,
    handleHeaderTap,
    toggleHeaderCompact,
    expandHeader,
    compactHeader,
    EXPANDED_HEIGHT,
    COLLAPSED_HEIGHT,
  };
}
