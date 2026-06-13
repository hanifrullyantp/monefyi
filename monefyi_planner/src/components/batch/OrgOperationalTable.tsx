import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ParsedCostLine } from '../../lib/costParser';
import type { OrgOperationalGroup } from '../../lib/batchProjectDetector';
import { formatRupiah } from '../../utils/projectUi';

interface OrgOperationalTableProps {
  group: OrgOperationalGroup;
  onItemChange: (itemId: string, patch: Partial<ParsedCostLine>) => void;
  onItemDelete: (itemId: string) => void;
}

export default function OrgOperationalTable({
  group,
  onItemChange,
  onItemDelete,
}: OrgOperationalTableProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-blue-200 rounded-2xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 border-b border-blue-100 hover:bg-blue-100/80"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-sm font-bold text-slate-800 truncate">{group.label}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">Organisasi</span>
          <span className="text-xs text-slate-500">{group.items.length} item</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold">{formatRupiah(group.totalAmount)}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-white border-b sticky top-0">
              <tr className="text-slate-500">
                <th className="p-2 text-left">Tgl</th>
                <th className="p-2 text-left">Kategori</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {group.items.map(line => (
                <tr key={line.id} className="border-t border-slate-100">
                  <td className="p-1.5">
                    <input
                      type="date"
                      value={line.date}
                      onChange={e => onItemChange(line.id, { date: e.target.value })}
                      className="border rounded px-1 py-0.5 w-full text-[11px]"
                    />
                  </td>
                  <td className="p-1.5 text-slate-600">{line.category || 'Operasional'}</td>
                  <td className="p-1.5">
                    <input
                      value={line.item}
                      onChange={e => onItemChange(line.id, { item: e.target.value })}
                      className="border rounded px-1 py-0.5 w-full"
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="number"
                      value={line.total}
                      onChange={e => onItemChange(line.id, { total: Number(e.target.value) })}
                      className="border rounded px-1 py-0.5 w-full text-right font-medium"
                    />
                  </td>
                  <td className="p-1.5">
                    <button type="button" onClick={() => onItemDelete(line.id)} className="text-rose-500">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
