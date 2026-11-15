import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { loadWorkItemsForOrg, createWorkItem, type WorkItem } from '../../../services/workItemService';
import { loadAllGanttDependencies } from '../../../services/ganttDependencyService';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, loadProjectOrder, saveGanttChanges } from '../../../services/ganttSaveService';
import { loadProjects } from '../../../services/projectService';
import { schedulePlanProgress } from '../../../lib/progressMetrics';
import { hasGanttDraft, loadGanttDraft } from '../../../services/ganttDraftService';
import { projectToGanttTask, workItemToGanttTask } from '../../../lib/gantt/utils';
import { snapshotsEqual } from '../../../lib/gantt/snapshot';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';
import { isDemoOrgId } from '../../../lib/demo/demoMode';
import { useGanttRealtime } from '../../../hooks/useGanttRealtime';

/**
 * Syncs project + work item data into the gantt store.
 */
export function useGanttData(projects: Project[], orgId: string | undefined, currency?: string) {
  const {
    init, setTasks, setDependencies, setProjectOrder, setBarColors,
    commitBaseline, setHasDraft, getSnapshot, baseline, setIsSaving,
  } = useGanttStore();
  const updateProject = useAppStore(s => s.updateProject);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);
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

  const reloadFromRemote = useCallback(async (fromRealtime = false) => {
    if (!orgId || isDemo) return;
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
    } else if (loadedRef.current && (storeState.isDirty || storeState.isSaving)) {
      return;
    }

    const seq = ++loadSeqRef.current;

    try {
      const [workItems, barColors, savedOrder, freshProjects] = await Promise.all([
        loadWorkItemsForOrg(orgId),
        loadBarColors(orgId),
        loadProjectOrder(orgId),
        fromRealtime ? loadProjects(orgId, currencyRef.current).catch(() => null) : Promise.resolve(null),
      ]);
      if (seq !== loadSeqRef.current) return;

      const latestState = useGanttStore.getState();
      if (fromRealtime && (latestState.isDirty || latestState.isSaving || latestState.drag)) {
        return;
      }

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
        if (project) ganttTasks.push(workItemToGanttTask(wi, project));
      }

      ganttTasks = applyBarColors(ganttTasks, barColors);
      setBarColors(barColors);
      setTasks(ganttTasks);

      const deps = await loadAllGanttDependencies(orgId, workItems, ganttTasks);
      if (seq !== loadSeqRef.current) return;
      setDependencies(deps);

      const order = savedOrder?.length
        ? savedOrder.filter(id => effectiveProjects.some(p => p.id === id))
        : effectiveProjects.map(p => p.id);
      const missing = effectiveProjects.map(p => p.id).filter(id => !order.includes(id));
      setProjectOrder([...order, ...missing]);

      const wasLoaded = loadedRef.current;
      loadedRef.current = true;

      commitBaseline();

      if (!fromRealtime && !wasLoaded) {
        const draft = loadGanttDraft(orgId);
        if (draft && seq === loadSeqRef.current) {
          useGanttStore.getState().restoreSnapshot(draft.snapshot);
          useGanttStore.setState({ isDirty: true, hasDraft: true });
        }
      }
    } catch (e) {
      console.error('Gantt load failed:', e);
    }
  }, [orgId, isDemo, setTasks, setDependencies, setProjectOrder, setBarColors, commitBaseline]);

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

      const ganttTasks = currentProjects.map((p, i) => projectToGanttTask(p, i));
      workItemsRef.current = [];
      setBarColors({});
      setTasks(ganttTasks);
      setDependencies([]);
      setProjectOrder(currentProjects.map(p => p.id));

      const wasLoaded = loadedRef.current;
      loadedRef.current = true;
      commitBaseline();

      if (!wasLoaded) {
        const draft = loadGanttDraft(orgId);
        if (draft) {
          useGanttStore.getState().restoreSnapshot(draft.snapshot);
          useGanttStore.setState({ isDirty: true, hasDraft: true });
        }
      }
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
  ]);

  useGanttRealtime({
    orgId,
    projectIds,
    isDemoMode,
    enabled: Boolean(orgId && !isDemo),
    onRefresh: () => reloadFromRemote(true),
  });

  const commitDates = useCallback((taskId: string, start: string, end: string) => {
    const state = useGanttStore.getState();
    const existing = state.tasks.find(t => t.id === taskId);
    if (!existing) return;
    if (existing.startDate !== start || existing.endDate !== end) {
      state.updateTask(taskId, { startDate: start, endDate: end }, true);
      return;
    }
    useGanttStore.setState({
      isDirty: !snapshotsEqual(state.getSnapshot(), state.baseline),
    });
  }, []);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!orgId || !baseline) return true;
    const current = getSnapshot();
    setIsSaving(true);
    lastLocalSaveAtRef.current = Date.now();
    try {
      if (isDemo) {
        for (const task of current.tasks) {
          if (task.type === 'project') {
            const p = projects.find(x => x.id === task.id);
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
        commitBaseline();
        setHasDraft(false);
        showToast('Perubahan Gantt disimpan', 'success');
        return true;
      }

      const { workItems: savedItems, projectProgress } = await saveGanttChanges(
        orgId, current, baseline, workItemsRef.current, currency,
      );
      workItemsRef.current = savedItems;

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

      commitBaseline();
      setHasDraft(false);
      showToast('Perubahan Gantt disimpan', 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
      return false;
    } finally {
      lastLocalSaveAtRef.current = Date.now();
      setIsSaving(false);
    }
  }, [
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
  ]);

  const addWorkItem = useCallback(async (
    projectId: string,
    data: { name: string; planned_start: string; planned_end: string; progress_pct: number },
  ): Promise<boolean> => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return false;

    try {
      if (isDemo) {
        const now = new Date().toISOString();
        const wi: WorkItem = {
          id: `demo-wi-${Date.now()}`,
          project_id: projectId,
          parent_id: null,
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
          dependencies: [],
          dependency_type: 'FS',
          status: 'pending',
          sort_order: workItemsRef.current.filter(w => w.project_id === projectId).length,
          created_at: now,
          updated_at: now,
        };
        workItemsRef.current = [...workItemsRef.current, wi];
        const task = workItemToGanttTask(wi, project);
        useGanttStore.setState(s => ({
          tasks: [...s.tasks, task],
          expandedIds: new Set([...s.expandedIds, projectId]),
        }));
        showToast('Pekerjaan ditambahkan', 'success');
        return true;
      }

      lastLocalSaveAtRef.current = Date.now();
      const wi = await createWorkItem({
        project_id: projectId,
        name: data.name,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
        progress_pct: data.progress_pct,
        sort_order: workItemsRef.current.filter(w => w.project_id === projectId).length,
        status: 'pending',
      });
      workItemsRef.current = [...workItemsRef.current, wi];
      const task = workItemToGanttTask(wi, project);
      useGanttStore.setState(s => ({
        tasks: [...s.tasks, task],
        expandedIds: new Set([...s.expandedIds, projectId]),
      }));
      showToast('Pekerjaan ditambahkan', 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah pekerjaan', 'error');
      return false;
    }
  }, [projects, isDemo, showToast]);

  return { commitDates, saveAll, workItemsRef, addWorkItem, reloadFromRemote };
}
