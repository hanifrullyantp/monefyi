import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, X, Check, ChevronLeft, Pencil, Plus, Loader2,
} from 'lucide-react';
import {
  createPricelistItem,
  groupPricelistByProduct,
  groupPricelistItemsByCategory,
  loadPricelistItems,
  PRICELIST_CATEGORIES,
} from '../../services/pricelistService';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { PricelistCategory, PricelistItem } from '../../types/estimator';
import PricelistProductCards from './PricelistProductCards';
import PricelistItemQuickEdit from './PricelistItemQuickEdit';

interface Props {
  orgId: string;
  userId?: string;
  onClose: () => void;
  onSelect: (items: PricelistItem[]) => void;
  onToast?: (msg: string, type: 'success' | 'error') => void;
}

export default function PricelistPickerModal({
  orgId,
  userId = '',
  onClose,
  onSelect,
  onToast,
}: Props) {
  const [items, setItems] = useState<PricelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await loadPricelistItems(orgId, false);
      setItems(data.filter(i => i.is_active !== false));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q)
      || (i.product || '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const productGroups = useMemo(() => groupPricelistByProduct(filtered), [filtered]);

  const expandedGroup = useMemo(
    () => productGroups.find(g => g.product === expandedProduct) ?? null,
    [productGroups, expandedProduct],
  );

  const expandedCategorySections = useMemo(
    () => (expandedGroup ? groupPricelistItemsByCategory(expandedGroup.items) : []),
    [expandedGroup],
  );

  const searchExactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return filtered.some(i => i.name.toLowerCase() === q);
  }, [filtered, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInGroup = (groupItems: PricelistItem[]) => {
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

  const handleConfirm = () => {
    const picked = items.filter(i => selected.has(i.id));
    if (picked.length) onSelect(picked);
    onClose();
  };

  const handleItemSaved = (updated: PricelistItem) => {
    setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    setEditingId(null);
    onToast?.('Item pricelist diperbarui', 'success');
  };

  const handleCreateNew = async () => {
    const name = search.trim();
    if (!name || !userId) {
      onToast?.('Nama item wajib diisi', 'error');
      return;
    }
    setCreating(true);
    try {
      const category: PricelistCategory = 'material';
      const product = expandedProduct?.trim() || null;
      const created = await createPricelistItem({
        org_id: orgId,
        name,
        product,
        category,
        unit: 'pcs',
        base_cost: 0,
        default_margin_pct: 20,
        selling_price: 0,
        notes: null,
        is_active: true,
        created_by: userId,
      });
      setItems(prev => [...prev, created]);
      setSelected(prev => new Set([...prev, created.id]));
      setSearch('');
      setAddingNew(false);
      if (expandedProduct === null && product) setExpandedProduct(product);
      onToast?.('Item baru ditambahkan ke pricelist', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Gagal menambah item', 'error');
    } finally {
      setCreating(false);
    }
  };

  const categoryLabel = (cat: PricelistCategory) =>
    PRICELIST_CATEGORIES.find(c => c.value === cat)?.label ?? cat;

  const renderItemRow = (item: PricelistItem) => {
    const isSelected = selected.has(item.id);
    const isEditing = editingId === item.id;

    return (
      <div key={item.id} className="border-b border-slate-50">
        {!isEditing ? (
          <div className={`flex items-center gap-2 px-4 py-3 ${isSelected ? 'bg-emerald-50/60' : ''}`}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
              }`}
              aria-label={isSelected ? 'Batalkan pilihan' : 'Pilih item'}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="font-medium text-sm text-slate-800 truncate">{item.name}</div>
              <div className="text-xs text-slate-500 truncate">
                {categoryLabel((item.category || 'material') as PricelistCategory)} · {item.unit} · {formatRupiahFull(Number(item.selling_price))}
              </div>
            </button>
            <button
              type="button"
              onClick={() => setEditingId(item.id)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 shrink-0"
              title="Edit item"
              aria-label="Edit item pricelist"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <PricelistItemQuickEdit
            item={item}
            onSaved={handleItemSaved}
            onCancel={() => setEditingId(null)}
            onError={msg => onToast?.(msg, 'error')}
          />
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          {expandedProduct !== null ? (
            <button
              type="button"
              onClick={() => { setExpandedProduct(null); setEditingId(null); setAddingNew(false); }}
              className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-emerald-700 min-w-0"
            >
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="truncate">{expandedGroup?.label || 'Lainnya'}</span>
            </button>
          ) : (
            <div>
              <h2 className="font-bold text-slate-900">Pricelist</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Pilih kelompok kerja, lalu item rinciannya</p>
            </div>
          )}
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari item atau kelompok kerja..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            />
          </div>
          {search.trim() && !searchExactMatch && userId && (
            <button
              type="button"
              onClick={() => void handleCreateNew()}
              disabled={creating}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah &quot;{search.trim()}&quot; sebagai item baru
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Memuat...
            </div>
          ) : expandedProduct === null ? (
            <PricelistProductCards
              groups={productGroups}
              selectedIds={selected}
              onSelectProduct={product => setExpandedProduct(product)}
            />
          ) : expandedGroup ? (
            <div>
              <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10">
                <span className="text-xs text-slate-500">{expandedGroup.items.length} item</span>
                <button
                  type="button"
                  onClick={() => toggleAllInGroup(expandedGroup.items)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Pilih semua
                </button>
              </div>

              {expandedGroup.items.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Belum ada item di kelompok ini.
                  {userId && (
                    <button
                      type="button"
                      onClick={() => setAddingNew(true)}
                      className="block mx-auto mt-2 text-emerald-600 font-bold text-xs"
                    >
                      + Tambah item baru
                    </button>
                  )}
                </div>
              ) : (
                expandedCategorySections.map(section => (
                  <div key={section.category}>
                    <div className="px-4 py-1.5 bg-slate-100/80 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {section.label}
                      </span>
                    </div>
                    {section.items.map(renderItemRow)}
                  </div>
                ))
              )}

              {userId && !addingNew && expandedGroup.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddingNew(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-50"
                >
                  <Plus className="w-4 h-4" /> Tambah item baru
                </button>
              )}

              {addingNew && userId && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                  <p className="text-xs font-bold text-slate-600">
                    Item baru — {expandedGroup.label}
                  </p>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Nama item..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAddingNew(false)} className="flex-1 py-2 text-xs border rounded-xl">
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCreateNew()}
                      disabled={creating || !search.trim()}
                      className="flex-1 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl disabled:opacity-50"
                    >
                      {creating ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 flex gap-2 safe-bottom">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Tambah ke estimasi ({selected.size})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
