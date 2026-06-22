import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Refresh RAP/cost data when another user edits the same project (multi-user).
 */
export function useRapRealtime(projectId: string, onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!projectId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onRefreshRef.current(), 400);
    };

    const channel = supabase
      .channel(`rap-realtime-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_rap_items', filter: `project_id=eq.${projectId}` },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_cost_realizations', filter: `project_id=eq.${projectId}` },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [projectId]);
}
