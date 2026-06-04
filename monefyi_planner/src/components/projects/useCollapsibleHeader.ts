import { useCallback, useEffect, useRef, useState } from 'react';

const COLLAPSE_THRESHOLD = 40;
export const EXPANDED_HEIGHT = 280;
export const COLLAPSED_HEIGHT = 64;

export type HeaderSizeMode = 'auto' | 'expanded' | 'compact';

export function useCollapsibleHeader() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollCollapse, setScrollCollapse] = useState(0);
  const [headerSize, setHeaderSize] = useState<HeaderSizeMode>('auto');
  const lastTapRef = useRef(0);

  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const y = scrollRef.current.scrollTop;

    if (headerSize === 'compact') return;

    if (headerSize === 'expanded' && y > COLLAPSE_THRESHOLD) {
      setHeaderSize('auto');
    }

    if (headerSize !== 'auto') return;

    const progress = Math.min(1, Math.max(0, (y - COLLAPSE_THRESHOLD) / 80));
    setScrollCollapse(progress);
  }, [headerSize]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const collapse =
    headerSize === 'compact' ? 1 : headerSize === 'expanded' ? 0 : scrollCollapse;

  const isCollapsed = collapse > 0.5;

  const headerHeight =
    EXPANDED_HEIGHT - (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) * collapse;

  const expandHeader = useCallback(() => {
    setHeaderSize('expanded');
    setScrollCollapse(0);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const compactHeader = useCallback(() => {
    setHeaderSize('compact');
  }, []);

  const toggleHeaderCompact = useCallback(() => {
    if (isCollapsed) {
      expandHeader();
    } else {
      compactHeader();
    }
  }, [compactHeader, expandHeader, isCollapsed]);

  const handleHeaderTap = () => {
    if (!isCollapsed) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      expandHeader();
    } else {
      expandHeader();
    }
    lastTapRef.current = now;
  };

  return {
    scrollRef,
    collapse,
    headerHeight,
    isCollapsed,
    headerSize,
    handleHeaderTap,
    toggleHeaderCompact,
    expandHeader,
    compactHeader,
    EXPANDED_HEIGHT,
    COLLAPSED_HEIGHT,
  };
}
