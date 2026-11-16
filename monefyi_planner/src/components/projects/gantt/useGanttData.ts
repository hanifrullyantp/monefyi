import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import {
  createWorkItem,
  deleteWorkItem,
  duplicateWorkItem,
  isWorkItemConflictError,
  loadDemoWorkItems,
  loadWorkItemsForOrg,
  saveDemoWorkItems,
  type WorkItem,
  type WorkItemPriority,
} from '../../../services/workItemService';
import { depsFromWorkItems, loadAllGanttDependencies } from '../../../services/ganttDependencyService';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, loadProjectOrder, saveGanttChanges } from '../../../services/ganttSaveService';
import { loadProjects, updateProject as updateProjectApi } from '../../../services/projectService';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { schedulePlanProgress, weightedActualProgress } from '../../../lib/progressMetrics';
import { clearGanttDraft, hasGanttDraft, loadGanttDraft } from '../../../services/ganttDraftService';
import {
  annotateTasksWithCriticalPath,
  projectToGanttTask,
  workItemToGanttTask,
} from '../../../lib/gantt/utils';
import {
  cascadeFinishToStartShift,
  computeCriticalPath,
  dependencyTypeGanttToDb,
} from '../../../lib/gantt/criticalPath';
import { snapshotsEqual } from '../../../lib/gantt/snapshot';
import type { GanttDependency, GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';
import { isDemoOrgId, isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import { useGanttRealtime } from '../../../hooks/useGanttRealtime';

export interface AddGanttWorkItemInput {
  name: string;
  planned_start: string;
  planned_end: string;
  progress_pct: number;
  parent_id?: string | null;
  priority?: WorkItemPriority;
  assigned_member_id?: string | null;
  dependencies?: string[];
  dependency_type?: string;
}

function buildMemberNameMap(members: OrgMember[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    const label = m.profile?.name || m.employee_id || m.position || '';
    if (label) map.set(m.id, label);
  }
  return map;
}

export function buildFallbackWorkItem(task: GanttTask): WorkItem {
  return {
    id: task.id,
    project_id: task.projectId,
    parent_id: task.parentId && task.parentId !== task.projectId ? task.parentId : null,
    name: task.name,
    description: null,
    planned_start: task.startDate,
    planned_end: task.endDate,
    actual_start: null,
    actual_end: null,
    weight: 0,
    progress_pct: task.progress,
    planned_workers: 1,
    actual_workers: null,
    dependencies: [],
    dependency_type: 'FS',
    assigned_member_id: task.assignedMemberId ?? null,
    priority: task.priority,
    notes: task.notes ?? [],
    attachments: task.attachments ?? [],
    status: task.status,
    sort_order: task.sortOrder,
    updated_at: task.updatedAt,
  };
}

/**
 * Map current Gantt snapshot tasks/dependencies into WorkItem records and persist
 * each project's items to demo localStorage via `saveDemoWorkItems`.
 */
export function syncDemoWorkItemsFromSnapshot(
  tasks: GanttTask[],
  dependencies: GanttDependency[],
  existingItems: WorkItem[],
  projectIds: string[],
): WorkItem[] {
  const existingMap = new Map(existingItems.map(w => [w.id, w]));
  const incomingDepsByTask = new Map<string, GanttDependency[]>();
  for (const dep of dependencies) {
    const list = incomingDepsByTask.get(dep.toTaskId);
    if (list) list.push(dep);
    else incomingDepsByTask.set(dep.toTaskId, [dep]);
  }

  const nowIso = new Date().toISOString();
  const updatedItems: WorkItem[] = [];
  const byProject = new Map<string, WorkItem[]>();

  for (const task of tasks) {
    if (task.type === 'project') continue;
    const base = existingMap.get(task.id) ?? buildFallbackWorkItem(task);
    const incoming = incomingDepsByTask.get(task.id) ?? [];
    const depIds = [...new Set(incoming.map(d => d.fromTaskId))];
    const depType = incoming[0]
      ? dependencyTypeGanttToDb(incoming[0].type)
      : (base.dependency_type ?? 'FS');
    const assignedMemberId =
      task.assignedMemberId !== undefined
        ? (task.assignedMemberId ?? null)
        : (task.assigneeId ?? null);
    const nextParentId =
      task.parentId && task.parentId !== task.projectId ? task.parentId : null;

    const changed =
      task.name !== base.name ||
      task.startDate !== base.planned_start ||
      task.endDate !== base.planned_end ||
      task.progress !== (Number(base.progress_pct) || 0) ||
      task.status !== base.status ||
      task.priority !== (base.priority ?? task.priority) ||
      assignedMemberId !== (base.assigned_member_id ?? null) ||
      nextParentId !== (base.parent_id ?? null) ||
      JSON.stringify(depIds) !== JSON.stringify(base.dependencies ?? []);

    const item: WorkItem = {
      ...base,
      project_id: task.projectId,
      parent_id: nextParentId,
      name: task.name,
      planned_start: task.startDate,
      planned_end: task.endDate,
      progress_pct: task.progress,
      status: task.status,
      priority: task.priority,
      assigned_member_id: assignedMemberId,
      notes: task.notes ?? base.notes ?? [],
      attachments: task.attachments ?? base.attachments ?? [],
      sort_order: task.sortOrder ?? base.sort_order ?? 0,
      dependencies: depIds,
      dependency_type: depType,
      updated_at: changed ? nowIso : (base.updated_at ?? task.updatedAt ?? nowIso),
    };
    updatedItems.push(item);

    const projectList = byProject.get(item.project_id);
    if (projectList) projectList.push(item);
    else byProject.set(item.project_id, [item]);
  }

  const targetProjectIds = new Set([...projectIds, ...byProject.keys()]);
  for (const pid of targetProjectIds) {
    if (pid) saveDemoWorkItems(pid, byProject.get(pid) ?? []);
  }

  return updatedItems;
}

/**
 * Syncs project + work item data into the gantt store.
 */
export function useGanttData(projects: Project[], orgId: string | undefined, currency?: string) {
  const {
    init, setTasks, setDependencies, setProjectOrder, setBarColors,
    commitBaseline, setHasDraft, getSnapshot, baseline, setIsSaving, setConflictPrompt,
  } = useGanttStore();
  const updateProject = useAppStore(s => s.updateProject);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const orgMembersRef = useRef<OrgMember[]>([]);
  const loadedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const lastLocalSaveAtRef = useRef(0);
  const workItemsRef = useRef<WorkItem[]>([]);
  const projectsRef = useRef<Project[]>(projects);
  projectsRef.current = projects;
  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  const isDemo = Boolean(
    isDemoMode || !orgId || orgId === 'demo' || orgId.startsWith('demo-') || isDemoOrgId(orgId),
  );

  const projectsKey = useMemo(
    () =>
      projects
        .map(
          p =>
            `${p.id}:${p.name}:${p.start_date}:${p.end_date}:${p.progress_percentage}:${p.status}:${p.health_status}:${p.updated_at}`,
        )
        .join('|'),
    [projects],
  );
  const projectIds = useMemo(() => projects.map(p => p.id), [projectsKey]);

  useEffect(() => {
    if (!orgId) return;
    loadedRef.current = false;
    init(orgId);
    setHasDraft(hasGanttDraft(orgId));
  }, [orgId, init, setHasDraft]);

  const reloadFromRemote = useCallback(
    async (fromRealtime = false, options?: { forceDiscardLocal?: boolean }) => {
      if (!orgId || isDemo) return;
      const forceDiscardLocal = Boolean(options?.forceDiscardLocal);
      const currentProjects = projectsRef.current;
      if (!currentProjects.length) {
        if (!fromRealtime) {
          setTasks([]);
          setDependencies([]);
          workItemsRef.current = [];
        }
        return;
      }

      const storeState = useGanttStore.getState();
      if (fromRealtime) {
        if (Date.now() - lastLocalSaveAtRef.current < 1500) return;
        if (storeState.isDirty || storeState.isSaving || storeState.drag) return;
      } else if (!forceDiscardLocal && loadedRef.current && (storeState.isDirty || storeState.isSaving)) {
        return;
      }

      if (forceDiscardLocal) {
        setConflictPrompt(null);
        clearGanttDraft(orgId);
        setHasDraft(false);
      }

      const seq = ++loadSeqRef.current;

      try {
        const [workItems, barColors, savedOrder, freshProjects, members] = await Promise.all([
          loadWorkItemsForOrg(orgId),
          loadBarColors(orgId),
          loadProjectOrder(orgId),
          fromRealtime || forceDiscardLocal
            ? loadProjects(orgId, currencyRef.current).catch(() => null)
            : Promise.resolve(null),
          isDemoOrInvalidUuid(orgId)
            ? Promise.resolve<OrgMember[]>([])
            : listMembers(orgId).catch(() => orgMembersRef.current),
        ]);
        if (seq !== loadSeqRef.current) return;

        const latestState = useGanttStore.getState();
        if (
          !forceDiscardLocal &&
          fromRealtime &&
          (latestState.isDirty || latestState.isSaving || latestState.drag)
        ) {
          return;
        }

        orgMembersRef.current = members;
        setOrgMembers(members);
        const nameMap = buildMemberNameMap(members);

        const freshMap = freshProjects ? new Map(freshProjects.map(p => [p.id, p])) : null;
        const effectiveProjects = freshMap
          ? currentProjects.map(p => freshMap.get(p.id) ?? p)
          : currentProjects;

        workItemsRef.current = workItems;
        const projectMap = new Map(effectiveProjects.map(p => [p.id, p]));
        let ganttTasks: GanttTask[] = [];

        effectiveProjects.forEach((p, i) => {
          ganttTasks.push(projectToGanttTask(p, i));
        });

        for (const wi of workItems) {
          const project = projectMap.get(wi.project_id);
          if (project) ganttTasks.push(workItemToGanttTask(wi, project, nameMap));
        }

        ganttTasks = applyBarColors(ganttTasks, barColors);
        const deps = await loadAllGanttDependencies(orgId, workItems, ganttTasks);
        if (seq !== loadSeqRef.current) return;

        const cpm = computeCriticalPath(ganttTasks, deps);
        ganttTasks = annotateTasksWithCriticalPath(ganttTasks, cpm);

        setBarColors(barColors);
        setTasks(ganttTasks);
        setDependencies(deps);

        const order = savedOrder?.length
          ? savedOrder.filter(id => effectiveProjects.some(p => p.id === id))
          : effectiveProjects.map(p => p.id);
        const missing = effectiveProjects.map(p => p.id).filter(id => !order.includes(id));
        setProjectOrder([...order, ...missing]);

        const wasLoaded = loadedRef.current;
        loadedRef.current = true;

        setConflictPrompt(null);
        commitBaseline();

        if (forceDiscardLocal) {
          showToast('Data terbaru dimuat ulang', 'success');
        } else if (!fromRealtime && !wasLoaded) {
          const draft = loadGanttDraft(orgId);
          if (draft && seq === loadSeqRef.current) {
            useGanttStore.getState().restoreSnapshot(draft.snapshot);
            useGanttStore.setState({ isDirty: true, hasDraft: true });
          }
        }
      } catch (e) {
        console.error('Gantt load failed:', e);
        if (forceDiscardLocal) {
          showToast(e instanceof Error ? e.message : 'Gagal memuat ulang data terbaru', 'error');
        }
      }
    },
    [
      orgId,
      isDemo,
      setTasks,
      setDependencies,
      setProjectOrder,
      setBarColors,
      commitBaseline,
      setConflictPrompt,
      setHasDraft,
      showToast,
    ],
  );

  useEffect(() => {
    const currentProjects = projectsRef.current;
    if (!orgId || !currentProjects.length) {
      setTasks([]);
      setDependencies([]);
      workItemsRef.current = [];
      return;
    }

    if (isDemo) {
      const storeState = useGanttStore.getState();
      if (loadedRef.current && storeState.isDirty) return;

      setOrgMembers([]);
      orgMembersRef.current = [];
      setConflictPrompt(null);

      if (!loadedRef.current) {
        const loadedDemoItems = currentProjects.flatMap(p => loadDemoWorkItems(p.id));
        workItemsRef.current = loadedDemoItems;
        const projectMap = new Map(currentProjects.map(p => [p.id, p]));
        const rawTasks: GanttTask[] = currentProjects.map((p, i) => projectToGanttTask(p, i));
        for (const wi of loadedDemoItems) {
          const proj = projectMap.get(wi.project_id);
          if (proj) rawTasks.push(workItemToGanttTask(wi, proj));
        }
        const deps = depsFromWorkItems(loadedDemoItems);
        const cpm = computeCriticalPath(rawTasks, deps);
        const ganttTasks = annotateTasksWithCriticalPath(rawTasks, cpm);
        setBarColors({});
        setTasks(ganttTasks);
        setDependencies(deps);
        setProjectOrder(currentProjects.map(p => p.id));
        loadedRef.current = true;
        commitBaseline();

        const draft = loadGanttDraft(orgId);
        if (draft) {
          useGanttStore.getState().restoreSnapshot(draft.snapshot);
          useGanttStore.setState({ isDirty: true, hasDraft: true });
        }
        return;
      }

      // Preserve existing work_item tasks, dependencies, and barColors when projectsKey updates
      const prevTasks = storeState.tasks;
      const prevProjectMap = new Map(
        prevTasks.filter(t => t.type === 'project').map(t => [t.id, t]),
      );
      const currentProjectIdSet = new Set(currentProjects.map(p => p.id));
      const newProjects = currentProjects.filter(p => !prevProjectMap.has(p.id));
      const newDemoItems = newProjects.flatMap(p => loadDemoWorkItems(p.id));
      const newProjectMap = new Map(newProjects.map(p => [p.id, p]));

      const keptWorkItems = workItemsRef.current.filter(
        w => currentProjectIdSet.has(w.project_id) && !newProjectMap.has(w.project_id),
      );
      workItemsRef.current = [...keptWorkItems, ...newDemoItems];

      const mergedProjectTasks: GanttTask[] = currentProjects.map((p, i) => {
        const existingProj = prevProjectMap.get(p.id);
        const freshProj = projectToGanttTask(p, existingProj?.sortOrder ?? i);
        const color = existingProj?.barColor ?? storeState.barColors[p.id];
        return color ? { ...freshProj, barColor: color } : freshProj;
      });

      const existingWorkTasks = prevTasks.filter(
        t =>
          t.type !== 'project' &&
          currentProjectIdSet.has(t.projectId) &&
          !newProjectMap.has(t.projectId),
      );
      const newWorkTasks = newDemoItems.map(wi => {
        const proj = newProjectMap.get(wi.project_id)!;
        const task = workItemToGanttTask(wi, proj);
        const color = storeState.barColors[task.id];
        return color ? { ...task, barColor: color } : task;
      });

      const mergedTasksRaw = [...mergedProjectTasks, ...existingWorkTasks, ...newWorkTasks];
      const mergedTaskIds = new Set(mergedTasksRaw.map(t => t.id));
      const preservedDeps = storeState.dependencies.filter(
        d => mergedTaskIds.has(d.fromTaskId) && mergedTaskIds.has(d.toTaskId),
      );
      const depMap = new Map(preservedDeps.map(d => [d.id, d]));
      for (const d of depsFromWorkItems(newDemoItems)) {
        if (!depMap.has(d.id)) depMap.set(d.id, d);
      }
      const mergedDeps = [...depMap.values()];

      const cpm = computeCriticalPath(mergedTasksRaw, mergedDeps);
      const mergedTasks = annotateTasksWithCriticalPath(mergedTasksRaw, cpm);

      const preservedOrder = storeState.projectOrder.filter(id => currentProjectIdSet.has(id));
      const missingOrder = currentProjects.map(p => p.id).filter(id => !preservedOrder.includes(id));
      const nextOrder = [...preservedOrder, ...missingOrder];

      useGanttStore.setState({
        tasks: mergedTasks,
        dependencies: mergedDeps,
        projectOrder: nextOrder,
      });
      commitBaseline();
      return;
    }

    void reloadFromRemote(false);

    return () => {
      loadSeqRef.current += 1;
    };
  }, [
    orgId,
    projectsKey,
    isDemo,
    reloadFromRemote,
    setTasks,
    setDependencies,
    setProjectOrder,
    setBarColors,
    commitBaseline,
    setConflictPrompt,
  ]);

  useGanttRealtime({
    orgId,
    projectIds,
    isDemoMode,
    enabled: Boolean(orgId && !isDemo),
    onRefresh: () => reloadFromRemote(true),
  });

  const commitDates = useCallback(
    (taskId: string, start: string, end: string) => {
      const state = useGanttStore.getState();
      const existing = state.tasks.find(t => t.id === taskId);
      if (!existing) return;

      const needsMainUpdate = existing.startDate !== start || existing.endDate !== end;
      const workingTasks = needsMainUpdate
        ? state.tasks.map(t => (t.id === taskId ? { ...t, startDate: start, endDate: end } : t))
        : state.tasks;

      const cascaded = cascadeFinishToStartShift(taskId, end, workingTasks, state.dependencies);

      const updates: Array<{ id: string; patch: Partial<GanttTask> }> = [];
      if (needsMainUpdate) {
        updates.push({ id: taskId, patch: { startDate: start, endDate: end } });
      }
      for (const u of cascaded) {
        updates.push({ id: u.id, patch: { startDate: u.startDate, endDate: u.endDate } });
      }

      if (updates.length > 0) {
        // When invoked via drag end, GanttTaskBar has already pushed preDragSnap to undoStack.
        state.updateMultipleTasks(updates, needsMainUpdate);
        if (cascaded.length > 0) {
          showToast(`${cascaded.length} pekerjaan penerus otomatis digeser (FS)`, 'info');
        }
        return;
      }

      useGanttStore.setState({
        isDirty: !snapshotsEqual(state.getSnapshot(), state.baseline),
      });
    },
    [showToast],
  );

  const saveAll = useCallback(
    async (options?: { forceOverwrite?: boolean }): Promise<boolean> => {
      if (!orgId || !baseline) return true;
      const current = getSnapshot();
      const depsChanged =
        JSON.stringify(current.dependencies) !== JSON.stringify(baseline.dependencies);
      setIsSaving(true);
      lastLocalSaveAtRef.current = Date.now();
      try {
        if (isDemo) {
          const savedItems = syncDemoWorkItemsFromSnapshot(
            current.tasks,
            current.dependencies,
            workItemsRef.current,
            projectsRef.current.map(p => p.id),
          );
          workItemsRef.current = savedItems;

          const itemsByProject = new Map<string, WorkItem[]>();
          for (const wi of savedItems) {
            const list = itemsByProject.get(wi.project_id);
            if (list) list.push(wi);
            else itemsByProject.set(wi.project_id, [wi]);
          }
          const savedItemMap = new Map(savedItems.map(w => [w.id, w]));

          const nextTasks = current.tasks.map(t => {
            if (t.type === 'project') {
              const projItems = itemsByProject.get(t.id) ?? [];
              const nextProgress =
                projItems.length > 0 ? weightedActualProgress(projItems) : t.progress;
              return { ...t, progress: nextProgress };
            }
            const sw = savedItemMap.get(t.id);
            return sw ? { ...t, updatedAt: sw.updated_at ?? t.updatedAt } : t;
          });

          for (const task of nextTasks) {
            if (task.type === 'project') {
              const p = projectsRef.current.find(x => x.id === task.id);
              if (p) {
                updateProject(task.id, {
                  name: task.name,
                  start_date: task.startDate,
                  end_date: task.endDate,
                  progress_percentage: task.progress,
                  planned_progress: schedulePlanProgress(task.startDate, task.endDate),
                  status: task.status as Project['status'],
                });
              }
            }
          }

          const cpm = computeCriticalPath(nextTasks, current.dependencies);
          useGanttStore.setState({
            tasks: annotateTasksWithCriticalPath(nextTasks, cpm),
          });
          clearGanttDraft(orgId);
          setConflictPrompt(null);
          commitBaseline();
          setHasDraft(false);
          showToast('Perubahan Gantt disimpan', 'success');
          return true;
        }

        const { workItems: savedItems, projectProgress } = await saveGanttChanges(
          orgId,
          current,
          baseline,
          workItemsRef.current,
          currency,
          { forceOverwrite: options?.forceOverwrite },
        );

        let finalItems = savedItems;
        if (depsChanged) {
          const freshItems = await loadWorkItemsForOrg(orgId).catch(() => null);
          if (freshItems) finalItems = freshItems;
        }
        workItemsRef.current = finalItems;

        const savedMap = new Map(finalItems.map(w => [w.id, w]));
        const latestState = useGanttStore.getState();
        const syncedTasks = latestState.tasks.map(t => {
          const sw = savedMap.get(t.id);
          return sw ? { ...t, updatedAt: sw.updated_at ?? t.updatedAt } : t;
        });
        const cpm = computeCriticalPath(syncedTasks, latestState.dependencies);
        useGanttStore.setState({
          tasks: annotateTasksWithCriticalPath(syncedTasks, cpm),
        });

        for (const task of current.tasks) {
          if (task.type === 'project') {
            const p = projects.find(x => x.id === task.id);
            if (p) {
              updateProject(task.id, {
                name: task.name,
                start_date: task.startDate,
                end_date: task.endDate,
                progress_percentage: projectProgress[task.id] ?? task.progress,
                planned_progress: schedulePlanProgress(task.startDate, task.endDate),
                status: task.status as Project['status'],
              });
            }
          }
        }

        setConflictPrompt(null);
        commitBaseline();
        setHasDraft(false);
        showToast('Perubahan Gantt disimpan', 'success');
        return true;
      } catch (e) {
        if (isWorkItemConflictError(e)) {
          const taskName =
            e.serverWorkItem?.name ||
            current.tasks.find(t => t.id === e.workItemId)?.name ||
            'Pekerjaan';
          setConflictPrompt({
            workItemId: e.workItemId,
            taskName,
            localUpdatedAt: e.expectedUpdatedAt,
            serverUpdatedAt: e.serverUpdatedAt,
            message: e.message,
          });
          return false;
        }
        showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
        return false;
      } finally {
        lastLocalSaveAtRef.current = Date.now();
        setIsSaving(false);
      }
    },
    [
      orgId,
      isDemo,
      baseline,
      getSnapshot,
      currency,
      projects,
      updateProject,
      commitBaseline,
      setHasDraft,
      showToast,
      setIsSaving,
      setConflictPrompt,
    ],
  );

  const addWorkItem = useCallback(
    async (projectId: string, data: AddGanttWorkItemInput): Promise<boolean> => {
      const project = projectsRef.current.find(p => p.id === projectId);
      if (!project) return false;
      const nameMap = buildMemberNameMap(orgMembersRef.current);

      try {
        const nextSortOrder = workItemsRef.current.filter(w => w.project_id === projectId).length;
        const deps = data.dependencies?.length ? [...new Set(data.dependencies)] : [];

        if (isDemo || isDemoOrInvalidUuid(projectId, isDemoMode)) {
          const now = new Date().toISOString();
          const wi: WorkItem = {
            id: `demo-wi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            project_id: projectId,
            parent_id: data.parent_id ?? null,
            name: data.name,
            description: null,
            planned_start: data.planned_start,
            planned_end: data.planned_end,
            actual_start: null,
            actual_end: null,
            weight: 0,
            progress_pct: data.progress_pct,
            planned_workers: 1,
            actual_workers: null,
            dependencies: deps,
            dependency_type: data.dependency_type ?? 'FS',
            assigned_member_id: data.assigned_member_id ?? null,
            priority: data.priority ?? 'medium',
            notes: [],
            attachments: [],
            status: 'pending',
            sort_order: nextSortOrder,
            created_at: now,
            updated_at: now,
          };
          workItemsRef.current = [...workItemsRef.current, wi];
          saveDemoWorkItems(
            projectId,
            workItemsRef.current.filter(w => w.project_id === projectId),
          );
          const task = workItemToGanttTask(wi, project, nameMap);
          const newDeps = depsFromWorkItems([wi]);
          useGanttStore.getState().addTask(task, {
            recordHistory: false,
            syncBaseline: true,
            dependencies: newDeps,
          });
          showToast('Pekerjaan ditambahkan', 'success');
          return true;
        }

        lastLocalSaveAtRef.current = Date.now();
        const wi = await createWorkItem({
          project_id: projectId,
          parent_id: data.parent_id ?? null,
          name: data.name,
          planned_start: data.planned_start,
          planned_end: data.planned_end,
          progress_pct: data.progress_pct,
          sort_order: nextSortOrder,
          status: 'pending',
          priority: data.priority ?? 'medium',
          assigned_member_id: data.assigned_member_id ?? null,
          dependencies: deps,
          dependency_type: data.dependency_type ?? 'FS',
        });
        workItemsRef.current = [...workItemsRef.current, wi];
        const task = workItemToGanttTask(wi, project, nameMap);
        const newDeps = depsFromWorkItems([wi]);
        useGanttStore.getState().addTask(task, {
          recordHistory: false,
          syncBaseline: true,
          dependencies: newDeps,
        });
        showToast('Pekerjaan ditambahkan', 'success');
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menambah pekerjaan', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, showToast],
  );

  const deleteTaskItem = useCallback(
    async (taskId: string): Promise<boolean> => {
      const storeTask = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!storeTask || storeTask.type === 'project') return false;

      try {
        lastLocalSaveAtRef.current = Date.now();
        const isDemoTask = isDemo || isDemoOrInvalidUuid(taskId, isDemoMode);
        if (!isDemoTask) {
          await deleteWorkItem(taskId);
        }
        workItemsRef.current = workItemsRef.current
          .filter(w => w.id !== taskId && w.parent_id !== taskId)
          .map(w =>
            w.dependencies?.includes(taskId)
              ? { ...w, dependencies: w.dependencies.filter(id => id !== taskId) }
              : w,
          );
        if (isDemoTask) {
          saveDemoWorkItems(
            storeTask.projectId,
            workItemsRef.current.filter(w => w.project_id === storeTask.projectId),
          );
        }
        useGanttStore.getState().removeTask(taskId, {
          recordHistory: false,
          syncBaseline: true,
        });
        showToast('Pekerjaan dihapus', 'success');
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menghapus pekerjaan', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, showToast],
  );

  const duplicateTaskItem = useCallback(
    async (taskId: string): Promise<boolean> => {
      const storeTask = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!storeTask || storeTask.type === 'project') return false;
      const project = projectsRef.current.find(p => p.id === storeTask.projectId);
      if (!project) return false;

      const sourceWi = workItemsRef.current.find(w => w.id === taskId) ?? buildFallbackWorkItem(storeTask);
      const nameMap = buildMemberNameMap(orgMembersRef.current);

      try {
        lastLocalSaveAtRef.current = Date.now();
        const isDemoTask = isDemo || isDemoOrInvalidUuid(taskId, isDemoMode);
        let duplicated: WorkItem;

        if (isDemoTask) {
          const now = new Date().toISOString();
          duplicated = {
            ...sourceWi,
            id: `demo-wi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: `${sourceWi.name} (Salinan)`,
            progress_pct: 0,
            status: 'pending',
            actual_start: null,
            actual_end: null,
            actual_workers: null,
            notes: [],
            attachments: [],
            sort_order: (sourceWi.sort_order ?? 0) + 1,
            created_at: now,
            updated_at: now,
          };
          workItemsRef.current = [...workItemsRef.current, duplicated];
          saveDemoWorkItems(
            project.id,
            workItemsRef.current.filter(w => w.project_id === project.id),
          );
        } else {
          duplicated = await duplicateWorkItem(sourceWi);
          workItemsRef.current = [...workItemsRef.current, duplicated];
        }

        const dupTask = workItemToGanttTask(duplicated, project, nameMap);
        const dupDeps = depsFromWorkItems([duplicated]);
        useGanttStore.getState().addTask(dupTask, {
          recordHistory: false,
          syncBaseline: true,
          dependencies: dupDeps,
        });
        showToast('Pekerjaan diduplikasi', 'success');
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menduplikasi pekerjaan', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, showToast],
  );

  const extendProjectEndDate = useCallback(
    async (projectId: string, newEndDate: string): Promise<boolean> => {
      const project = projectsRef.current.find(p => p.id === projectId);
      if (!project) return false;
      try {
        lastLocalSaveAtRef.current = Date.now();
        if (isDemo || isDemoOrInvalidUuid(projectId, isDemoMode)) {
          updateProject(projectId, { end_date: newEndDate });
        } else {
          const updated = await updateProjectApi(
            projectId,
            { end_date: newEndDate },
            currencyRef.current,
          );
          updateProject(projectId, updated);
        }
        useGanttStore.setState(s => {
          const patchTask = (t: GanttTask) =>
            t.id === projectId ? { ...t, endDate: newEndDate } : t;
          return {
            tasks: s.tasks.map(patchTask),
            baseline: s.baseline
              ? { ...s.baseline, tasks: s.baseline.tasks.map(patchTask) }
              : null,
          };
        });
        showToast(`Deadline proyek diperpanjang ke ${newEndDate}`, 'success');
        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memperpanjang deadline proyek', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, updateProject, showToast],
  );

  return {
    commitDates,
    saveAll,
    workItemsRef,
    addWorkItem,
    deleteTaskItem,
    duplicateTaskItem,
    extendProjectEndDate,
    reloadFromRemote,
    orgMembers,
    isDemo,
  };
}
