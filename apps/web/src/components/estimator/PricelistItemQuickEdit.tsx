import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  applyPricelistPricePatch,
  COMMON_UNITS,
  PRICELIST_CATEGORIES,
  updatePricelistItem,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';

interface Props {
  item: PricelistItem;
  onSaved: (updated: PricelistItem) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

export default function PricelistItemQuickEdit({ item, onSaved, onCancel, onError }: Props) {
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);

  const patch = (patchData: Partial<PricelistItem>) => {
    setDraft(prev => ({ ...prev, ...patchData }));
  };

  const handlePrice = (field: 'base_cost' | 'default_margin_pct' | 'selling_price', value: number) => {
    const next = applyPricelistPricePatch(draft, field, value);
    setDraft(prev => ({ ...prev, ...next }));
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      onError('Nama item wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePricelistItem(item.id, {
        name: draft.name.trim(),
        product: draft.product?.trim() || null,
        category: draft.category,
        unit: draft.unit,
        base_cost: Number(draft.base_cost),
        default_margin_pct: Number(draft.default_margin_pct),
        selling_price: Number(draft.selling_price),
      });
      onSaved(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-3 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Nama item</span>
          <input
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Produk</span>
          <input
            value={draft.product || ''}
            onChange={e => patch({ product: e.target.value || null })}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Merk / spesifikasi"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Kategori</span>
          <select
            value={draft.category || 'material'}
            onChange={e => patch({ category: e.target.value as PricelistCategory })}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {PRICELIST_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Satuan</span>
          <select
            value={draft.unit}
            onChange={e => patch({ unit: e.target.value })}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Harga jual</span>
          <input
            type="number"
            min={0}
            value={Math.round(Number(draft.selling_price))}
            onChange={e => handlePrice('selling_price', Number(e.target.value))}
            className="mt-0.5 w-full px-2.5 py-2 border border-emerald-200 bg-emerald-50/40 rounded-lg text-sm text-right font-semibold"
          />
          <div className="text-[10px] text-emerald-600 text-right">{formatRupiahFull(Number(draft.selling_price))}</div>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Margin %</span>
          <input
            type="number"
            min={0}
            value={Math.round(Number(draft.default_margin_pct) * 10) / 10}
            onChange={e => handlePrice('default_margin_pct', Number(e.target.value))}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Est. HPP</span>
          <input
            type="number"
            min={0}
            value={Math.round(Number(draft.base_cost))}
            onChange={e => handlePrice('base_cost', Number(e.target.value))}
            className="mt-0.5 w-full px-2.5 py-2 border border-slate-200 bg-white rounded-lg text-sm text-right text-slate-600"
          />
          <div className="text-[10px] text-slate-500 text-right">{formatRupiahFull(Number(draft.base_cost))}</div>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs border border-slate-200 rounded-lg">
          Batal
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Simpan
        </button>
      </div>
    </div>
  );
}
