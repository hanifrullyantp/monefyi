import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

import type { Project } from '../../store/appStore';
import { loadDemoWorkItems, type WorkItem } from '../../services/workItemService';
import { useGanttStore } from '../../store/ganttStore';
import { normalizeSafeUrl } from '../../components/projects/gantt/GanttDetailPanel';
import { syncDemoWorkItemsFromSnapshot } from '../../components/projects/gantt/useGanttData';
import type { GanttDependency, GanttTask } from './types';
import {
  annotateTasksWithCriticalPath,
  getDeadlineOverrunDays,
  isTaskOverProjectDeadline,
  projectToGanttTask,
  workItemToGanttTask,
} from './utils';
import { cascadeFinishToStartShift, computeCriticalPath } from './criticalPath';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    tenant_id: 'org-1',
    name: 'Renovasi Gedung Utama',
    code: 'PRJ-001',
    client_name: 'PT Nusantara',
    type: 'construction',
    status: 'active',
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    total_budget_planned: 100_000_000,
    currency: 'IDR',
    progress_percentage: 25,
    health_status: 'on_track',
    planned_progress: 30,
    spent_amount: 20_000_000,
    total_received: 50_000_000,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'wi-1',
    project_id: 'proj-1',
    parent_id: null,
    name: 'Pekerjaan Struktur',
    planned_start: '2026-11-01',
    planned_end: '2026-11-10',
    progress_pct: 40,
    status: 'in_progress',
    sort_order: 1,
    updated_at: '2026-11-05T08:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<GanttTask> = {}): GanttTask {
  return {
    id: 'wi-1',
    type: 'work_item',
    projectId: 'proj-1',
    parentId: 'proj-1',
    name: 'Tugas 1',
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    progress: 0,
    status: 'pending',
    priority: 'medium',
    sortOrder: 0,
    ...overrides,
  };
}

function resetStore(tasks: GanttTask[], dependencies: GanttDependency[] = []) {
  useGanttStore.setState({
    orgId: 'org-1',
    tasks: [],
    dependencies: [],
    projectOrder: ['proj-1'],
    barColors: {},
    baseline: null,
    undoStack: [],
    redoStack: [],
    expandedIds: new Set(['proj-1']),
    selectedIds: new Set(),
    drag: null,
    isDirty: false,
    isSaving: false,
    hasDraft: false,
    editTaskId: null,
    showCriticalPath: true,
    conflictPrompt: null,
  });
  useGanttStore.getState().setTasks(tasks);
  useGanttStore.getState().setDependencies(dependencies, false);
  useGanttStore.getState().commitBaseline();
}

describe('Phase 3 Gantt utils (F-12, F-14, F-28)', () => {
  it('maps WorkItem priority, assigneeName (Map/Record), parent_id, notes, and attachments in workItemToGanttTask', () => {
    const project = makeProject({ health_status: 'on_track', status: 'active' });
    const wi = makeWorkItem({
      id: 'wi-sub',
      parent_id: 'wi-parent',
      assigned_member_id: 'mem-1',
      priority: 'critical',
      notes: [{ id: 'n1', text: 'Cek bekisting', authorName: 'Budi', createdAt: '2026-11-02T09:00:00Z' }],
      attachments: [{ id: 'a1', name: 'RAB.pdf', url: 'https://example.com/rab.pdf', addedAt: '2026-11-02T10:00:00Z' }],
    });

    const fromMap = workItemToGanttTask(wi, project, new Map([['mem-1', 'Budi Santoso']]));
    expect(fromMap).toMatchObject({
      id: 'wi-sub',
      parentId: 'wi-parent',
      priority: 'critical',
      assignedMemberId: 'mem-1',
      assigneeId: 'mem-1',
      assigneeName: 'Budi Santoso',
      notesCount: 1,
      attachmentsCount: 1,
      updatedAt: '2026-11-05T08:00:00Z',
    });

    const fromRecord = workItemToGanttTask(
      makeWorkItem({ id: 'wi-root', parent_id: 'wi-root', assigned_member_id: 'mem-2' }),
      makeProject({ health_status: 'behind' }),
      { 'mem-2': 'Siti' },
    );
    // Self-parenting falls back to project.id; missing priority infers from project health
    expect(fromRecord.parentId).toBe('proj-1');
    expect(fromRecord.priority).toBe('high');
    expect(fromRecord.assigneeName).toBe('Siti');
  });

  it('detects deadline overruns accurately (F-28)', () => {
    expect(isTaskOverProjectDeadline('2026-11-30', '2026-11-30')).toBe(false);
    expect(getDeadlineOverrunDays('2026-11-30', '2026-11-30')).toBe(0);

    expect(isTaskOverProjectDeadline('2026-12-04', '2026-11-30')).toBe(true);
    expect(getDeadlineOverrunDays('2026-12-04', '2026-11-30')).toBe(4);

    expect(isTaskOverProjectDeadline(null, '2026-11-30')).toBe(false);
    expect(getDeadlineOverrunDays('2026-12-04', undefined)).toBe(0);
  });

  it('annotates work_item tasks with CPM results while keeping project rows non-critical', () => {
    const projectTask = projectToGanttTask(makeProject(), 0);
    const tA = makeTask({ id: 'A', startDate: '2026-11-01', endDate: '2026-11-05' });
    const tB = makeTask({ id: 'B', startDate: '2026-11-06', endDate: '2026-11-10' });
    const tC = makeTask({ id: 'C', startDate: '2026-11-01', endDate: '2026-11-03' });
    const deps: GanttDependency[] = [
      { id: 'A__B', fromTaskId: 'A', toTaskId: 'B', type: 'finish_to_start' },
    ];

    const cpm = computeCriticalPath([projectTask, tA, tB, tC], deps);
    const annotated = annotateTasksWithCriticalPath(
      [{ ...projectTask, isCritical: true }, tA, tB, tC],
      cpm,
    );

    expect(annotated[0].isCritical).toBe(false);
    expect(annotated[0].totalFloatDays).toBeUndefined();
    expect(annotated[1].isCritical).toBe(true);
    expect(annotated[1].totalFloatDays).toBe(0);
    expect(annotated[2].isCritical).toBe(true);
    expect(annotated[2].totalFloatDays).toBe(0);
    expect(annotated[3].isCritical).toBe(false);
    expect(annotated[3].totalFloatDays).toBe(7);
  });
});

describe('Phase 3 ganttStore behaviors & FS cascade undo/redo', () => {
  beforeEach(() => {
    resetStore([
      makeTask({ id: 'proj-1', type: 'project', parentId: null, startDate: '2026-11-01', endDate: '2026-11-30' }),
      makeTask({ id: 'A', startDate: '2026-11-01', endDate: '2026-11-03' }),
      makeTask({ id: 'B', startDate: '2026-11-04', endDate: '2026-11-05' }),
      makeTask({ id: 'C', startDate: '2026-11-06', endDate: '2026-11-08' }),
    ], [
      { id: 'A__B', fromTaskId: 'A', toTaskId: 'B', type: 'finish_to_start' },
      { id: 'B__C', fromTaskId: 'B', toTaskId: 'C', type: 'finish_to_start' },
    ]);
  });

  it('toggles showCriticalPath and stores conflictPrompt cleanly', () => {
    expect(useGanttStore.getState().showCriticalPath).toBe(true);
    useGanttStore.getState().toggleCriticalPath();
    expect(useGanttStore.getState().showCriticalPath).toBe(false);
    useGanttStore.getState().setShowCriticalPath(true);
    expect(useGanttStore.getState().showCriticalPath).toBe(true);

    useGanttStore.getState().setConflictPrompt({
      workItemId: 'A',
      taskName: 'Tugas A',
      localUpdatedAt: '2026-11-10T01:00:00Z',
      serverUpdatedAt: '2026-11-10T02:00:00Z',
      message: 'Konflik',
    });
    expect(useGanttStore.getState().conflictPrompt?.workItemId).toBe('A');
    useGanttStore.getState().setConflictPrompt(null);
    expect(useGanttStore.getState().conflictPrompt).toBeNull();
  });

  it('updates notes/attachments via updateTaskExtendedMetaLocal while preserving Undo/Redo and clean baseline', () => {
    const store = useGanttStore.getState();
    store.updateTask('A', { priority: 'critical', assignedMemberId: 'mem-1', assigneeName: 'Andi' }, true);
    expect(useGanttStore.getState().isDirty).toBe(true);
    expect(useGanttStore.getState().undoStack).toHaveLength(1);

    // Persisting a note or attachment updates current tasks, baseline, and undoStack in lockstep
    useGanttStore.getState().updateTaskExtendedMetaLocal('A', {
      notes: [{ id: 'n1', text: 'Material tiba', authorName: 'Andi', createdAt: '2026-11-01T10:00:00Z' }],
      attachments: [{ id: 'd1', name: 'Surat Jalan', url: 'https://example.com/sj', addedAt: '2026-11-01T10:05:00Z' }],
    });

    let state = useGanttStore.getState();
    const taskA = state.tasks.find(t => t.id === 'A')!;
    expect(taskA.notesCount).toBe(1);
    expect(taskA.attachmentsCount).toBe(1);
    expect(state.isDirty).toBe(true);

    // 1x Undo restores original priority & assignee while keeping persisted notes/attachments
    state.undo();
    state = useGanttStore.getState();
    const restoredA = state.tasks.find(t => t.id === 'A')!;
    expect(restoredA.priority).toBe('medium');
    expect(restoredA.assignedMemberId).toBeUndefined();
    expect(restoredA.notesCount).toBe(1);
    expect(restoredA.attachmentsCount).toBe(1);
    expect(state.isDirty).toBe(false);

    // 1x Redo reapplies priority & assignee while still keeping persisted notes/attachments
    state.redo();
    const redoneA = useGanttStore.getState().tasks.find(t => t.id === 'A')!;
    expect(redoneA.priority).toBe('critical');
    expect(redoneA.assignedMemberId).toBe('mem-1');
    expect(redoneA.notesCount).toBe(1);
  });

  it('cascades Finish-to-Start shifts atomically within 1x Undo and 1x Redo', () => {
    const store = useGanttStore.getState();
    const preDragSnap = store.getSnapshot();

    // Simulate GanttTaskBar drag moving A from Nov 1..3 to Nov 4..6
    store.updateTask('A', { startDate: '2026-11-04', endDate: '2026-11-06' }, false);
    store.pushHistory(preDragSnap);

    // Simulate commitDates running cascadeFinishToStartShift with recordHistory = false
    const currentState = useGanttStore.getState();
    const cascaded = cascadeFinishToStartShift('A', '2026-11-06', currentState.tasks, currentState.dependencies);
    expect(cascaded).toEqual([
      { id: 'B', startDate: '2026-11-07', endDate: '2026-11-08' },
      { id: 'C', startDate: '2026-11-09', endDate: '2026-11-11' },
    ]);
    currentState.updateMultipleTasks(
      cascaded.map(u => ({ id: u.id, patch: { startDate: u.startDate, endDate: u.endDate } })),
      false,
    );

    let afterCascade = useGanttStore.getState();
    expect(afterCascade.undoStack).toHaveLength(1);
    expect(afterCascade.isDirty).toBe(true);
    expect(afterCascade.tasks.find(t => t.id === 'B')?.startDate).toBe('2026-11-07');
    expect(afterCascade.tasks.find(t => t.id === 'C')?.endDate).toBe('2026-11-11');

    // 1x Undo restores BOTH A and cascaded successors B & C
    afterCascade.undo();
    const afterUndo = useGanttStore.getState();
    expect(afterUndo.isDirty).toBe(false);
    expect(afterUndo.tasks.find(t => t.id === 'A')).toMatchObject({ startDate: '2026-11-01', endDate: '2026-11-03' });
    expect(afterUndo.tasks.find(t => t.id === 'B')).toMatchObject({ startDate: '2026-11-04', endDate: '2026-11-05' });
    expect(afterUndo.tasks.find(t => t.id === 'C')).toMatchObject({ startDate: '2026-11-06', endDate: '2026-11-08' });

    // 1x Redo reapplies A, B, and C together
    afterUndo.redo();
    const afterRedo = useGanttStore.getState();
    expect(afterRedo.isDirty).toBe(true);
    expect(afterRedo.tasks.find(t => t.id === 'A')?.endDate).toBe('2026-11-06');
    expect(afterRedo.tasks.find(t => t.id === 'B')?.startDate).toBe('2026-11-07');
    expect(afterRedo.tasks.find(t => t.id === 'C')?.endDate).toBe('2026-11-11');
  });

  it('adds tasks with syncBaseline + dependencies and cascades removeTask across descendants and dependencies', () => {
    const child = makeTask({
      id: 'B1',
      parentId: 'B',
      startDate: '2026-11-04',
      endDate: '2026-11-05',
      priority: 'high',
      assignedMemberId: 'mem-9',
    });

    useGanttStore.getState().addTask(child, {
      recordHistory: false,
      syncBaseline: true,
      dependencies: [{ id: 'A__B1', fromTaskId: 'A', toTaskId: 'B1', type: 'finish_to_start' }],
    });

    let state = useGanttStore.getState();
    expect(state.isDirty).toBe(false);
    expect(state.expandedIds.has('B')).toBe(true);
    expect(state.dependencies.some(d => d.id === 'A__B1')).toBe(true);

    // Removing B removes descendant B1 and cleans up A__B, B__C, and A__B1
    state.removeTask('B', { recordHistory: false, syncBaseline: true });
    state = useGanttStore.getState();
    expect(state.tasks.map(t => t.id)).toEqual(['proj-1', 'A', 'C']);
    expect(state.dependencies).toEqual([]);
    expect(state.isDirty).toBe(false);
  });
});

describe('Phase 3 review fixes (normalizeSafeUrl & demo work item snapshot sync)', () => {
  const originalLocalStorage = globalThis.localStorage;

  afterEach(() => {
    if (originalLocalStorage === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
    }
  });

  it('allows only http(s) URLs and safe single-slash relative paths in normalizeSafeUrl', () => {
    expect(normalizeSafeUrl('https://drive.google.com/file/d/123/view')).toBe(
      'https://drive.google.com/file/d/123/view',
    );
    expect(normalizeSafeUrl('http://localhost:3000/docs/plan.pdf')).toBe(
      'http://localhost:3000/docs/plan.pdf',
    );
    expect(normalizeSafeUrl('  https://example.com/rab.pdf?v=2#top  ')).toBe(
      'https://example.com/rab.pdf?v=2#top',
    );
    expect(normalizeSafeUrl('/docs/plan.pdf')).toBe('/docs/plan.pdf');
    expect(normalizeSafeUrl('/assets/foto-1.png?dl=1')).toBe('/assets/foto-1.png?dl=1');
  });

  it('rejects XSS schemes, protocol-relative URLs, backslashes, whitespace, and control chars in normalizeSafeUrl', () => {
    expect(normalizeSafeUrl('')).toBeNull();
    expect(normalizeSafeUrl('   ')).toBeNull();
    expect(normalizeSafeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeSafeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(normalizeSafeUrl('java\tscript:alert(1)')).toBeNull();
    expect(normalizeSafeUrl('java\nscript:alert(1)')).toBeNull();
    expect(normalizeSafeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(normalizeSafeUrl('vbscript:msgbox(1)')).toBeNull();
    expect(normalizeSafeUrl('file:///etc/passwd')).toBeNull();
    expect(normalizeSafeUrl('ftp://example.com/file.pdf')).toBeNull();
    expect(normalizeSafeUrl('//evil.com/payload.js')).toBeNull();
    expect(normalizeSafeUrl('///evil.com')).toBeNull();
    expect(normalizeSafeUrl('/')).toBeNull();
    expect(normalizeSafeUrl('/\\evil.com')).toBeNull();
    expect(normalizeSafeUrl('https://example.com/my file.pdf')).toBeNull();
    expect(normalizeSafeUrl('https://example.com/a\u0000b')).toBeNull();
    expect(normalizeSafeUrl('https://example.com/a\u007Fb')).toBeNull();
    expect(normalizeSafeUrl('drive.google.com/file')).toBeNull();
  });

  it('persists edited demo work items and dependencies per project via syncDemoWorkItemsFromSnapshot', () => {
    const storeMap = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => storeMap.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storeMap.set(k, v);
        },
        removeItem: (k: string) => {
          storeMap.delete(k);
        },
        clear: () => {
          storeMap.clear();
        },
      } as unknown as Storage,
      configurable: true,
      writable: true,
    });

    const projectTask = makeTask({
      id: 'demo-proj-1',
      type: 'project',
      projectId: 'demo-proj-1',
      parentId: null,
    });
    const task1 = makeTask({
      id: 'demo-wi-1',
      projectId: 'demo-proj-1',
      parentId: 'demo-proj-1',
      name: 'Pondasi Baru',
      startDate: '2026-11-02',
      endDate: '2026-11-06',
      progress: 75,
      status: 'in_progress',
      priority: 'high',
      assignedMemberId: 'mem-1',
      notes: [{ id: 'n1', text: 'Cor selesai', authorName: 'Andi', createdAt: '2026-11-03T08:00:00Z' }],
      attachments: [{ id: 'a1', name: 'RAB', url: 'https://example.com/rab.pdf', addedAt: '2026-11-03T08:05:00Z' }],
    });
    const task2 = makeTask({
      id: 'demo-wi-2',
      projectId: 'demo-proj-1',
      parentId: 'demo-proj-1',
      name: 'Dinding',
      startDate: '2026-11-07',
      endDate: '2026-11-12',
      progress: 0,
      status: 'pending',
    });
    const deps: GanttDependency[] = [
      { id: 'demo-wi-1__demo-wi-2', fromTaskId: 'demo-wi-1', toTaskId: 'demo-wi-2', type: 'finish_to_start' },
    ];

    const synced = syncDemoWorkItemsFromSnapshot(
      [projectTask, task1, task2],
      deps,
      [makeWorkItem({ id: 'demo-wi-1', project_id: 'demo-proj-1' })],
      ['demo-proj-1', 'demo-proj-empty'],
    );

    expect(synced).toHaveLength(2);
    const loadedProj1 = loadDemoWorkItems('demo-proj-1');
    expect(loadedProj1).toHaveLength(2);
    expect(loadedProj1[0]).toMatchObject({
      id: 'demo-wi-1',
      name: 'Pondasi Baru',
      planned_start: '2026-11-02',
      planned_end: '2026-11-06',
      progress_pct: 75,
      priority: 'high',
      assigned_member_id: 'mem-1',
    });
    expect(loadedProj1[0].notes).toHaveLength(1);
    expect(loadedProj1[0].attachments).toHaveLength(1);
    expect(loadedProj1[1].dependencies).toEqual(['demo-wi-1']);
    expect(loadDemoWorkItems('demo-proj-empty')).toEqual([]);
  });
});
