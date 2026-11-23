import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { ESTIMATION_STATUS_LABEL, formatRupiahFull } from '../../lib/estimatorFormat';
import {
  ESTIMATION_WORKFLOW_STATUSES,
  normalizeEstimationStatus,
} from '../../lib/estimationStatus';
import type { Estimation, EstimationWorkflowStatus } from '../../types/estimator';

type Props = {
  rows: Estimation[];
  onOpen: (est: Estimation) => void;
  onStatusChange: (estId: string, next: EstimationWorkflowStatus | 'rejected') => void;
  statusUpdatingId: string | null;
};

const COLUMN_ACCENTS: Record<EstimationWorkflowStatus, string> = {
  wa: 'border-t-sky-400',
  survei: 'border-t-violet-400',
  penawaran: 'border-t-indigo-400',
  closing: 'border-t-amber-400',
  proses: 'border-t-orange-400',
  finishing: 'border-t-teal-400',
  selesai: 'border-t-emerald-500',
};

export default function EstimationKanbanView({
  rows,
  onOpen,
  onStatusChange,
  statusUpdatingId,
}: Props) {
  const byStatus = (status: EstimationWorkflowStatus) =>
    rows.filter(r => normalizeEstimationStatus(r.status) === status);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId as EstimationWorkflowStatus;
    const est = rows.find(r => r.id === draggableId);
    if (!est) return;
    const current = normalizeEstimationStatus(est.status);
    if (current !== newStatus && current !== 'converted' && current !== 'rejected') {
      onStatusChange(draggableId, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[420px] -mx-1 px-1">
        {ESTIMATION_WORKFLOW_STATUSES.map(status => {
          const items = byStatus(status);
          const label = ESTIMATION_STATUS_LABEL[status];
          return (
            <div
              key={status}
              className={`shrink-0 w-64 sm:w-72 bg-slate-50 rounded-2xl border border-slate-100 border-t-4 ${COLUMN_ACCENTS[status]} flex flex-col`}
            >
              <div className="p-3 border-b border-slate-100 flex justify-between items-center gap-2">
                <span className="text-xs font-bold text-slate-700 truncate">{label}</span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold text-slate-500 shrink-0">
                  {items.length}
                </span>
              </div>
              <Droppable droppableId={status}>
                {provided => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-2 space-y-2 flex-1 min-h-[120px]"
                  >
                    {items.map((est, i) => {
                      const profit = Number(est.total_profit) || 0;
                      const isUpdating = statusUpdatingId === est.id;
                      return (
                        <Draggable key={est.id} draggableId={est.id} index={i} isDragDisabled={isUpdating}>
                          {(drag, snapshot) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              onClick={() => onOpen(est)}
                              className={`bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing shadow-sm transition-shadow ${
                                snapshot.isDragging
                                  ? 'shadow-lg ring-2 ring-emerald-200'
                                  : 'hover:border-emerald-100'
                              } ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-emerald-600 font-bold truncate">
                                  {est.code}
                                </span>
                              </div>
                              <div className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug">
                                {est.title}
                              </div>
                              {est.customer_name && (
                                <div className="text-[10px] text-slate-500 mt-1 truncate">{est.customer_name}</div>
                              )}
                              <div className="text-xs font-black text-slate-900 tabular-nums mt-2">
                                {formatRupiahFull(Number(est.total_selling_price))}
                              </div>
                              <div
                                className={`text-[10px] font-semibold mt-0.5 ${
                                  profit < 0 ? 'text-red-600' : 'text-emerald-600'
                                }`}
                              >
                                Profit {formatRupiahFull(profit)}
                              </div>
                            </div>
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
