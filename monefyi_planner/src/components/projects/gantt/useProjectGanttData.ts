import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { loadWorkItems, type WorkItem } from '../../../services/workItemService';
import { getProject } from '../../../services/projectService';
import { schedulePlanProgress } from '../../../lib/progressMetrics';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, saveGanttChanges } from '../../../services/ganttSaveService';
import { depsFromWorkItems } from '../../../services/ganttDependencyService';
import { projectToGanttTask, workItemToGanttTask } from '../../../lib/gantt/utils';
import { snapshotsEqual } from '../../../lib/gantt/snapshot';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';
import { isDemoOrgId } from '../../../lib/demo/demoMode';
import { useGanttRealtime } from '../../../hooks/useGanttRealtime';

/**
 * Loads a single project's work items into the gantt store for the detail page.
 */
export function useProjectGanttData(
  project: Project,
  workItems: WorkItem[],
  orgId: string | undefined,
  currency?: string,
) {
  const {
    init, setTasks, setDependencies, setProjectOrder, setBarColors,
    commitBaseline, setHasDraft, getSnapshot, baseline, setIsSaving,
  } = useGanttStore();
  const updateProject = useAppStore(s => s.updateProject);
  const isDemoMode = useAppStore(s => s.isDemoMode);
  const showToast = useUiStore(s => s.showToast);
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
            `${w.id}:${w.name}:${w.planned_start}:${w.planned_end}:${w.progress_pct}:${w.status}:${w.updated_at ?? ''}:${(w.dependencies || []).join(',')}`,
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
    (effectiveProject: Project, items: WorkItem[], barColors: Record<string, string>) => {
      workItemsRef.current = items;
      let ganttTasks: GanttTask[] = [projectToGanttTask(effectiveProject, 0)];
      for (const wi of items) {
        ganttTasks.push(workItemToGanttTask(wi, effectiveProject));
      }
      ganttTasks = applyBarColors(ganttTasks, barColors);
      setBarColors(barColors);
      setTasks(ganttTasks);
      setProjectOrder([effectiveProject.id]);
      setDependencies(depsFromWorkItems(items));

      useGanttStore.setState(s => ({
        expandedIds: new Set([...s.expandedIds, effectiveProject.id]),
      }));

      loadedRef.current = true;
      commitBaseline();
    },
    [setBarColors, setTasks, setProjectOrder, setDependencies, commitBaseline],
  );

  const reloadFromRemote = useCallback(async (fromRealtime = false) => {
    if (!orgId || isDemo) return;

    const storeState = useGanttStore.getState();
    if (fromRealtime) {
      if (Date.now() - lastLocalSaveAtRef.current < 1500) return;
      if (storeState.isDirty || storeState.isSaving || storeState.drag) return;
    } else if (loadedRef.current && (storeState.isDirty || storeState.isSaving)) {
      return;
    }

    const seq = ++loadSeqRef.current;

    try {
      const [freshProject, freshWorkItems, barColors] = await Promise.all([
        fromRealtime ? getProject(projectRef.current.id, currencyRef.current).catch(() => null) : Promise.resolve(null),
        fromRealtime ? loadWorkItems(projectRef.current.id) : Promise.resolve(workItemsRef.current),
        loadBarColors(orgId),
      ]);
      if (seq !== loadSeqRef.current) return;

      const latestState = useGanttStore.getState();
      if (fromRealtime && (latestState.isDirty || latestState.isSaving || latestState.drag)) {
        return;
      }

      const effectiveProject = freshProject ?? projectRef.current;
      applyStoreData(effectiveProject, freshWorkItems, barColors);
      if (freshProject) {
        updateProject(effectiveProject.id, freshProject);
      }
    } catch (e) {
      console.error('Project gantt load failed:', e);
    }
  }, [orgId, isDemo, applyStoreData, updateProject]);

  useEffect(() => {
    if (!orgId) {
      setTasks([]);
      setDependencies([]);
      return;
    }

    if (isDemo) {
      const storeState = useGanttStore.getState();
      if (loadedRef.current && storeState.isDirty) return;
      applyStoreData(projectRef.current, workItemsRef.current, {});
      return;
    }

    void reloadFromRemote(false);

    return () => {
      loadSeqRef.current += 1;
    };
  }, [orgId, projectKey, workItemsKey, isDemo, applyStoreData, reloadFromRemote, setTasks, setDependencies]);

  useGanttRealtime({
    orgId,
    projectId: project.id,
    isDemoMode,
    enabled: Boolean(orgId && project.id && !isDemo),
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
        const projTask = current.tasks.find(t => t.id === project.id);
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
          });
        }
        commitBaseline();
        showToast('Jadwal disimpan', 'success');
        return true;
      }

      const { workItems: savedItems, projectProgress } = await saveGanttChanges(
        orgId, current, baseline, workItemsRef.current, currency,
      );
      workItemsRef.current = savedItems;
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
        });
      } else if (avg != null) {
        updateProject(project.id, {
          progress_percentage: avg,
          planned_progress: planned,
        });
      }
      commitBaseline();
      showToast('Jadwal disimpan', 'success');
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
    project.id,
    project.start_date,
    project.end_date,
    updateProject,
    commitBaseline,
    showToast,
    setIsSaving,
  ]);

  return { commitDates, saveAll, workItemsRef, reloadFromRemote };
}
