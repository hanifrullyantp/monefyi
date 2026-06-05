import { useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Trash2, Sparkles, List } from 'lucide-react';
import { calcItemRow, emptyItem, sellingFromHpp, type ItemPriceEdit } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { ParsedEstimationItem } from '../../lib/estimatorParser';
import type { EstimationItemDraft } from '../../types/estimator';
import type { PricelistItem } from '../../types/estimator';
import { COMMON_UNITS, pricelistToEstimationItem, PRICELIST_CATEGORIES } from '../../services/pricelistService';
import SmartInputModal from './SmartInputModal';
import PricelistPickerModal from './PricelistPickerModal';

type EditableField = 'name' | 'qty' | 'selling' | 'margin' | 'hpp';

interface Props {
  orgId: string;
  items: EstimationItemDraft[];
  defaultMargin?: number;
  onChange: (items: EstimationItemDraft[]) => void;
}

export default function EstimationItemsTable({ orgId, items, defaultMargin = 20, onChange }: Props) {
  const [smartOpen, setSmartOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  const updateItem = (index: number, patch: Partial<EstimationItemDraft>, editField: ItemPriceEdit = 'selling') => {
    const next = [...items];
    const merged = { ...next[index], ...patch };
    const calc = calcItemRow(merged, editField);
    next[index] = { ...merged, ...calc };
    onChange(next);
  };

  const addRow = () => onChange([...items, emptyItem(items.length)]);
  const removeRow = (index: number) => onChange(items.filter((_, i) => i !== index));

  const focusCell = (row: number, field: EditableField) => {
    const key = `${row}-${field}`;
    cellRefs.current.get(key)?.focus();
  };

  const handleKeyDown = (
    e: KeyboardEvent,
    row: number,
    field: EditableField,
    fields: EditableField[],
  ) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const idx = fields.indexOf(field);
      if (idx < fields.length - 1) {
        focusCell(row, fields[idx + 1]);
      } else if (row < items.length - 1) {
        focusCell(row + 1, fields[0]);
      } else {
        addRow();
        setTimeout(() => focusCell(row + 1, fields[0]), 0);
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (row < items.length - 1) {
        focusCell(row + 1, field);
      } else {
        addRow();
        setTimeout(() => focusCell(row + 1, field), 0);
      }
    }
  };

  const registerRef = (key: string) => (el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  const handleSmartConfirm = (parsed: ParsedEstimationItem[]) => {
    const newItems = parsed.map((p, i) => {
      const base = emptyItem(items.length + i);
      let selling = p.selling_price_per_unit || 0;
      if (!selling && p.hpp_per_unit > 0) {
        selling = sellingFromHpp(p.hpp_per_unit, p.margin_pct);
      }
      const draft: EstimationItemDraft = {
        ...base,
        pricelist_item_id: p.pricelist_item_id || null,
        name: p.name,
        category: 'material',
        unit: p.unit,
        qty: p.qty,
        hpp_per_unit: 0,
        margin_pct: p.margin_pct,
        selling_price_per_unit: selling,
      };
      return { ...draft, ...calcItemRow(draft, 'margin') };
    });
    onChange([...items, ...newItems]);
  };

  const handlePricelistSelect = (picked: PricelistItem[]) => {
    const newItems = picked.map((p, i) => pricelistToEstimationItem(p, items.length + i));
    onChange([...items, ...newItems]);
  };

  const fields: EditableField[] = ['name', 'qty', 'selling', 'margin', 'hpp'];

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Rincian Item</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSmartOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-lg hover:opacity-90"
            >
              <Sparkles className="w-3.5 h-3.5" /> Smart Input
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              <List className="w-3.5 h-3.5" /> Dari Pricelist
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" /> Manual
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 space-y-3">
            <p>Belum ada item.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setSmartOpen(true)}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg"
              >
                ✨ Smart Input
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
              >
                Dari Pricelist
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                  <th className="p-2 w-8">#</th>
                  <th className="p-2">Item</th>
                  <th className="p-2 w-20">Kategori</th>
                  <th className="p-2 w-16">Satuan</th>
                  <th className="p-2 w-16">Qty</th>
                  <th className="p-2 w-24">Jual/Unit</th>
                  <th className="p-2 w-16">Margin%</th>
                  <th className="p-2 w-24">Est. HPP</th>
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
                        ref={registerRef(`${idx}-name`)}
                        value={item.name}
                        onChange={e => updateItem(idx, { name: e.target.value })}
                        onKeyDown={e => handleKeyDown(e, idx, 'name', fields)}
                        className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded focus:border-indigo-400 outline-none"
                        placeholder="Nama item"
                      />
                    </td>
                    <td className="p-1">
                      <select
                        value={item.category}
                        onChange={e => updateItem(idx, { category: e.target.value })}
                        className="w-full px-1 py-1 text-xs border border-slate-200 rounded"
                      >
                        {PRICELIST_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
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
                        ref={registerRef(`${idx}-qty`)}
                        type="number"
                        min={0}
                        step="any"
                        value={item.qty}
                        onChange={e => updateItem(idx, { qty: Number(e.target.value) }, 'qty')}
                        onKeyDown={e => handleKeyDown(e, idx, 'qty', fields)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right focus:border-indigo-400 outline-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        ref={registerRef(`${idx}-selling`)}
                        type="number"
                        min={0}
                        value={Math.round(item.selling_price_per_unit)}
                        onChange={e => updateItem(idx, { selling_price_per_unit: Number(e.target.value) }, 'selling')}
                        onKeyDown={e => handleKeyDown(e, idx, 'selling', fields)}
                        className="w-full px-2 py-1 border border-indigo-200 bg-indigo-50/40 rounded text-right font-semibold focus:border-indigo-400 outline-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        ref={registerRef(`${idx}-margin`)}
                        type="number"
                        min={0}
                        value={item.margin_pct}
                        onChange={e => updateItem(idx, { margin_pct: Number(e.target.value) }, 'margin')}
                        onKeyDown={e => handleKeyDown(e, idx, 'margin', fields)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-right focus:border-indigo-400 outline-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        ref={registerRef(`${idx}-hpp`)}
                        type="number"
                        min={0}
                        value={Math.round(item.hpp_per_unit)}
                        onChange={e => updateItem(idx, { hpp_per_unit: Number(e.target.value) }, 'hpp')}
                        onKeyDown={e => handleKeyDown(e, idx, 'hpp', fields)}
                        className="w-full px-2 py-1 border border-slate-200 bg-slate-50 rounded text-right text-slate-600 focus:border-indigo-400 outline-none"
                        title="Estimasi HPP — dihitung dari harga jual & margin"
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

      {smartOpen && (
        <SmartInputModal
          orgId={orgId}
          defaultMargin={defaultMargin}
          onClose={() => setSmartOpen(false)}
          onConfirm={handleSmartConfirm}
        />
      )}
      {pickerOpen && (
        <PricelistPickerModal
          orgId={orgId}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePricelistSelect}
        />
      )}
    </>
  );
}
