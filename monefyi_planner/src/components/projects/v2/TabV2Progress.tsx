import type { WorkItem } from '../../../services/workItemService';

type Props = {
  workItems: WorkItem[];
  onRefresh: () => Promise<void>;
};

export default function TabV2Progress({ workItems }: Props) {
  if (!workItems.length) {
    return <p className="text-sm text-slate-500">Belum ada work item. Buat dari wizard atau Command Center.</p>;
  }

  return (
    <div className="space-y-2">
      {workItems.map(wi => (
        <div key={wi.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">{wi.name}</div>
            <div className="text-xs text-slate-500">{wi.planned_start} → {wi.planned_end}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-700">{Number(wi.progress_pct || 0).toFixed(0)}%</div>
            <div className="text-xs text-slate-400">bobot {wi.weight || 0}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}
