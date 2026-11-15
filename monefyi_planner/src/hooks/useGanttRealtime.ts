import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import { isDemoOrgId } from '../lib/demo/demoMode';

export interface GanttRealtimePayload {
  eventType?: string;
  new?: Record<string, unknown> | null;
  old?: Record<string, unknown> | null;
}

export interface UseGanttRealtimeOptions {
  orgId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  projectIds?: string[];
  isDemoMode?: boolean;
  enabled?: boolean;
  debounceMs?: number;
  onRefresh: () => void | Promise<void>;
}

interface RealtimeChannelLike {
  on: (
    type: 'postgres_changes',
    filter: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    },
    callback: (payload?: GanttRealtimePayload) => void,
  ) => RealtimeChannelLike;
  subscribe: () => RealtimeChannelLike;
}

export interface RealtimeSupabaseLike {
  channel?: (name: string) => RealtimeChannelLike;
  removeChannel?: (channel: unknown) => unknown;
}

function isDemoIdentifier(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === 'demo' || id.startsWith('demo-') || isDemoOrgId(id);
}

/**
 * Returns true when Gantt Realtime subscription must be skipped
 * (e.g. disabled, Demo mode, or missing org/project identifier).
 */
export function isGanttRealtimeDisabled(params: {
  orgId?: string | null;
  companyId?: string | null;
  projectId?: string | null;
  isDemoMode?: boolean;
  enabled?: boolean;
}): boolean {
  if (params.enabled === false) return true;
  if (params.isDemoMode) return true;
  const effectiveOrgId = params.orgId ?? params.companyId ?? null;
  if (!effectiveOrgId && !params.projectId) return true;
  if (isDemoIdentifier(effectiveOrgId) || isDemoIdentifier(params.projectId)) return true;
  return false;
}

/**
 * Filters `planner_work_items` postgres_changes payloads to relevant project(s),
 * preserving DELETE events when `REPLICA IDENTITY DEFAULT` omits `project_id`.
 */
export function shouldHandleWorkItemRealtimePayload(
  payload: GanttRealtimePayload | undefined,
  projectId?: string | null,
  projectIds?: string[],
): boolean {
  if (!payload) {
    return Boolean(projectId || (projectIds && projectIds.length > 0));
  }

  const newPid = typeof payload.new?.project_id === 'string' ? payload.new.project_id : null;
  const oldPid = typeof payload.old?.project_id === 'string' ? payload.old.project_id : null;
  const rowProjectId = newPid || oldPid;

  if (projectId) {
    return !rowProjectId || rowProjectId === projectId;
  }

  if (!projectIds || projectIds.length === 0) {
    return false;
  }

  if (rowProjectId) {
    return projectIds.includes(rowProjectId);
  }

  return payload.eventType === 'DELETE';
}

export interface SubscribeGanttRealtimeOptions extends UseGanttRealtimeOptions {
  getProjectIds?: () => string[] | undefined;
  supabaseClient?: RealtimeSupabaseLike | null;
}

let channelInstanceSeq = 0;

/**
 * Subscribes to `planner_work_items` and `planner_projects` realtime updates
 * with debouncing and safe cleanup.
 */
export function subscribeGanttRealtime(options: SubscribeGanttRealtimeOptions): () => void {
  const {
    orgId,
    companyId,
    projectId,
    projectIds,
    getProjectIds,
    isDemoMode = false,
    enabled = true,
    debounceMs = 400,
    supabaseClient = supabase as unknown as RealtimeSupabaseLike,
    onRefresh,
  } = options;

  const effectiveOrgId = orgId ?? companyId ?? null;

  if (
    isGanttRealtimeDisabled({
      orgId: effectiveOrgId,
      projectId,
      isDemoMode,
      enabled,
    })
  ) {
    return () => {};
  }

  if (!supabaseClient || typeof supabaseClient.channel !== 'function') {
    return () => {};
  }

  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleRefresh = () => {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (disposed) return;
      void onRefresh();
    }, debounceMs);
  };

  const instanceId = ++channelInstanceSeq;
  const channelName = projectId
    ? `gantt-realtime-project-${projectId}-${instanceId}`
    : `gantt-realtime-org-${effectiveOrgId}-${instanceId}`;

  let channel: RealtimeChannelLike;
  try {
    channel = supabaseClient.channel(channelName).on(
      'postgres_changes',
      projectId
        ? {
            event: '*',
            schema: 'public',
            table: 'planner_work_items',
            filter: `project_id=eq.${projectId}`,
          }
        : {
            event: '*',
            schema: 'public',
            table: 'planner_work_items',
          },
      payload => {
        const currentProjectIds = getProjectIds ? getProjectIds() : projectIds;
        if (shouldHandleWorkItemRealtimePayload(payload, projectId, currentProjectIds)) {
          scheduleRefresh();
        }
      },
    );

    if (projectId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_projects',
          filter: `id=eq.${projectId}`,
        },
        () => scheduleRefresh(),
      );
    } else if (effectiveOrgId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_projects',
          filter: `org_id=eq.${effectiveOrgId}`,
        },
        () => scheduleRefresh(),
      );
    }

    channel.subscribe();
  } catch (err) {
    console.warn('[GanttRealtime] subscribe failed:', err);
    return () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }

  return () => {
    disposed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (typeof supabaseClient.removeChannel === 'function') {
      void supabaseClient.removeChannel(channel);
    }
  };
}

/**
 * React hook that keeps Gantt data synchronized across tabs via Supabase Realtime.
 */
export function useGanttRealtime(options: UseGanttRealtimeOptions): void {
  const storeDemoMode = useAppStore(s => s.isDemoMode);
  const effectiveOrgId = options.orgId ?? options.companyId ?? null;
  const effectiveDemo = Boolean(options.isDemoMode || storeDemoMode);
  const enabled = options.enabled ?? true;
  const debounceMs = options.debounceMs ?? 400;

  const onRefreshRef = useRef(options.onRefresh);
  onRefreshRef.current = options.onRefresh;

  const projectIdsRef = useRef(options.projectIds);
  projectIdsRef.current = options.projectIds;

  useEffect(() => {
    return subscribeGanttRealtime({
      orgId: effectiveOrgId,
      projectId: options.projectId,
      getProjectIds: () => projectIdsRef.current,
      isDemoMode: effectiveDemo,
      enabled,
      debounceMs,
      onRefresh: () => onRefreshRef.current(),
    });
  }, [effectiveOrgId, options.projectId, effectiveDemo, enabled, debounceMs]);
}
