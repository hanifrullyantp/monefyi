import { Trash2 } from 'lucide-react';
import { COMMON_UNITS, PRICELIST_CATEGORIES } from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';

export type PricelistRowPatch = Partial<
  Pick<PricelistItem, 'name' | 'product' | 'category' | 'unit' | 'base_cost' | 'default_margin_pct' | 'selling_price' | 'is_active'>
>;

interface Props {
  row: PricelistItem;
  dirty?: boolean;
  layout: 'table' | 'card';
  onPatch: (id: string, patch: PricelistRowPatch) => void;
  onPriceUpdate: (id: string, field: 'base_cost' | 'default_margin_pct' | 'selling_price', value: number) => void;
  onDelete: (id: string, name: string) => void;
}

export default function PricelistItemFields({
  row,
  dirty = false,
  layout,
  onPatch,
  onPriceUpdate,
  onDelete,
}: Props) {
  if (layout === 'card') {
    const inputCls = 'w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white';
    return (
      <div className={`rounded-2xl border p-4 space-y-3 ${dirty ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white shadow-sm'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 truncate">{row.name || 'Item baru'}</div>
            {row.product && (
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {row.product}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDelete(row.id, row.name)}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
            aria-label="Hapus item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Item</span>
            <input value={row.name} onChange={e => onPatch(row.id, { name: e.target.value })} className={`mt-0.5 ${inputCls}`} placeholder="Nama pekerjaan/item" />
          </label>
          <label className="block col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Produk</span>
            <input value={row.product || ''} onChange={e => onPatch(row.id, { product: e.target.value || null })} className={`mt-0.5 ${inputCls}`} placeholder="Merk / spesifikasi" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Kategori</span>
            <select value={row.category || 'material'} onChange={e => onPatch(row.id, { category: e.target.value as PricelistCategory })} className={`mt-0.5 ${inputCls}`}>
              {PRICELIST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Satuan</span>
            <select value={row.unit} onChange={e => onPatch(row.id, { unit: e.target.value })} className={`mt-0.5 ${inputCls}`}>
              {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Harga jual</span>
            <input type="number" min={0} value={Math.round(Number(row.selling_price))} onChange={e => onPriceUpdate(row.id, 'selling_price', Number(e.target.value))} className="mt-0.5 w-full px-2.5 py-2 border border-emerald-200 bg-emerald-50/40 rounded-lg text-sm text-right font-semibold" />
            <div className="text-[10px] text-emerald-600 text-right">{formatRupiahFull(Number(row.selling_price))}</div>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Margin %</span>
            <input type="number" min={0} value={Math.round(Number(row.default_margin_pct) * 10) / 10} onChange={e => onPriceUpdate(row.id, 'default_margin_pct', Number(e.target.value))} className={`mt-0.5 ${inputCls} text-right`} />
          </label>
          <label className="block col-span-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Est. HPP</span>
            <input type="number" min={0} value={Math.round(Number(row.base_cost))} onChange={e => onPriceUpdate(row.id, 'base_cost', Number(e.target.value))} className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-right text-slate-600" />
            <div className="text-[10px] text-slate-600 text-right">{formatRupiahFull(Number(row.base_cost))}</div>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={row.is_active} onChange={e => onPatch(row.id, { is_active: e.target.checked })} />
          Aktif
        </label>
      </div>
    );
  }

  const inputCls = 'w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-300 rounded outline-none bg-transparent';

  return (
    <tr className={`border-t border-slate-100 ${dirty ? 'bg-amber-50/40' : ''}`}>
      <td className="p-2 align-top"><input value={row.name} onChange={e => onPatch(row.id, { name: e.target.value })} className={inputCls} placeholder="Nama pekerjaan/item" /></td>
      <td className="p-2 align-top"><input value={row.product || ''} onChange={e => onPatch(row.id, { product: e.target.value || null })} className={inputCls} placeholder="Merk / spesifikasi" /></td>
      <td className="p-2 align-top">
        <select value={row.category || 'material'} onChange={e => onPatch(row.id, { category: e.target.value as PricelistCategory })} className="w-full px-1 py-1 text-xs border border-slate-200 rounded">
          {PRICELIST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </td>
      <td className="p-2 align-top hidden lg:table-cell">
        <select value={row.unit} onChange={e => onPatch(row.id, { unit: e.target.value })} className="w-full px-1 py-1 text-xs border border-slate-200 rounded">
          {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="p-2 align-top">
        <input type="number" min={0} value={Math.round(Number(row.selling_price))} onChange={e => onPriceUpdate(row.id, 'selling_price', Number(e.target.value))} className="w-full px-2 py-1 border border-emerald-200 bg-emerald-50/40 rounded text-right font-semibold" />
        <div className="text-[10px] text-emerald-600 text-right font-medium">{formatRupiahFull(Number(row.selling_price))}</div>
      </td>
      <td className="p-2 align-top">
        <input type="number" min={0} value={Math.round(Number(row.default_margin_pct) * 10) / 10} onChange={e => onPriceUpdate(row.id, 'default_margin_pct', Number(e.target.value))} className="w-full px-2 py-1 border border-slate-200 rounded text-right" />
      </td>
      <td className="p-2 align-top hidden lg:table-cell">
        <input type="number" min={0} value={Math.round(Number(row.base_cost))} onChange={e => onPriceUpdate(row.id, 'base_cost', Number(e.target.value))} className="w-full px-2 py-1 border border-slate-200 bg-slate-50 rounded text-right text-slate-600" title="Estimasi HPP dari harga jual & margin" />
        <div className="text-[10px] text-slate-600 text-right">{formatRupiahFull(Number(row.base_cost))}</div>
      </td>
      <td className="p-2 text-center align-top">
        <input type="checkbox" checked={row.is_active} onChange={e => onPatch(row.id, { is_active: e.target.checked })} />
      </td>
      <td className="p-2 align-top">
        <button type="button" onClick={() => onDelete(row.id, row.name)} className="p-1 text-slate-600 hover:text-rose-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
