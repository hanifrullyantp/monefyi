import { useCallback, useEffect, useRef } from 'react';
import type { Project } from '../../../store/appStore';
import { useAppStore } from '../../../store/appStore';
import { useGanttStore } from '../../../store/ganttStore';
import { loadWorkItemsForOrg, type WorkItem } from '../../../services/workItemService';
import { loadAllGanttDependencies } from '../../../services/ganttDependencyService';
import { loadBarColors } from '../../../services/ganttBarColorService';
import { applyBarColors, loadProjectOrder, saveGanttChanges } from '../../../services/ganttSaveService';
import { hasGanttDraft, loadGanttDraft } from '../../../services/ganttDraftService';
import { projectToGanttTask, workItemToGanttTask } from '../../../lib/gantt/utils';
import type { GanttTask } from '../../../lib/gantt/types';
import { useUiStore } from '../../../store/uiStore';

/**
 * Syncs project + work item data into the gantt store.
 */
export function useGanttData(projects: Project[], orgId: string | undefined, currency?: string) {
  const {
    init, setTasks, setDependencies, setProjectOrder, setBarColors,
    commitBaseline, setHasDraft, getSnapshot, baseline, setIsSaving,
  } = useGanttStore();
  const updateProject = useAppStore(s => s.updateProject);
  const showToast = useUiStore(s => s.showToast);
  const loadedRef = useRef(false);
  const workItemsRef = useRef<WorkItem[]>([]);

  useEffect(() => {
    if (!orgId) return;
    init(orgId);
    setHasDraft(hasGanttDraft(orgId));
  }, [orgId, init, setHasDraft]);

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
        const [workItems, barColors, savedOrder] = await Promise.all([
          loadWorkItemsForOrg(orgId),
          loadBarColors(orgId),
          loadProjectOrder(orgId),
        ]);
        if (cancelled) return;

        workItemsRef.current = workItems;
        const projectMap = new Map(projects.map(p => [p.id, p]));
        let ganttTasks: GanttTask[] = [];

        projects.forEach((p, i) => {
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
        if (!cancelled) setDependencies(deps);

        const order = savedOrder?.length
          ? savedOrder.filter(id => projects.some(p => p.id === id))
          : projects.map(p => p.id);
        const missing = projects.map(p => p.id).filter(id => !order.includes(id));
        setProjectOrder([...order, ...missing]);

        const withChildren = new Set<string>();
        for (const wi of workItems) withChildren.add(wi.project_id);
        if (withChildren.size) {
          useGanttStore.setState(s => ({
            expandedIds: new Set([...s.expandedIds, ...withChildren]),
          }));
        }

        if (!loadedRef.current) {
          loadedRef.current = true;
        }

        commitBaseline();

        const draft = loadGanttDraft(orgId);
        if (draft && !cancelled) {
          useGanttStore.getState().restoreSnapshot(draft.snapshot);
          useGanttStore.setState({ isDirty: true, hasDraft: true });
        }
      } catch (e) {
        console.error('Gantt load failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [orgId, projects, setTasks, setDependencies, setProjectOrder, setBarColors, commitBaseline]);

  const commitDates = useCallback((taskId: string, _start: string, _end: string) => {
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

      for (const task of current.tasks) {
        if (task.type === 'project') {
          const p = projects.find(x => x.id === task.id);
          if (p) {
            updateProject(task.id, {
              name: task.name,
              start_date: task.startDate,
              end_date: task.endDate,
              progress_percentage: task.progress,
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
      setIsSaving(false);
    }
  }, [orgId, baseline, getSnapshot, currency, projects, updateProject, commitBaseline, setHasDraft, showToast, setIsSaving]);

  return { commitDates, saveAll, workItemsRef };
}
