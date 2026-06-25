import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Check, ChevronDown, ChevronRight } from 'lucide-react';
import {
  groupPricelistByProduct,
  loadPricelistItems,
  PRICELIST_CATEGORIES,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';

interface Props {
  orgId: string;
  onClose: () => void;
  onSelect: (items: PricelistItem[]) => void;
}

export default function PricelistPickerModal({ orgId, onClose, onSelect }: Props) {
  const [items, setItems] = useState<PricelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | PricelistCategory>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPricelistItems(orgId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase().trim();
    const matchQ = !q
      || i.name.toLowerCase().includes(q)
      || (i.product || '').toLowerCase().includes(q);
    const matchC = !category || i.category === category;
    return matchQ && matchC;
  }), [items, search, category]);

  const groups = useMemo(() => groupPricelistByProduct(filtered), [filtered]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupItems: PricelistItem[]) => {
    const ids = groupItems.map(i => i.id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = items.filter(i => selected.has(i.id));
    if (picked.length) onSelect(picked);
    onClose();
  };

  const groupKey = (product: string) => product || '__tanpa_produk__';
  const groupLabel = (product: string) => product || 'Tanpa kelompok produk';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">Pilih dari Pricelist</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Dikelompokkan per produk</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari item atau produk..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as '' | PricelistCategory)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Semua kategori</option>
            {PRICELIST_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-600">Memuat...</div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              Tidak ada item. Tambahkan di halaman Pricelist dulu.
            </div>
          ) : (
            groups.map(group => {
              const key = groupKey(group.product);
              const isCollapsed = collapsed.has(key);
              const groupIds = group.items.map(i => i.id);
              const selectedInGroup = groupIds.filter(id => selected.has(id)).length;
              const allInGroup = selectedInGroup === group.items.length && group.items.length > 0;
              const someInGroup = selectedInGroup > 0 && !allInGroup;

              return (
                <div key={key} className="border-b border-slate-100">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/90 sticky top-0 z-10">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(key)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      aria-label={isCollapsed ? 'Buka grup' : 'Tutup grup'}
                    >
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.items)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        allInGroup
                          ? 'bg-emerald-600 border-emerald-600'
                          : someInGroup
                            ? 'bg-emerald-100 border-emerald-400'
                            : 'border-slate-300'
                      }`}
                      title="Pilih semua item produk ini"
                    >
                      {allInGroup && <Check className="w-3 h-3 text-white" />}
                      {someInGroup && <div className="w-2 h-0.5 bg-emerald-600 rounded" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(key)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-semibold text-sm text-slate-800 truncate">
                        {groupLabel(group.product)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {group.items.length} item
                        {selectedInGroup > 0 && ` · ${selectedInGroup} dipilih`}
                      </div>
                    </button>
                  </div>

                  {!isCollapsed && group.items.map(item => {
                    const isSelected = selected.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className={`w-full flex items-center gap-3 pl-10 pr-5 py-3 text-left hover:bg-slate-50 ${
                          isSelected ? 'bg-emerald-50/80' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">{item.name}</div>
                          <div className="text-xs text-slate-600">
                            {item.category} · {item.unit} · Jual {formatRupiahFull(Number(item.selling_price))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Tambah ({selected.size})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
