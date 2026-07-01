import { useCallback, useEffect, useRef } from 'react';
import type { Project } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { loadWorkItemsForOrg, updateWorkItem, type WorkItem } from '../../../services/workItemService';
import { updateProject as updateProjectApi } from '../../../services/projectService';
import { loadAllGanttDependencies } from '../../../services/ganttDependencyService';
import { projectToGanttTask, workItemToGanttTask } from '../../../lib/gantt/utils';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';

/**
 * Syncs project + work item data into the gantt store and handles persistence.
 */
export function useGanttData(projects: Project[], orgId: string | undefined, currency?: string) {
  const { init, setTasks, setDependencies, setProjectOrder, updateTask } = useGanttStore();
  const showToast = useUiStore(s => s.showToast);
  const loadedRef = useRef(false);
  const workItemsRef = useRef<WorkItem[]>([]);

  useEffect(() => {
    if (!orgId) return;
    init(orgId);
  }, [orgId, init]);

  useEffect(() => {
    if (!orgId || !projects.length) {
      setTasks([]);
      setDependencies([]);
      workItemsRef.current = [];
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const workItems = await loadWorkItemsForOrg(orgId);
        if (cancelled) return;

        workItemsRef.current = workItems;
        const projectMap = new Map(projects.map(p => [p.id, p]));
        const ganttTasks: GanttTask[] = [];

        projects.forEach((p, i) => {
          ganttTasks.push(projectToGanttTask(p, i));
        });

        for (const wi of workItems) {
          const project = projectMap.get(wi.project_id);
          if (project) ganttTasks.push(workItemToGanttTask(wi, project));
        }

        setTasks(ganttTasks);

        const deps = await loadAllGanttDependencies(orgId, workItems, ganttTasks);
        if (!cancelled) setDependencies(deps);

        const withChildren = new Set<string>();
        for (const wi of workItems) withChildren.add(wi.project_id);
        if (withChildren.size) {
          useGanttStore.setState(s => ({
            expandedIds: new Set([...s.expandedIds, ...withChildren]),
          }));
        }

        if (!loadedRef.current) {
          setProjectOrder(projects.map(p => p.id));
          loadedRef.current = true;
        }
      } catch (e) {
        console.error('Gantt load failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [orgId, projects, setTasks, setDependencies, setProjectOrder]);

  const saveTaskDates = useCallback(
    async (taskId: string, startDate: string, endDate: string) => {
      const task = useGanttStore.getState().tasks.find(t => t.id === taskId);
      if (!task) return;

      updateTask(taskId, { startDate, endDate });

      try {
        if (task.type === 'project') {
          await updateProjectApi(taskId, { start_date: startDate, end_date: endDate }, currency);
        } else {
          await updateWorkItem(taskId, { planned_start: startDate, planned_end: endDate });
        }
        showToast('Jadwal diperbarui', 'success');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Gagal menyimpan jadwal', 'error');
      }
    },
    [currency, showToast, updateTask],
  );

  const reloadDependencies = useCallback(async () => {
    if (!orgId) return;
    const tasks = useGanttStore.getState().tasks;
    const deps = await loadAllGanttDependencies(orgId, workItemsRef.current, tasks);
    setDependencies(deps);
  }, [orgId, setDependencies]);

  return { saveTaskDates, workItemsRef, reloadDependencies };
}
