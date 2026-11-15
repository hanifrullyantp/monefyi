import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GanttTask } from '../../lib/gantt/types';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import { useGanttStore } from '../ganttStore';
import {
  isGanttRealtimeDisabled,
  shouldHandleWorkItemRealtimePayload,
  subscribeGanttRealtime,
  type GanttRealtimePayload,
} from '../../hooks/useGanttRealtime';

function makeTask(overrides: Partial<GanttTask> = {}): GanttTask {
  return {
    id: 'wi-1',
    type: 'work_item',
    projectId: 'proj-1',
    parentId: 'proj-1',
    name: 'Integrasi Payment Gateway',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    progress: 25,
    status: 'in_progress',
    priority: 'medium',
    sortOrder: 0,
    ...overrides,
  };
}

function resetGanttStore(tasks: GanttTask[], barColors: Record<string, string> = {}) {
  useGanttStore.setState({
    orgId: 'org-1',
    tasks: [],
    dependencies: [],
    projectOrder: ['proj-1'],
    barColors: {},
    baseline: null,
    undoStack: [],
    redoStack: [],
    drag: null,
    isDirty: false,
    isSaving: false,
    hasDraft: false,
    editTaskId: null,
  });
  const colored = tasks.map(t => ({
    ...t,
    barColor: barColors[t.id] || undefined,
  }));
  useGanttStore.getState().setBarColors(barColors);
  useGanttStore.getState().setTasks(colored);
  useGanttStore.getState().commitBaseline();
}

describe('ganttStore undo/redo and barColor history (F-29)', () => {
  beforeEach(() => {
    resetGanttStore([makeTask()]);
  });

  it('restores both task dates/fields and barColor with 1x Undo when modal edits skipHistory on setBarColor', () => {
    const store = useGanttStore.getState();

    // Simulate GanttEditModal.handleSave: 1x pushHistory + updateTask(..., false) + setBarColor(..., { skipHistory: true })
    store.pushHistory();
    store.updateTask(
      'wi-1',
      {
        name: 'Integrasi Payment Gateway v2',
        startDate: '2026-11-03',
        endDate: '2026-11-12',
        progress: 60,
        status: 'in_progress',
      },
      false,
    );
    store.setBarColor('wi-1', '#3B82F6', { skipHistory: true });

    let state = useGanttStore.getState();
    expect(state.undoStack).toHaveLength(1);
    expect(state.isDirty).toBe(true);
    expect(state.barColors['wi-1']).toBe('#3B82F6');
    expect(state.tasks[0].barColor).toBe('#3B82F6');
    expect(state.tasks[0].startDate).toBe('2026-11-03');

    // 1x Undo must restore BOTH dates/name/progress AND original barColor (undefined)
    state.undo();
    state = useGanttStore.getState();
    expect(state.undoStack).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);
    expect(state.tasks[0].name).toBe('Integrasi Payment Gateway');
    expect(state.tasks[0].startDate).toBe('2026-11-01');
    expect(state.tasks[0].endDate).toBe('2026-11-10');
    expect(state.tasks[0].progress).toBe(25);
    expect(state.tasks[0].barColor).toBeUndefined();
    expect(state.barColors['wi-1']).toBeUndefined();
    expect(state.isDirty).toBe(false);

    // 1x Redo must reapply BOTH edited task fields AND barColor
    state.redo();
    state = useGanttStore.getState();
    expect(state.tasks[0].startDate).toBe('2026-11-03');
    expect(state.tasks[0].barColor).toBe('#3B82F6');
    expect(state.barColors['wi-1']).toBe('#3B82F6');
    expect(state.isDirty).toBe(true);
  });

  it('supports boolean false shorthand for setBarColor skipHistory', () => {
    resetGanttStore([makeTask()], { 'wi-1': '#10B981' });
    const store = useGanttStore.getState();

    store.pushHistory();
    store.updateTask('wi-1', { endDate: '2026-11-15' }, false);
    store.setBarColor('wi-1', '#EF4444', false);

    expect(useGanttStore.getState().undoStack).toHaveLength(1);

    useGanttStore.getState().undo();
    const afterUndo = useGanttStore.getState();
    expect(afterUndo.tasks[0].endDate).toBe('2026-11-10');
    expect(afterUndo.tasks[0].barColor).toBe('#10B981');
    expect(afterUndo.barColors['wi-1']).toBe('#10B981');
    expect(afterUndo.isDirty).toBe(false);
  });

  it('keeps default setBarColor backward-compatible (records 1 history step) and ignores no-op color changes', () => {
    const store = useGanttStore.getState();

    // No-op clearing when already unset does not push history or dirty state
    store.setBarColor('wi-1', null);
    expect(useGanttStore.getState().undoStack).toHaveLength(0);
    expect(useGanttStore.getState().isDirty).toBe(false);

    // Setting a new color pushes 1 history entry
    store.setBarColor('wi-1', '#8B5CF6');
    expect(useGanttStore.getState().undoStack).toHaveLength(1);
    expect(useGanttStore.getState().isDirty).toBe(true);
    expect(useGanttStore.getState().tasks[0].barColor).toBe('#8B5CF6');

    // Setting the exact same color again is a no-op
    useGanttStore.getState().setBarColor('wi-1', '#8B5CF6');
    expect(useGanttStore.getState().undoStack).toHaveLength(1);

    // 1x Undo clears color and restores clean baseline
    useGanttStore.getState().undo();
    expect(useGanttStore.getState().tasks[0].barColor).toBeUndefined();
    expect(useGanttStore.getState().barColors['wi-1']).toBeUndefined();
    expect(useGanttStore.getState().isDirty).toBe(false);
  });

  it('deduplicates consecutive identical snapshots in pushHistory', () => {
    const store = useGanttStore.getState();

    store.pushHistory();
    store.pushHistory();
    expect(useGanttStore.getState().undoStack).toHaveLength(1);

    // Simulates GanttDetailPanel pattern: pushHistory(); setBarColor(...)
    useGanttStore.getState().setBarColor('wi-1', '#F59E0B');
    expect(useGanttStore.getState().undoStack).toHaveLength(1);

    useGanttStore.getState().undo();
    expect(useGanttStore.getState().tasks[0].barColor).toBeUndefined();
    expect(useGanttStore.getState().isDirty).toBe(false);
  });

  it('records explicit pre-drag snapshot via pushHistory(snap) and restores clean state in 1x Undo', () => {
    const preDragSnap = useGanttStore.getState().getSnapshot();
    useGanttStore.getState().updateTask('wi-1', { startDate: '2026-11-05', endDate: '2026-11-14' }, false);
    useGanttStore.getState().pushHistory(preDragSnap);

    expect(useGanttStore.getState().undoStack).toHaveLength(1);
    expect(useGanttStore.getState().isDirty).toBe(true);

    useGanttStore.getState().undo();
    const afterUndo = useGanttStore.getState();
    expect(afterUndo.tasks[0].startDate).toBe('2026-11-01');
    expect(afterUndo.tasks[0].endDate).toBe('2026-11-10');
    expect(afterUndo.isDirty).toBe(false);
  });
});

describe('useGanttRealtime guards, filtering, debounce & cleanup (F-19 & F-10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips realtime subscription for demo mode, demo IDs, disabled flag, or missing identifiers', () => {
    expect(isGanttRealtimeDisabled({ orgId: 'org-1', isDemoMode: true })).toBe(true);
    expect(isGanttRealtimeDisabled({ orgId: 'demo' })).toBe(true);
    expect(isGanttRealtimeDisabled({ orgId: 'demo-org-embed' })).toBe(true);
    expect(isGanttRealtimeDisabled({ projectId: 'demo' })).toBe(true);
    expect(isGanttRealtimeDisabled({ projectId: 'demo-proj-1' })).toBe(true);
    expect(isGanttRealtimeDisabled({ orgId: undefined, projectId: undefined })).toBe(true);
    expect(isGanttRealtimeDisabled({ orgId: 'org-1', enabled: false })).toBe(true);

    expect(isGanttRealtimeDisabled({ orgId: '550e8400-e29b-41d4-a716-446655440000' })).toBe(false);
    expect(isGanttRealtimeDisabled({ projectId: '550e8400-e29b-41d4-a716-446655440001' })).toBe(false);

    const channelSpy = vi.fn();
    const unsubDemo = subscribeGanttRealtime({
      orgId: 'demo',
      isDemoMode: true,
      onRefresh: vi.fn(),
      supabaseClient: { channel: channelSpy, removeChannel: vi.fn() },
    });
    const unsubMissing = subscribeGanttRealtime({
      onRefresh: vi.fn(),
      supabaseClient: { channel: channelSpy, removeChannel: vi.fn() },
    });
    const unsubNoClient = subscribeGanttRealtime({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      onRefresh: vi.fn(),
      supabaseClient: null,
    });

    expect(channelSpy).not.toHaveBeenCalled();
    unsubDemo();
    unsubMissing();
    unsubNoClient();
  });

  it('filters planner_work_items payloads accurately across single-project and org modes', () => {
    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'UPDATE', new: { id: 'w1', project_id: 'p1' } },
        'p1',
      ),
    ).toBe(true);

    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'UPDATE', new: { id: 'w1', project_id: 'p2' } },
        'p1',
      ),
    ).toBe(false);

    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'INSERT', new: { id: 'w1', project_id: 'p2' } },
        undefined,
        ['p1', 'p2'],
      ),
    ).toBe(true);

    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'INSERT', new: { id: 'w1', project_id: 'p3' } },
        undefined,
        ['p1', 'p2'],
      ),
    ).toBe(false);

    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'DELETE', old: { id: 'w1' } },
        undefined,
        ['p1'],
      ),
    ).toBe(true);

    expect(
      shouldHandleWorkItemRealtimePayload(
        { eventType: 'DELETE', old: { id: 'w1' } },
        undefined,
        [],
      ),
    ).toBe(false);
  });

  it('subscribes to postgres_changes, debounces refreshes, and unsubscribes cleanly without leaking timers', () => {
    const handlers: Array<{ table: string; filter?: string; cb: (payload?: GanttRealtimePayload) => void }> = [];
    const subscribeMock = vi.fn();
    const channelObj = {
      on: vi.fn((_type, filterConfig: { table: string; filter?: string }, cb: (payload?: GanttRealtimePayload) => void) => {
        handlers.push({ table: filterConfig.table, filter: filterConfig.filter, cb });
        return channelObj;
      }),
      subscribe: subscribeMock.mockImplementation(() => channelObj),
    };
    const removeChannelMock = vi.fn();
    const channelMock = vi.fn(() => channelObj);
    const onRefresh = vi.fn();

    const unsubscribe = subscribeGanttRealtime({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      projectIds: ['p1', 'p2'],
      debounceMs: 400,
      onRefresh,
      supabaseClient: {
        channel: channelMock,
        removeChannel: removeChannelMock,
      },
    });

    expect(channelMock).toHaveBeenCalledWith(
      expect.stringMatching(/^gantt-realtime-org-550e8400-e29b-41d4-a716-446655440000-\d+$/),
    );
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(handlers.map(h => h.table)).toEqual(['planner_work_items', 'planner_projects']);

    // Second concurrent subscribe uses a distinct topic name so Supabase never throws "after subscribe()"
    const firstTopic = (channelMock.mock.calls as unknown[][])[0]?.[0];
    const unsubscribe2 = subscribeGanttRealtime({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      projectIds: ['p1', 'p2'],
      debounceMs: 400,
      onRefresh,
      supabaseClient: {
        channel: channelMock,
        removeChannel: removeChannelMock,
      },
    });
    const secondTopic = (channelMock.mock.calls as unknown[][])[1]?.[0];
    expect(secondTopic).not.toBe(firstTopic);
    unsubscribe2();

    const workItemHandler = handlers.find(h => h.table === 'planner_work_items')!.cb;

    // Unrelated project should be ignored
    workItemHandler({ eventType: 'UPDATE', new: { id: 'w9', project_id: 'other-proj' } });
    vi.advanceTimersByTime(500);
    expect(onRefresh).not.toHaveBeenCalled();

    // Burst of matching updates debounces to 1 refresh
    workItemHandler({ eventType: 'UPDATE', new: { id: 'w1', project_id: 'p1' } });
    workItemHandler({ eventType: 'UPDATE', new: { id: 'w2', project_id: 'p2' } });
    vi.advanceTimersByTime(399);
    expect(onRefresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Unmount cancels pending timer and removes channel
    workItemHandler({ eventType: 'UPDATE', new: { id: 'w1', project_id: 'p1' } });
    unsubscribe();
    vi.advanceTimersByTime(500);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(removeChannelMock).toHaveBeenCalledWith(channelObj);
  });
});
