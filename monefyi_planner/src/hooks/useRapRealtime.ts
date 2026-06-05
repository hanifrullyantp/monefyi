import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Refresh RAP/cost data when another user edits the same project (multi-user).
 */
export function useRapRealtime(projectId: string, onRefresh: () => void) {
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`rap-realtime-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_rap_items', filter: `project_id=eq.${projectId}` },
        () => onRefresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_cost_realizations', filter: `project_id=eq.${projectId}` },
        () => onRefresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, onRefresh]);
}
