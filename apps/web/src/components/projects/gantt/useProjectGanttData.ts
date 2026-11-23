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
  loadWorkItems,
  saveDemoWorkItems,
  updateWorkItemExtendedMeta,
  type WorkItem,
  type WorkItemExtendedMeta,
  type WorkItemPriority,
} from '../../../services/workItemService';
import { getProject, updateProject as updateProjectApi } from '../../../services/projectService';
import { listMembers } from '../../../services/memberService';
import type { OrgMember } from '../../../types/onboarding';
import { schedulePlanProgress, weightedActualProgress } from '../../../lib/progressMetrics';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, saveGanttChanges } from '../../../services/ganttSaveService';
import { depsFromWorkItems } from '../../../services/ganttDependencyService';
import { syncDemoWorkItemsFromSnapshot } from './useGanttData';
import {
  annotateTasksWithCriticalPath,
  projectToGanttTask,
  workItemToGanttTask,
} from '../../../lib/gantt/utils';
import { cascadeFinishToStartShift, computeCriticalPath } from '../../../lib/gantt/criticalPath';
import { snapshotsEqual } from '../../../lib/gantt/snapshot';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';
import { isDemoOrgId, isDemoOrInvalidUuid } from '../../../lib/demo/demoMode';
import { useGanttRealtime } from '../../../hooks/useGanttRealtime';

export interface AddProjectWorkItemInput {
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

function buildFallbackWorkItem(task: GanttTask): WorkItem {
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
 * Loads a single project's work items into the gantt store for the detail page,
 * with CPM annotations, FS cascade shifts, CRUD actions, and F-19 conflict handling.
 */
export function useProjectGanttData(
  project: Project,
  workItems: WorkItem[],
  orgId: string | undefined,
  currency?: string,
) {
  const {
    init,
    setTasks,
    setDependencies,
    setProjectOrder,
    setBarColors,
    commitBaseline,
    setHasDraft,
    getSnapshot,
    baseline,
    setIsSaving,
    conflictPrompt,
    setConflictPrompt,
  } = useGanttStore();
  const updateProject = useAppStore(s => s.updateProject);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const orgMembersRef = useRef<OrgMember[]>([]);
  const workItemsRef = useRef<WorkItem[]>(workItems);
  const projectRef = useRef<Project>(project);
  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  const loadedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const lastLocalSaveAtRef = useRef(0);

  const isDemo = Boolean(
    isDemoMode || !orgId || orgId === 'demo' || orgId.startsWith('demo-') || isDemoOrgId(orgId),
  );

  const workItemsKey = useMemo(
    () =>
      workItems
        .map(
          w =>
            `${w.id}:${w.parent_id ?? ''}:${w.name}:${w.planned_start}:${w.planned_end}:${w.progress_pct}:${w.status}:${w.priority ?? ''}:${w.assigned_member_id ?? ''}:${w.updated_at ?? ''}:${(w.dependencies || []).join(',')}:${w.notes?.length ?? 0}:${w.attachments?.length ?? 0}`,
        )
        .join('|'),
    [workItems],
  );
  const projectKey = `${project.id}:${project.name}:${project.start_date}:${project.end_date}:${project.progress_percentage}:${project.status}:${project.updated_at}`;

  useEffect(() => {
    workItemsRef.current = workItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workItemsKey]);

  useEffect(() => {
    projectRef.current = project;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  useEffect(() => {
    if (!orgId) return;
    loadedRef.current = false;
    init(orgId);
    setHasDraft(false);
  }, [orgId, init, setHasDraft, project.id]);

  const applyStoreData = useCallback(
    (
      effectiveProject: Project,
      items: WorkItem[],
      barColors: Record<string, string>,
      members: OrgMember[],
    ) => {
      workItemsRef.current = items;
      const nameMap = buildMemberNameMap(members);
      let ganttTasks: GanttTask[] = [projectToGanttTask(effectiveProject, 0)];
      for (const wi of items) {
        ganttTasks.push(workItemToGanttTask(wi, effectiveProject, nameMap));
      }
      ganttTasks = applyBarColors(ganttTasks, barColors);
      const deps = depsFromWorkItems(items);
      const cpm = computeCriticalPath(ganttTasks, deps);
      ganttTasks = annotateTasksWithCriticalPath(ganttTasks, cpm);

      setBarColors(barColors);
      setTasks(ganttTasks);
      setProjectOrder([effectiveProject.id]);
      setDependencies(deps);

      useGanttStore.setState(s => ({
        expandedIds: new Set([...s.expandedIds, effectiveProject.id]),
      }));

      setConflictPrompt(null);
      loadedRef.current = true;
      commitBaseline();
    },
    [setBarColors, setTasks, setProjectOrder, setDependencies, setConflictPrompt, commitBaseline],
  );

  const reloadFromRemote = useCallback(
    async (fromRealtime = false, options?: { forceDiscardLocal?: boolean }) => {
      if (!orgId || isDemo) return;
      const forceDiscardLocal = Boolean(options?.forceDiscardLocal);

      const storeState = useGanttStore.getState();
      if (fromRealtime) {
        if (Date.now() - lastLocalSaveAtRef.current < 1500) return;
        if (storeState.isDirty || storeState.isSaving || storeState.drag) return;
      } else if (!forceDiscardLocal && loadedRef.current && (storeState.isDirty || storeState.isSaving)) {
        return;
      }

      if (forceDiscardLocal) {
        setConflictPrompt(null);
      }

      const seq = ++loadSeqRef.current;
      const shouldFetchRemote = fromRealtime || forceDiscardLocal;

      try {
        const [freshProject, freshWorkItems, barColors, members] = await Promise.all([
          shouldFetchRemote
            ? getProject(projectRef.current.id, currencyRef.current).catch(() => null)
            : Promise.resolve(null),
          shouldFetchRemote
            ? loadWorkItems(projectRef.current.id)
            : Promise.resolve(workItemsRef.current),
          loadBarColors(orgId),
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

        const effectiveProject = freshProject ?? projectRef.current;
        applyStoreData(effectiveProject, freshWorkItems, barColors, members);
        if (freshProject) {
          updateProject(effectiveProject.id, freshProject);
        }
        if (forceDiscardLocal) {
          showToast('Data terbaru dimuat ulang', 'success');
        }
      } catch (e) {
        console.error('Project gantt load failed:', e);
        if (forceDiscardLocal) {
          showToast(e instanceof Error ? e.message : 'Gagal memuat ulang data terbaru', 'error');
        }
      }
    },
    [orgId, isDemo, applyStoreData, updateProject, setConflictPrompt, showToast],
  );

  useEffect(() => {
    if (!orgId) {
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
      const preservedBarColors = loadedRef.current ? storeState.barColors : {};
      const baseItems =
        workItemsRef.current.length > 0 || loadedRef.current
          ? workItemsRef.current
          : loadDemoWorkItems(projectRef.current.id);
      applyStoreData(projectRef.current, baseItems, preservedBarColors, []);
      return;
    }

    void reloadFromRemote(false);

    return () => {
      loadSeqRef.current += 1;
    };
  }, [
    orgId,
    projectKey,
    workItemsKey,
    isDemo,
    applyStoreData,
    reloadFromRemote,
    setTasks,
    setDependencies,
  ]);

  useGanttRealtime({
    orgId,
    projectId: project.id,
    isDemoMode,
    enabled: Boolean(orgId && project.id && !isDemo),
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
        if (isDemo || isDemoOrInvalidUuid(project.id, isDemoMode)) {
          const savedItems = syncDemoWorkItemsFromSnapshot(
            current.tasks,
            current.dependencies,
            workItemsRef.current,
            [project.id],
          );
          workItemsRef.current = savedItems;

          const savedItemMap = new Map(savedItems.map(w => [w.id, w]));
          const computedProgress =
            savedItems.length > 0 ? weightedActualProgress(savedItems) : undefined;
          const nextTasks = current.tasks.map(t => {
            if (t.type === 'project') {
              return computedProgress !== undefined ? { ...t, progress: computedProgress } : t;
            }
            const sw = savedItemMap.get(t.id);
            return sw ? { ...t, updatedAt: sw.updated_at ?? t.updatedAt } : t;
          });

          const projTask = nextTasks.find(t => t.id === project.id);
          const planned = schedulePlanProgress(
            projTask?.startDate ?? project.start_date,
            projTask?.endDate ?? project.end_date,
          );
          if (projTask) {
            updateProject(project.id, {
              name: projTask.name,
              start_date: projTask.startDate,
              end_date: projTask.endDate,
              progress_percentage: projTask.progress,
              planned_progress: planned,
              status: projTask.status as Project['status'],
            });
          } else if (computedProgress !== undefined) {
            updateProject(project.id, {
              progress_percentage: computedProgress,
              planned_progress: planned,
            });
          }
          const cpm = computeCriticalPath(nextTasks, current.dependencies);
          useGanttStore.setState({
            tasks: annotateTasksWithCriticalPath(nextTasks, cpm),
          });
          setConflictPrompt(null);
          commitBaseline();
          showToast('Jadwal disimpan', 'success');
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
          const freshItems = await loadWorkItems(project.id).catch(() => null);
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

        const projTask = current.tasks.find(t => t.id === project.id);
        const planned = schedulePlanProgress(
          projTask?.startDate ?? project.start_date,
          projTask?.endDate ?? project.end_date,
        );
        const avg = projectProgress[project.id];
        if (projTask) {
          updateProject(project.id, {
            name: projTask.name,
            start_date: projTask.startDate,
            end_date: projTask.endDate,
            progress_percentage: avg ?? projTask.progress,
            planned_progress: planned,
            status: projTask.status as Project['status'],
          });
        } else if (avg != null) {
          updateProject(project.id, {
            progress_percentage: avg,
            planned_progress: planned,
          });
        }

        setConflictPrompt(null);
        commitBaseline();
        showToast('Jadwal disimpan', 'success');
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
      isDemoMode,
      baseline,
      getSnapshot,
      currency,
      project.id,
      project.start_date,
      project.end_date,
      updateProject,
      commitBaseline,
      setConflictPrompt,
      showToast,
      setIsSaving,
    ],
  );

  const resolveConflictReload = useCallback(async () => {
    await reloadFromRemote(false, { forceDiscardLocal: true });
  }, [reloadFromRemote]);

  const resolveConflictForceOverwrite = useCallback(
    async () => saveAll({ forceOverwrite: true }),
    [saveAll],
  );

  const handleAddWorkItem = useCallback(
    async (data: AddProjectWorkItemInput): Promise<boolean> => {
      const currentProject = projectRef.current;
      const nameMap = buildMemberNameMap(orgMembersRef.current);

      try {
        const nextSortOrder = workItemsRef.current.filter(
          w => w.project_id === currentProject.id,
        ).length;
        const deps = data.dependencies?.length ? [...new Set(data.dependencies)] : [];
        const status =
          data.progress_pct >= 100
            ? 'completed'
            : data.progress_pct > 0
              ? 'in_progress'
              : 'pending';

        if (isDemo || isDemoOrInvalidUuid(currentProject.id, isDemoMode)) {
          const now = new Date().toISOString();
          const wi: WorkItem = {
            id: `demo-wi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            project_id: currentProject.id,
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
            status,
            sort_order: nextSortOrder,
            created_at: now,
            updated_at: now,
          };
          workItemsRef.current = [...workItemsRef.current, wi];
          saveDemoWorkItems(
            currentProject.id,
            workItemsRef.current.filter(w => w.project_id === currentProject.id),
          );
          const task = workItemToGanttTask(wi, currentProject, nameMap);
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
          project_id: currentProject.id,
          parent_id: data.parent_id ?? null,
          name: data.name,
          planned_start: data.planned_start,
          planned_end: data.planned_end,
          progress_pct: data.progress_pct,
          sort_order: nextSortOrder,
          status,
          priority: data.priority ?? 'medium',
          assigned_member_id: data.assigned_member_id ?? null,
          dependencies: deps,
          dependency_type: data.dependency_type ?? 'FS',
        });
        workItemsRef.current = [...workItemsRef.current, wi];
        const task = workItemToGanttTask(wi, currentProject, nameMap);
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

  const handleDeleteTask = useCallback(
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

  const handleDuplicateTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      const storeTask = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!storeTask || storeTask.type === 'project') return false;
      const currentProject = projectRef.current;
      const sourceWi =
        workItemsRef.current.find(w => w.id === taskId) ?? buildFallbackWorkItem(storeTask);
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
            currentProject.id,
            workItemsRef.current.filter(w => w.project_id === currentProject.id),
          );
        } else {
          duplicated = await duplicateWorkItem(sourceWi);
          workItemsRef.current = [...workItemsRef.current, duplicated];
        }

        const dupTask = workItemToGanttTask(duplicated, currentProject, nameMap);
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

  const handleUpdateMeta = useCallback(
    async (taskId: string, patch: WorkItemExtendedMeta): Promise<boolean> => {
      const storeTask = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!storeTask || storeTask.type === 'project') return false;

      try {
        const isDemoTask = isDemo || isDemoOrInvalidUuid(taskId, isDemoMode);
        let nextUpdatedAt: string | undefined;
        if (isDemoTask) {
          nextUpdatedAt = new Date().toISOString();
        } else {
          lastLocalSaveAtRef.current = Date.now();
          const metaRes = await updateWorkItemExtendedMeta(storeTask.projectId, taskId, patch);
          nextUpdatedAt = metaRes?.updated_at;
        }

        const hasExistingWi = workItemsRef.current.some(w => w.id === taskId);
        const baseList = hasExistingWi
          ? workItemsRef.current
          : [...workItemsRef.current, buildFallbackWorkItem(storeTask)];

        workItemsRef.current = baseList.map(w => {
          if (w.id !== taskId) return w;
          return {
            ...w,
            ...(patch.notes !== undefined ? { notes: patch.notes ?? [] } : {}),
            ...(patch.attachments !== undefined ? { attachments: patch.attachments ?? [] } : {}),
            ...(patch.priority !== undefined && patch.priority !== null
              ? { priority: patch.priority }
              : {}),
            ...(patch.assigned_member_id !== undefined
              ? { assigned_member_id: patch.assigned_member_id }
              : {}),
            ...(nextUpdatedAt ? { updated_at: nextUpdatedAt } : {}),
          };
        });

        if (isDemoTask) {
          saveDemoWorkItems(
            storeTask.projectId,
            workItemsRef.current.filter(w => w.project_id === storeTask.projectId),
          );
        }

        if (patch.notes !== undefined || patch.attachments !== undefined) {
          useGanttStore.getState().updateTaskExtendedMetaLocal(taskId, {
            ...(patch.notes !== undefined ? { notes: patch.notes ?? [] } : {}),
            ...(patch.attachments !== undefined ? { attachments: patch.attachments ?? [] } : {}),
            ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
          });
        }

        if (patch.assigned_member_id !== undefined || patch.priority !== undefined) {
          const nameMap = buildMemberNameMap(orgMembersRef.current);
          const applyMetaPatch = (t: GanttTask): GanttTask => {
            if (t.id !== taskId) return t;
            const nextAssigneeId =
              patch.assigned_member_id !== undefined
                ? patch.assigned_member_id
                : t.assignedMemberId;
            return {
              ...t,
              ...(patch.priority !== undefined && patch.priority !== null
                ? { priority: patch.priority }
                : {}),
              ...(patch.assigned_member_id !== undefined
                ? {
                    assignedMemberId: nextAssigneeId ?? null,
                    assigneeId: nextAssigneeId ?? undefined,
                    assigneeName: nextAssigneeId ? nameMap.get(nextAssigneeId) : undefined,
                  }
                : {}),
              ...(nextUpdatedAt ? { updatedAt: nextUpdatedAt } : {}),
            };
          };

          useGanttStore.setState(s => ({
            tasks: s.tasks.map(applyMetaPatch),
            baseline: s.baseline
              ? { ...s.baseline, tasks: s.baseline.tasks.map(applyMetaPatch) }
              : null,
            undoStack: s.undoStack.map(snap => ({ ...snap, tasks: snap.tasks.map(applyMetaPatch) })),
            redoStack: s.redoStack.map(snap => ({ ...snap, tasks: snap.tasks.map(applyMetaPatch) })),
          }));
        }

        return true;
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal memperbarui detail pekerjaan', 'error');
        return false;
      }
    },
    [isDemo, isDemoMode, showToast],
  );

  const extendProjectEndDate = useCallback(
    async (newEndDate: string): Promise<boolean> => {
      const currentProject = projectRef.current;
      try {
        lastLocalSaveAtRef.current = Date.now();
        if (isDemo || isDemoOrInvalidUuid(currentProject.id, isDemoMode)) {
          updateProject(currentProject.id, { end_date: newEndDate });
        } else {
          const updated = await updateProjectApi(
            currentProject.id,
            { end_date: newEndDate },
            currencyRef.current,
          );
          updateProject(currentProject.id, updated);
        }
        useGanttStore.setState(s => {
          const patchTask = (t: GanttTask) =>
            t.id === currentProject.id ? { ...t, endDate: newEndDate } : t;
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
    reloadFromRemote,
    orgMembers,
    isDemo,
    conflictState: conflictPrompt,
    resolveConflictReload,
    resolveConflictForceOverwrite,
    dismissConflict: () => setConflictPrompt(null),
    handleAddWorkItem,
    handleDeleteTask,
    handleDuplicateTask,
    handleUpdateMeta,
    extendProjectEndDate,
  };
}
