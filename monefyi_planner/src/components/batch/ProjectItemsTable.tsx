import { useState } from 'react';
import { ChevronDown, Split, X } from 'lucide-react';
import type { ParsedCostLine } from '../../lib/costParser';
import type { CostRealization } from '../../services/costService';
import { findCostDuplicate } from '../../lib/rapDuplicateDetect';
import { formatRupiah } from '../../utils/projectUi';

const CATEGORIES = ['Material', 'Tenaga Kerja', 'Alat', 'Operasional', 'Marketing', 'Lainnya'];
const UNITS = ['pcs', 'pce', 'sak', 'btg', 'lbr', 'm', 'm2', 'm3', 'kg', 'unit', 'ls', 'tabung'];

interface ProjectItemsTableProps {
  projectId: string;
  projectName: string;
  items: ParsedCostLine[];
  totalAmount: number;
  existingCosts?: CostRealization[];
  badge?: string;
  onItemChange: (itemId: string, patch: Partial<ParsedCostLine>) => void;
  onItemDelete: (itemId: string) => void;
  onItemSplit?: (item: ParsedCostLine) => void;
}

export default function ProjectItemsTable({
  projectName,
  items,
  totalAmount,
  existingCosts = [],
  badge,
  onItemChange,
  onItemDelete,
  onItemSplit,
}: ProjectItemsTableProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b hover:bg-slate-100"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-sm font-bold text-slate-800 truncate">{projectName}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{badge}</span>
          )}
          <span className="text-xs text-slate-500">{items.length} item</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-slate-800">{formatRupiah(totalAmount)}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="max-h-80 overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-white sticky top-0 border-b">
              <tr className="text-slate-500">
                <th className="p-2 text-left">Tgl</th>
                <th className="p-2 text-left">Kategori</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-right">Qty</th>
                <th className="p-2">Sat</th>
                <th className="p-2 text-right">Harga</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2">PIC</th>
                <th className="p-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map(line => {
                const isDupe = existingCosts.length > 0 &&
                  findCostDuplicate(existingCosts, {
                    date: line.date,
                    amount: line.total,
                    description: line.item,
                  });
                const lowConf = line.confidence < 0.7;
                return (
                  <tr
                    key={line.id}
                    className={`border-t border-slate-100 ${isDupe ? 'bg-amber-50' : ''} ${lowConf ? 'bg-amber-50/50' : ''}`}
                  >
                    <td className="p-1.5">
                      <input
                        type="date"
                        value={line.date}
                        onChange={e => onItemChange(line.id, { date: e.target.value })}
                        className="border rounded px-1 py-0.5 w-full text-[11px]"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={line.category || 'Lainnya'}
                        onChange={e => onItemChange(line.id, { category: e.target.value })}
                        className="border rounded px-1 py-0.5 w-full text-[11px]"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input
                        value={line.item}
                        onChange={e => onItemChange(line.id, { item: e.target.value })}
                        className="border rounded px-1 py-0.5 w-full"
                      />
                      {line.isMultiProject && (
                        <span className="text-[10px] text-amber-700 font-semibold">Multi-project</span>
                      )}
                      {lowConf && <span className="text-[10px] text-amber-600">Cek ulang</span>}
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        value={line.quantity ?? ''}
                        onChange={e => onItemChange(line.id, { quantity: Number(e.target.value) || undefined })}
                        className="border rounded px-1 py-0.5 w-full text-right"
                        placeholder="-"
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        value={line.unit || ''}
                        onChange={e => onItemChange(line.id, { unit: e.target.value })}
                        className="border rounded px-1 py-0.5 w-full text-[11px]"
                      >
                        <option value="">-</option>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input
                        type="number"
                        value={line.unitPrice ?? ''}
                        onChange={e => onItemChange(line.id, { unitPrice: Number(e.target.value) || undefined })}
                        className="border rounded px-1 py-0.5 w-full text-right"
                        placeholder="-"
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
                      <input
                        value={line.supplier || ''}
                        onChange={e => onItemChange(line.id, { supplier: e.target.value })}
                        className="border rounded px-1 py-0.5 w-full text-[11px]"
                        placeholder="PIC"
                      />
                    </td>
                    <td className="p-1.5 flex gap-0.5">
                      {line.isMultiProject && onItemSplit && (
                        <button type="button" onClick={() => onItemSplit(line)} className="text-amber-600 p-0.5">
                          <Split className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => onItemDelete(line.id)} className="text-rose-500 p-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-slate-50">
                <td colSpan={6} className="p-2 text-right text-xs font-medium text-slate-600">
                  Subtotal {projectName}:
                </td>
                <td className="p-2 text-right font-bold">{formatRupiah(totalAmount)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
