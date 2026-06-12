import type { ParsedCostLine } from '../../lib/costParser';
import type { SuggestedProject } from '../../lib/batchProjectDetector';
import type { Project } from '../../store/appStore';
import { formatRupiah } from '../../utils/projectUi';

interface UnassignedItemsTableProps {
  items: ParsedCostLine[];
  totalAmount: number;
  suggestedProjects: SuggestedProject[];
  projects: Project[];
  assignments: Map<string, string>;
  onAssignAll: (projectId: string) => void;
  onItemAssign: (itemId: string, projectId: string) => void;
  onItemChange: (itemId: string, patch: Partial<ParsedCostLine>) => void;
  onItemDelete: (itemId: string) => void;
}

export default function UnassignedItemsTable({
  items,
  totalAmount,
  suggestedProjects,
  projects,
  assignments,
  onAssignAll,
  onItemAssign,
  onItemChange,
  onItemDelete,
}: UnassignedItemsTableProps) {
  if (!items.length) return null;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden mb-3">
      <div className="px-3 py-2.5 bg-slate-100 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-bold text-slate-700">Belum diassign</span>
          <span className="text-xs text-slate-500 ml-2">{items.length} item · {formatRupiah(totalAmount)}</span>
        </div>
        {suggestedProjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestedProjects.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onAssignAll(s.id)}
                className="text-[10px] px-2 py-1 bg-white border rounded-full hover:bg-emerald-50"
                title={s.reason}
              >
                Assign semua → {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2">Project</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-2">
                  <input
                    value={item.item}
                    onChange={e => onItemChange(item.id, { item: e.target.value })}
                    className="border rounded px-1 py-0.5 w-full"
                  />
                </td>
                <td className="p-2 text-right font-medium">{formatRupiah(item.total)}</td>
                <td className="p-2">
                  <select
                    value={assignments.get(item.id) || ''}
                    onChange={e => onItemAssign(item.id, e.target.value)}
                    className="border rounded px-1 py-0.5 w-full text-[11px]"
                  >
                    <option value="">— pilih —</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <button type="button" onClick={() => onItemDelete(item.id)} className="text-rose-500 text-xs">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
