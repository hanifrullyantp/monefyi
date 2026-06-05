import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import type { Project } from '../../store/appStore';
import { formatRupiah, HEALTH_CONFIG, daysUntil, PROJECT_STATUSES } from '../../../utils/projectUi';

interface KanbanViewProps {
  projects: Project[];
  onOpenProject: (p: Project) => void;
  onStatusChange: (id: string, status: Project['status']) => void;
}

export default function KanbanView({ projects, onOpenProject, onStatusChange }: KanbanViewProps) {
  const byStatus = (status: Project['status']) => projects.filter(p => p.status === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as Project['status'];
    const project = projects.find(p => p.id === draggableId);
    if (project && project.status !== newStatus) {
      onStatusChange(draggableId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[420px]">
        {PROJECT_STATUSES.map(col => {
          const items = byStatus(col.id);
          return (
            <div key={col.id} className="shrink-0 w-64 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">{col.label}</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-slate-500">{items.length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {provided => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="p-2 space-y-2 flex-1 min-h-[120px]">
                    {items.map((p, i) => {
                      const health = HEALTH_CONFIG[p.health_status];
                      const budgetPct = p.total_budget_planned ? Math.min(100, (p.spent_amount / p.total_budget_planned) * 100) : 0;
                      return (
                        <Draggable key={p.id} draggableId={p.id} index={i}>
                          {(drag, snapshot) => (
                            <motion.div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              onClick={() => onOpenProject(p)}
                              className={`bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing shadow-sm ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-200' : 'hover:border-indigo-100'}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${health.dot}`} />
                                <span className="text-[10px] font-mono text-slate-400">{p.code}</span>
                              </div>
                              <div className="font-bold text-sm text-slate-800 truncate">{p.name}</div>
                              <div className="text-[10px] text-slate-400 mt-1">{p.progress_percentage.toFixed(0)}% · {formatRupiah(p.spent_amount)}</div>
                              <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${budgetPct}%` }} />
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">{daysUntil(p.end_date)} hari</div>
                            </motion.div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
