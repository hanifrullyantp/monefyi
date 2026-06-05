import { Plus, Trash2 } from 'lucide-react';
import { calcItemRow, emptyItem } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationItemDraft } from '../../types/estimator';
import { COMMON_UNITS } from '../../services/pricelistService';

interface Props {
  items: EstimationItemDraft[];
  onChange: (items: EstimationItemDraft[]) => void;
}

export default function EstimationItemsTable({ items, onChange }: Props) {
  const updateItem = (index: number, patch: Partial<EstimationItemDraft>, mode: 'margin' | 'selling' = 'margin') => {
    const next = [...items];
    const merged = { ...next[index], ...patch };
    const calc = calcItemRow(merged, mode);
    next[index] = { ...merged, ...calc };
    onChange(next);
  };

  const addRow = () => onChange([...items, emptyItem(items.length)]);
  const removeRow = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm">Rincian Item</h3>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">
          Belum ada item. Klik &quot;Tambah Item&quot; untuk mulai.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="p-2 w-8">#</th>
                <th className="p-2">Item</th>
                <th className="p-2 w-16">Satuan</th>
                <th className="p-2 w-16">Qty</th>
                <th className="p-2 w-24">HPP/Unit</th>
                <th className="p-2 w-16">Margin%</th>
                <th className="p-2 w-24">Jual/Unit</th>
                <th className="p-2 w-24">Total Jual</th>
                <th className="p-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-2 text-slate-400">{idx + 1}</td>
                  <td className="p-1">
                    <input
                      value={item.name}
                      onChange={e => updateItem(idx, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded focus:border-indigo-400 outline-none"
                      placeholder="Nama item"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      value={item.unit}
                      onChange={e => updateItem(idx, { unit: e.target.value })}
                      className="w-full px-1 py-1 text-xs border border-slate-200 rounded"
                    >
                      {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={item.qty}
                      onChange={e => updateItem(idx, { qty: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      value={item.hpp_per_unit}
                      onChange={e => updateItem(idx, { hpp_per_unit: Number(e.target.value) }, 'margin')}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      value={item.margin_pct}
                      onChange={e => updateItem(idx, { margin_pct: Number(e.target.value) }, 'margin')}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      min={0}
                      value={Math.round(item.selling_price_per_unit)}
                      onChange={e => updateItem(idx, { selling_price_per_unit: Number(e.target.value) }, 'selling')}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-right"
                    />
                  </td>
                  <td className="p-2 text-right font-semibold text-slate-700 tabular-nums">
                    {formatRupiahFull(item.total_selling)}
                  </td>
                  <td className="p-1">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
