import { Fragment, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, Trash2, Sparkles, List } from 'lucide-react';
import { calcEstimationSummary, calcItemRow, emptyItem, sellingFromHpp, type ItemPriceEdit } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import {
  getEstimationItemProductGroup,
  groupEstimationItemsByProduct,
  groupSharedQty,
  hasProductGroup,
  type EstimationItemGroup,
} from '../../lib/estimatorProductGroup';
import type { ParsedEstimationItem } from '../../lib/estimatorParser';
import type { EstimationItemDraft } from '../../types/estimator';
import type { PricelistItem } from '../../types/estimator';
import { COMMON_UNITS, pricelistToEstimationItem, PRICELIST_CATEGORIES } from '../../services/pricelistService';
import RupiahInput from './RupiahInput';
import SmartInputModal from './SmartInputModal';
import PricelistPickerModal from './PricelistPickerModal';

type EditableField = 'name' | 'qty' | 'selling' | 'margin' | 'hpp';

interface Props {
  orgId: string;
  items: EstimationItemDraft[];
  defaultMargin?: number;
  overheadPct?: number;
  discountPct?: number;
  taxPct?: number;
  onChange: (items: EstimationItemDraft[]) => void;
}

export default function EstimationItemsTable({
  orgId,
  items,
  defaultMargin = 20,
  overheadPct = 0,
  discountPct = 0,
  taxPct = 0,
  onChange,
}: Props) {
  const [smartOpen, setSmartOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  const activeItems = useMemo(() => items.filter(i => i.name.trim()), [items]);
  const productGroups = useMemo(() => groupEstimationItemsByProduct(items), [items]);
  const groupHeaderAt = useMemo(() => {
    const map = new Map<number, EstimationItemGroup>();
    for (const g of productGroups) {
      if (g.indices.length) map.set(Math.min(...g.indices), g);
    }
    return map;
  }, [productGroups]);
  const totals = useMemo(
    () => calcEstimationSummary(activeItems, overheadPct, discountPct, taxPct),
    [activeItems, overheadPct, discountPct, taxPct],
  );

  const updateItem = (index: number, patch: Partial<EstimationItemDraft>, editField: ItemPriceEdit = 'selling') => {
    const next = [...items];
    const merged = { ...next[index], ...patch };
    const calc = calcItemRow(merged, editField);
    next[index] = { ...merged, ...calc };
    onChange(next);
  };

  const addRow = () => onChange([...items, emptyItem(items.length)]);
  const removeRow = (index: number) => onChange(items.filter((_, i) => i !== index));

  const shouldShowGroupHeader = (group: EstimationItemGroup) =>
    group.indices.length > 1 ||
    (group.indices.length === 1 && hasProductGroup(items[group.indices[0]]));

  const setGroupQty = (indices: number[], qty: number) => {
    const next = [...items];
    for (const idx of indices) {
      const merged = { ...next[idx], qty };
      next[idx] = { ...merged, ...calcItemRow(merged, 'qty') };
    }
    onChange(next);
  };

  const focusCell = (row: number, field: EditableField) => {
    cellRefs.current.get(`${row}-${field}`)?.focus();
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
      const selling = p.selling_price_per_unit || (p.hpp_per_unit > 0 ? sellingFromHpp(p.hpp_per_unit, p.margin_pct) : 0);
      const draft: EstimationItemDraft = {
        ...base,
        pricelist_item_id: p.pricelist_item_id || null,
        name: p.name,
        category: 'material',
        unit: p.unit,
        qty: p.qty,
        hpp_per_unit: p.hpp_per_unit > 0 && p.selling_price_per_unit ? p.hpp_per_unit : 0,
        margin_pct: p.margin_pct,
        selling_price_per_unit: selling,
      };
      const anchor: ItemPriceEdit = p.selling_price_per_unit ? 'selling' : p.hpp_per_unit > 0 ? 'margin' : 'selling';
      return { ...draft, ...calcItemRow(draft, anchor) };
    });
    onChange([...items, ...newItems]);
  };

  const handlePricelistSelect = (picked: PricelistItem[]) => {
    const newItems = picked.map((p, i) => pricelistToEstimationItem(p, items.length + i));
    onChange([...items, ...newItems]);
  };

  const fields: EditableField[] = ['name', 'qty', 'selling', 'margin', 'hpp'];

  const thClass = 'px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap';
  const tdClass = 'px-2 py-1.5 align-middle';

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800">Rincian Item</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Harga jual & margin% menentukan HPP (margin = laba ÷ jual)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSmartOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg hover:opacity-90 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Smart Input
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 bg-white"
            >
              <List className="w-3.5 h-3.5" /> Dari Pricelist
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-white bg-white"
            >
              <Plus className="w-3.5 h-3.5" /> Manual
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400 space-y-4">
            <p>Belum ada item estimasi.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setSmartOpen(true)}
                className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100"
              >
                ✨ Smart Input
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Dari Pricelist
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full text-sm min-w-[1100px] table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={`${thClass} w-10`}>#</th>
                  <th className={`${thClass} min-w-[160px]`}>Item</th>
                  <th className={`${thClass} min-w-[80px]`}>Kat.</th>
                  <th className={`${thClass} min-w-[64px]`}>Sat.</th>
                  <th className={`${thClass} min-w-[64px] text-right`}>Qty</th>
                  <th className={`${thClass} min-w-[148px] text-right`}>Jual / unit</th>
                  <th className={`${thClass} min-w-[72px] text-right`}>Margin %</th>
                  <th className={`${thClass} min-w-[148px] text-right`}>HPP / unit</th>
                  <th className={`${thClass} min-w-[130px] text-right`}>Total HPP</th>
                  <th className={`${thClass} min-w-[130px] text-right`}>Total jual</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const group = groupHeaderAt.get(idx);
                  const groupHeader =
                    group && shouldShowGroupHeader(group) ? (
                      <tr
                        key={`group-${group.key}-${idx}`}
                        className="bg-emerald-50/70 border-b border-emerald-100"
                      >
                        <td colSpan={4} className="px-3 py-2">
                          <div className="text-xs font-bold text-emerald-800">{group.key}</div>
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Kelompok produk — ubah qty global di kanan
                          </div>
                        </td>
                        <td className={`${tdClass} text-right`}>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="—"
                            value={groupSharedQty(group.indices, items) ?? ''}
                            onChange={e => setGroupQty(group.indices, Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-emerald-300 bg-white rounded-lg text-right tabular-nums focus:border-emerald-500 outline-none font-semibold text-emerald-800"
                            title={`Qty global untuk semua item ${group.key}`}
                          />
                        </td>
                        <td colSpan={6} className="px-3 py-2 text-[10px] text-emerald-600 align-middle">
                          {group.indices.length} item · satuan per baris tetap bisa diubah sendiri
                        </td>
                      </tr>
                    ) : null;

                  const productLabel = getEstimationItemProductGroup(item);

                  return (
                    <Fragment key={idx}>
                      {groupHeader}
                      <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className={`${tdClass} text-slate-400 text-xs text-center`}>{idx + 1}</td>
                        <td className={tdClass}>
                          <input
                            ref={registerRef(`${idx}-name`)}
                            value={item.name}
                            onChange={e => updateItem(idx, { name: e.target.value })}
                            onKeyDown={e => handleKeyDown(e, idx, 'name', fields)}
                            className="w-full px-2 py-1.5 border border-transparent hover:border-slate-200 rounded-lg focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none text-sm"
                            placeholder="Nama item"
                            title={productLabel ? `Kelompok: ${productLabel}` : undefined}
                          />
                        </td>
                        <td className={tdClass}>
                          <select
                            value={item.category}
                            onChange={e => updateItem(idx, { category: e.target.value })}
                            className="w-full px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            {PRICELIST_CATEGORIES.map(c => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className={tdClass}>
                          <select
                            value={item.unit}
                            onChange={e => updateItem(idx, { unit: e.target.value })}
                            className="w-full px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                          >
                            {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className={tdClass}>
                          <input
                            ref={registerRef(`${idx}-qty`)}
                            type="number"
                            min={0}
                            step="any"
                            value={item.qty}
                            onChange={e => updateItem(idx, { qty: Number(e.target.value) }, 'qty')}
                            onKeyDown={e => handleKeyDown(e, idx, 'qty', fields)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-right tabular-nums focus:border-emerald-400 outline-none"
                          />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <RupiahInput
                            inputRef={registerRef(`${idx}-selling`)}
                            value={item.selling_price_per_unit}
                            onChange={v => updateItem(idx, { selling_price_per_unit: v }, 'selling')}
                            onKeyDown={e => handleKeyDown(e, idx, 'selling', fields)}
                            title={`Harga jual per unit: ${formatRupiahFull(item.selling_price_per_unit)}`}
                            className="px-2 py-1.5 border border-emerald-200 bg-emerald-50/50 rounded-lg text-right font-semibold tabular-nums focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none"
                          />
                        </td>
                        <td className={tdClass}>
                          <input
                            ref={registerRef(`${idx}-margin`)}
                            type="number"
                            min={0}
                            step="0.1"
                            value={item.margin_pct}
                            onChange={e => updateItem(idx, { margin_pct: Number(e.target.value) }, 'margin')}
                            onKeyDown={e => handleKeyDown(e, idx, 'margin', fields)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-right tabular-nums focus:border-emerald-400 outline-none"
                          />
                        </td>
                        <td className={`${tdClass} whitespace-nowrap`}>
                          <RupiahInput
                            inputRef={registerRef(`${idx}-hpp`)}
                            value={item.hpp_per_unit}
                            onChange={v => updateItem(idx, { hpp_per_unit: v }, 'hpp')}
                            onKeyDown={e => handleKeyDown(e, idx, 'hpp', fields)}
                            title={`HPP per unit: ${formatRupiahFull(item.hpp_per_unit)}`}
                            className="px-2 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-right text-slate-700 tabular-nums focus:border-emerald-400 outline-none"
                          />
                        </td>
                        <td className={`${tdClass} text-right text-sm text-slate-600 tabular-nums whitespace-nowrap`}>
                          {formatRupiahFull(item.total_hpp)}
                        </td>
                        <td className={`${tdClass} text-right font-bold text-slate-800 tabular-nums whitespace-nowrap`}>
                          {formatRupiahFull(item.total_selling)}
                        </td>
                        <td className={tdClass}>
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            aria-label="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
              {activeItems.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-semibold text-xs">
                    <td colSpan={8} className="px-3 py-3 text-right text-slate-500 uppercase tracking-wide">
                      Total ({activeItems.length} item)
                    </td>
                    <td className="px-2 py-3 text-right text-slate-600 tabular-nums">
                      {formatRupiahFull(totals.subtotalHpp)}
                    </td>
                    <td className="px-2 py-3 text-right text-emerald-700 tabular-nums">
                      {formatRupiahFull(totals.subtotalSellingItems)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
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
