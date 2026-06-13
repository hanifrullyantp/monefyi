import type { ParsedCostLine } from '../../lib/costParser';
import type { SuggestedProject } from '../../lib/batchProjectDetector';
import type { Project } from '../../store/appStore';
import { formatRupiah } from '../../utils/projectUi';
import OpexCategorySelect from '../ui/OpexCategorySelect';

interface UnassignedItemsTableProps {
  id?: string;
  needsAttention?: boolean;
  items: ParsedCostLine[];
  totalAmount: number;
  suggestedProjects: SuggestedProject[];
  projects: Project[];
  orgId: string;
  assignments: Map<string, string>;
  orgAssignments: Map<string, { opexCategoryId?: string; label?: string }>;
  onAssignAll: (projectId: string) => void;
  onAssignAllOrg: (opexCategoryId: string, label: string) => void;
  onItemAssign: (itemId: string, projectId: string) => void;
  onItemAssignOrg: (itemId: string, opexCategoryId: string, label: string) => void;
  onItemChange: (itemId: string, patch: Partial<ParsedCostLine>) => void;
  onItemDelete: (itemId: string) => void;
}

export default function UnassignedItemsTable({
  id,
  needsAttention = false,
  items,
  totalAmount,
  suggestedProjects,
  projects,
  orgId,
  assignments,
  orgAssignments,
  onAssignAll,
  onAssignAllOrg,
  onItemAssign,
  onItemAssignOrg,
  onItemChange,
  onItemDelete,
}: UnassignedItemsTableProps) {
  if (!items.length) return null;

  const pendingCount = items.filter(
    item => !assignments.has(item.id) && !orgAssignments.has(item.id),
  ).length;

  return (
    <div
      id={id}
      className={`border rounded-2xl overflow-hidden mb-3 ${
        needsAttention && pendingCount > 0
          ? 'border-amber-400 ring-2 ring-amber-200'
          : 'border-slate-200'
      }`}
    >
      <div className={`px-3 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
        needsAttention && pendingCount > 0 ? 'bg-amber-50' : 'bg-slate-100'
      }`}>
        <div>
          <span className="text-sm font-bold text-slate-800">Belum diassign</span>
          {needsAttention && pendingCount > 0 && (
            <span className="text-[10px] font-bold uppercase ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-full">
              perlu tindakan
            </span>
          )}
          <p className="text-xs text-slate-600 mt-0.5">
            Item tanpa nama project di teks — pilih <strong>project</strong> atau <strong>organisasi</strong> di kolom Tujuan.
          </p>
          <span className="text-xs text-slate-500">{items.length} item · {formatRupiah(totalAmount)}</span>
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {suggestedProjects.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onAssignAll(s.id)}
              className="text-[10px] px-2 py-1 bg-white border rounded-full hover:bg-emerald-50"
              title={s.reason}
            >
              Project → {s.name}
            </button>
          ))}
          <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full pl-2 pr-1 py-0.5">
            <span className="text-[10px] text-blue-800 whitespace-nowrap">Organisasi →</span>
            <OpexCategorySelect
              orgId={orgId}
              value=""
              onChange={(catId, catName) => {
                if (!catId) return;
                onAssignAllOrg(catId, `Organisasi · ${catName || 'Operasional'}`);
              }}
              className="text-[10px] border-0 bg-transparent py-0.5 pr-1 max-w-[9rem]"
              allowEmpty
              emptyLabel="pilih kategori"
            />
          </div>
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto overflow-x-auto">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2">Tujuan</th>
              <th className="p-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isOrg = orgAssignments.has(item.id);
              const orgAssign = orgAssignments.get(item.id);
              return (
                <tr key={item.id} className={`border-t border-slate-100 ${isOrg ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-2">
                    <input
                      value={item.item}
                      onChange={e => onItemChange(item.id, { item: e.target.value })}
                      className="border rounded px-1 py-0.5 w-full"
                    />
                  </td>
                  <td className="p-2 text-right font-medium">{formatRupiah(item.total)}</td>
                  <td className="p-2">
                    {isOrg ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-blue-700">Biaya organisasi</span>
                        <OpexCategorySelect
                          orgId={orgId}
                          value={orgAssign?.opexCategoryId || ''}
                          onChange={(catId, catName) => {
                            onItemAssignOrg(item.id, catId, `Organisasi · ${catName || 'Operasional'}`);
                          }}
                          className="border rounded px-1 py-0.5 w-full text-[11px]"
                          allowEmpty
                          emptyLabel="Pilih kategori opex..."
                        />
                      </div>
                    ) : (
                      <select
                        value={assignments.get(item.id) || ''}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '__org__') {
                            onItemAssignOrg(item.id, '', 'Organisasi · Operasional');
                          } else if (v) {
                            onItemAssign(item.id, v);
                          }
                        }}
                        className="border rounded px-1 py-0.5 w-full text-[11px]"
                      >
                        <option value="">— pilih —</option>
                        <option value="__org__">Organisasi / Operasional</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => onItemDelete(item.id)} className="text-rose-500 text-xs">
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
