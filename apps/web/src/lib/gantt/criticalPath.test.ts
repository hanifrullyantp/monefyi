import { describe, expect, it } from 'vitest';
import type { GanttDependency, GanttTask } from './types';
import type { WorkItem } from '../../services/workItemService';
import {
  cascadeFinishToStartShift,
  computeCriticalPath,
  computeWorkItemsCriticalPath,
  dependencyTypeDbToGantt,
  dependencyTypeGanttToDb,
  wouldCreateDependencyCycle,
} from './criticalPath';

function makeTask(
  id: string,
  startDate: string,
  endDate: string,
  overrides: Partial<GanttTask> = {},
): GanttTask {
  return {
    id,
    type: 'work_item',
    projectId: 'proj-1',
    parentId: 'proj-1',
    name: `Task ${id}`,
    startDate,
    endDate,
    progress: 0,
    status: 'pending',
    priority: 'medium',
    sortOrder: 0,
    ...overrides,
  };
}

function makeDep(
  fromTaskId: string,
  toTaskId: string,
  type: GanttDependency['type'] = 'finish_to_start',
): GanttDependency {
  return {
    id: `${fromTaskId}__${toTaskId}`,
    fromTaskId,
    toTaskId,
    type,
  };
}

describe('criticalPath CPM & dependency engine (F-14)', () => {
  it('handles empty tasks and ignores project summary bars', () => {
    const empty = computeCriticalPath([], []);
    expect(empty.criticalTaskIds.size).toBe(0);
    expect(empty.projectDurationDays).toBe(0);
    expect(empty.hasCycle).toBe(false);

    const projectOnly = computeCriticalPath(
      [makeTask('proj-1', '2026-11-01', '2026-11-30', { type: 'project' })],
      [],
    );
    expect(projectOnly.criticalTaskIds.size).toBe(0);
    expect(projectOnly.projectDurationDays).toBe(0);
  });

  it('computes forward/backward pass on linear chain A -> B -> C (all critical, 0 float)', () => {
    const tasks = [
      makeTask('proj-1', '2026-11-01', '2026-11-09', { type: 'project' }),
      makeTask('A', '2026-11-01', '2026-11-03'), // 3d: 0..3
      makeTask('B', '2026-11-04', '2026-11-07'), // 4d: 3..7
      makeTask('C', '2026-11-08', '2026-11-09'), // 2d: 7..9
    ];
    const deps = [makeDep('A', 'B'), makeDep('B', 'C')];

    const res = computeCriticalPath(tasks, deps);

    expect(res.hasCycle).toBe(false);
    expect(res.projectDurationDays).toBe(9);
    expect([...res.criticalTaskIds].sort()).toEqual(['A', 'B', 'C']);
    expect([...res.criticalDependencyIds].sort()).toEqual(['A__B', 'B__C']);

    expect(res.metrics['A']).toMatchObject({
      durationDays: 3,
      earlyStart: 0,
      earlyFinish: 3,
      lateStart: 0,
      lateFinish: 3,
      totalFloatDays: 0,
      isCritical: true,
    });
    expect(res.metrics['B']).toMatchObject({
      durationDays: 4,
      earlyStart: 3,
      earlyFinish: 7,
      lateStart: 3,
      lateFinish: 7,
      totalFloatDays: 0,
      isCritical: true,
    });
    expect(res.metrics['C']).toMatchObject({
      durationDays: 2,
      earlyStart: 7,
      earlyFinish: 9,
      lateStart: 7,
      lateFinish: 9,
      totalFloatDays: 0,
      isCritical: true,
    });
  });

  it('computes diamond DAG float accurately and excludes slack shortcut edges', () => {
    // A (2d) -> B (10d) -> D (2d) = 14d (critical)
    // A (2d) -> C (3d)  -> D (2d) = 7d  (float = 7d)
    // Shortcut A -> D also exists (slack = 10d, not on critical path)
    const tasks = [
      makeTask('A', '2026-11-01', '2026-11-02'), // 2d: 0..2
      makeTask('B', '2026-11-03', '2026-11-12'), // 10d: 2..12
      makeTask('C', '2026-11-03', '2026-11-05'), // 3d: 2..5
      makeTask('D', '2026-11-13', '2026-11-14'), // 2d: 12..14
    ];
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'D'),
      makeDep('A', 'C'),
      makeDep('C', 'D'),
      makeDep('A', 'D'),
    ];

    const res = computeCriticalPath(tasks, deps);

    expect(res.projectDurationDays).toBe(14);
    expect([...res.criticalTaskIds].sort()).toEqual(['A', 'B', 'D']);
    expect(res.metrics['B'].totalFloatDays).toBe(0);
    expect(res.metrics['B'].isCritical).toBe(true);
    expect(res.metrics['C'].totalFloatDays).toBe(7);
    expect(res.metrics['C'].isCritical).toBe(false);
    expect([...res.criticalDependencyIds].sort()).toEqual(['A__B', 'B__D']);
  });

  it('handles disconnected parallel tasks cleanly', () => {
    const tasks = [
      makeTask('A', '2026-11-01', '2026-11-05'), // 5d
      makeTask('B', '2026-11-06', '2026-11-10'), // 5d -> total 10d
      makeTask('X', '2026-11-01', '2026-11-03'), // 3d disconnected
    ];
    const res = computeCriticalPath(tasks, [makeDep('A', 'B')]);

    expect(res.projectDurationDays).toBe(10);
    expect([...res.criticalTaskIds].sort()).toEqual(['A', 'B']);
    expect(res.metrics['X'].isCritical).toBe(false);
    expect(res.metrics['X'].totalFloatDays).toBe(7);
  });

  it('isolates CPM calculations independently per projectId', () => {
    const tasks = [
      makeTask('p1-a', '2026-11-01', '2026-11-10', { projectId: 'p1', parentId: 'p1' }), // 10d
      makeTask('p1-b', '2026-11-11', '2026-11-20', { projectId: 'p1', parentId: 'p1' }), // 10d -> 20d
      makeTask('p2-a', '2026-11-01', '2026-11-03', { projectId: 'p2', parentId: 'p2' }), // 3d
      makeTask('p2-b', '2026-11-04', '2026-11-05', { projectId: 'p2', parentId: 'p2' }), // 2d -> 5d
    ];
    const deps = [makeDep('p1-a', 'p1-b'), makeDep('p2-a', 'p2-b')];

    const res = computeCriticalPath(tasks, deps);

    expect(res.projectDurations).toEqual({ p1: 20, p2: 5 });
    expect(res.projectDurationDays).toBe(20);
    expect([...res.criticalTaskIds].sort()).toEqual(['p1-a', 'p1-b', 'p2-a', 'p2-b']);
    expect(res.metrics['p2-a'].totalFloatDays).toBe(0);
    expect(res.metrics['p2-b'].totalFloatDays).toBe(0);
  });

  it('breaks pre-existing cycles safely without infinite loop', () => {
    const tasks = [
      makeTask('A', '2026-11-01', '2026-11-03'),
      makeTask('B', '2026-11-04', '2026-11-06'),
      makeTask('C', '2026-11-01', '2026-11-04'),
    ];
    const deps = [makeDep('A', 'B'), makeDep('B', 'A'), makeDep('C', 'C')];

    const res = computeCriticalPath(tasks, deps);

    expect(res.hasCycle).toBe(true);
    expect([...res.cyclicTaskIds].sort()).toEqual(['A', 'B']);
    expect(res.metrics['A'].isCyclic).toBe(true);
    expect(res.metrics['A'].isCritical).toBe(false);
    expect(res.metrics['B'].isCyclic).toBe(true);
    expect(res.metrics['B'].isCritical).toBe(false);
    expect(res.metrics['C'].isCyclic).toBe(false);
    expect(res.metrics['C'].isCritical).toBe(true);
  });

  it('supports SS and FF dependency constraints and maps DB/Gantt dependency types', () => {
    expect(dependencyTypeDbToGantt('FS')).toBe('finish_to_start');
    expect(dependencyTypeDbToGantt('SS')).toBe('start_to_start');
    expect(dependencyTypeDbToGantt('FF')).toBe('finish_to_finish');
    expect(dependencyTypeDbToGantt('SF')).toBe('start_to_finish');

    expect(dependencyTypeGanttToDb('finish_to_start')).toBe('FS');
    expect(dependencyTypeGanttToDb('pending')).toBe('FS');
    expect(dependencyTypeGanttToDb('start_to_start')).toBe('SS');
    expect(dependencyTypeGanttToDb('finish_to_finish')).toBe('FF');
    expect(dependencyTypeGanttToDb('start_to_finish')).toBe('SF');

    // A (5d, Nov 1..5) SS-> B (3d, originally Nov 1..3), A FF-> C (2d, Nov 1..2)
    // SS keeps B starting at 0..3; FF forces C finish >= A finish (5), so C shifts to 3..5
    const tasks = [
      makeTask('A', '2026-11-01', '2026-11-05'), // 0..5
      makeTask('B', '2026-11-01', '2026-11-03'), // 0..3
      makeTask('C', '2026-11-01', '2026-11-02'), // duration 2d, constrained FF by A -> 3..5
    ];
    const deps = [
      makeDep('A', 'B', 'start_to_start'),
      makeDep('A', 'C', 'finish_to_finish'),
    ];
    const res = computeCriticalPath(tasks, deps);

    expect(res.projectDurationDays).toBe(5);
    expect(res.metrics['C'].earlyStart).toBe(3);
    expect(res.metrics['C'].earlyFinish).toBe(5);
    expect(res.metrics['C'].isCritical).toBe(true);
    expect(res.metrics['A'].isCritical).toBe(true);
    expect(res.metrics['B'].totalFloatDays).toBe(2);
    expect(res.metrics['B'].isCritical).toBe(false);
  });

  it('provides computeWorkItemsCriticalPath convenience wrapper for WorkItem[]', () => {
    const items: WorkItem[] = [
      {
        id: 'w1',
        project_id: 'p-100',
        name: 'Pondasi',
        planned_start: '2026-11-01',
        planned_end: '2026-11-05',
        dependencies: [],
        dependency_type: 'FS',
      },
      {
        id: 'w2',
        project_id: 'p-100',
        name: 'Struktur',
        planned_start: '2026-11-06',
        planned_end: '2026-11-10',
        dependencies: ['w1'],
        dependency_type: 'FS',
      },
      {
        id: 'w3',
        project_id: 'p-100',
        name: 'Pagar',
        planned_start: '2026-11-01',
        planned_end: '2026-11-02',
        dependencies: [],
        dependency_type: 'FS',
      },
      {
        id: 'other-proj-w',
        project_id: 'p-200',
        name: 'Ignored',
        planned_start: '2026-11-01',
        planned_end: '2026-12-30',
        dependencies: [],
        dependency_type: 'FS',
      },
    ];

    const res = computeWorkItemsCriticalPath('p-100', items);
    expect(res.projectDurationDays).toBe(10);
    expect([...res.criticalTaskIds].sort()).toEqual(['w1', 'w2']);
    expect(res.tasksById.has('other-proj-w')).toBe(false);
    expect(res.metrics['w3'].totalFloatDays).toBe(8);
  });

  it('detects dependency cycles via wouldCreateDependencyCycle', () => {
    const deps = [makeDep('A', 'B'), makeDep('B', 'C')];

    expect(wouldCreateDependencyCycle('A', 'A', deps)).toBe(true);
    expect(wouldCreateDependencyCycle('C', 'A', deps)).toBe(true);
    expect(wouldCreateDependencyCycle('B', 'A', deps)).toBe(true);
    expect(wouldCreateDependencyCycle('A', 'C', deps)).toBe(false);
    expect(wouldCreateDependencyCycle('D', 'A', deps)).toBe(false);
  });

  it('cascadeFinishToStartShift shifts multi-hop FS successors preserving duration and skips slack/non-FS edges', () => {
    const tasks = [
      makeTask('A', '2026-11-01', '2026-11-03'), // 3d
      makeTask('B', '2026-11-04', '2026-11-05'), // 2d (FS from A)
      makeTask('C', '2026-11-06', '2026-11-08'), // 3d (FS from B)
      makeTask('D', '2026-11-20', '2026-11-22'), // 3d (FS from B, plenty of slack)
      makeTask('E', '2026-11-02', '2026-11-04'), // 3d (SS from A, should NOT FS-cascade)
    ];
    const deps = [
      makeDep('A', 'B', 'finish_to_start'),
      makeDep('B', 'C', 'finish_to_start'),
      makeDep('B', 'D', 'finish_to_start'),
      makeDep('A', 'E', 'start_to_start'),
    ];

    // Extend A endDate from Nov 3 -> Nov 6
    const updates = cascadeFinishToStartShift('A', '2026-11-06', tasks, deps);

    expect(updates).toEqual([
      { id: 'B', startDate: '2026-11-07', endDate: '2026-11-08' },
      { id: 'C', startDate: '2026-11-09', endDate: '2026-11-11' },
    ]);

    // Moving A earlier should not shift successors backward
    expect(cascadeFinishToStartShift('A', '2026-11-02', tasks, deps)).toEqual([]);

    // Pre-existing cycle should terminate cleanly without infinite loop
    const cyclicUpdates = cascadeFinishToStartShift(
      'A',
      '2026-11-10',
      [makeTask('A', '2026-11-01', '2026-11-03'), makeTask('B', '2026-11-04', '2026-11-05')],
      [makeDep('A', 'B'), makeDep('B', 'A')],
    );
    expect(cyclicUpdates).toEqual([
      { id: 'B', startDate: '2026-11-11', endDate: '2026-11-12' },
    ]);
  });
});
