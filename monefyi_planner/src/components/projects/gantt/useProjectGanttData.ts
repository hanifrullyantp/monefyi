import { useCallback, useEffect, useRef } from 'react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import type { WorkItem } from '../../../services/workItemService';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, saveGanttChanges } from '../../../services/ganttSaveService';
import { depsFromWorkItems } from '../../../services/ganttDependencyService';
import { projectToGanttTask, workItemToGanttTask } from '../../../lib/gantt/utils';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';

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
  const showToast = useUiStore(s => s.showToast);
  const workItemsRef = useRef<WorkItem[]>(workItems);
  workItemsRef.current = workItems;

  useEffect(() => {
    if (!orgId) return;
    init(orgId);
    setHasDraft(false);
  }, [orgId, init, setHasDraft, project.id]);

  useEffect(() => {
    if (!orgId) {
      setTasks([]);
      setDependencies([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const barColors = await loadBarColors(orgId);
        if (cancelled) return;

        let ganttTasks: GanttTask[] = [projectToGanttTask(project, 0)];
        for (const wi of workItems) {
          ganttTasks.push(workItemToGanttTask(wi, project));
        }
        ganttTasks = applyBarColors(ganttTasks, barColors);
        setBarColors(barColors);
        setTasks(ganttTasks);
        setProjectOrder([project.id]);
        setDependencies(depsFromWorkItems(workItems));

        useGanttStore.setState(s => ({
          expandedIds: new Set([...s.expandedIds, project.id]),
        }));

        commitBaseline();
      } catch (e) {
        console.error('Project gantt load failed:', e);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, project.id, workItems.length, JSON.stringify(workItems.map(w => `${w.id}:${w.progress_pct}:${w.planned_start}`))]);

  const commitDates = useCallback((taskId: string, start: string, end: string) => {
    useGanttStore.getState().pushHistory();
    useGanttStore.getState().updateTask(taskId, { startDate: start, endDate: end });
    useGanttStore.setState({ isDirty: true });
  }, []);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!orgId || !baseline) return true;
    const current = getSnapshot();
    setIsSaving(true);
    try {
      workItemsRef.current = await saveGanttChanges(
        orgId, current, baseline, workItemsRef.current, currency,
      );
      const projTask = current.tasks.find(t => t.id === project.id);
      if (projTask) {
        updateProject(project.id, {
          name: projTask.name,
          start_date: projTask.startDate,
          end_date: projTask.endDate,
          progress_percentage: projTask.progress,
        });
      }
      commitBaseline();
      showToast('Jadwal disimpan', 'success');
      return true;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [orgId, baseline, getSnapshot, currency, project.id, updateProject, commitBaseline, showToast, setIsSaving]);

  return { commitDates, saveAll, workItemsRef };
}
