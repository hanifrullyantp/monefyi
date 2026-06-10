import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Check } from 'lucide-react';
import { loadPricelistItems } from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import { PRICELIST_CATEGORIES } from '../../services/pricelistService';
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

  useEffect(() => {
    loadPricelistItems(orgId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = items.filter(i => {
    const q = search.toLowerCase().trim();
    const matchQ = !q
      || i.name.toLowerCase().includes(q)
      || (i.product || '').toLowerCase().includes(q);
    const matchC = !category || i.category === category;
    return matchQ && matchC;
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = items.filter(i => selected.has(i.id));
    if (picked.length) onSelect(picked);
    onClose();
  };

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
          <h2 className="font-bold text-slate-900">Pilih dari Pricelist</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari item..."
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
            <div className="p-8 text-center text-sm text-slate-400">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Tidak ada item. Tambahkan di halaman Pricelist dulu.
            </div>
          ) : (
            filtered.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left border-b border-slate-50 hover:bg-slate-50 ${
                    isSelected ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{item.name}</div>
                    {item.product && (
                      <div className="text-xs text-slate-500 truncate">{item.product}</div>
                    )}
                    <div className="text-xs text-slate-400">
                      {item.category} · {item.unit} · Jual {formatRupiahFull(Number(item.selling_price))}
                    </div>
                  </div>
                </button>
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
