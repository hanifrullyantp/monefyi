import { useMemo, useState, useEffect } from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Search, LayoutGrid, Table2, List, Trash2 } from 'lucide-react';
import type { RapItem } from '../../services/rapService';
import type { RapActualAgg } from '../../services/costService';
import { formatRupiah } from '../../utils/projectUi';
import { formatSelisih } from '../../services/rapExcelService';
import { sortByRealizationStatus } from '../../lib/rapRealizationStats';
import type { RapRowStatus } from '../../utils/rapTableRows';

export type RapViewMode = 'grouped' | 'table' | 'cards';
export type RapStatusFilter = 'all' | 'none' | 'under' | 'over' | 'done';

const TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Tenaga',
  equipment: 'Alat',
  overhead: 'Overhead',
  other: 'Lainnya',
};

interface Props {
  items: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  mode: 'planning' | 'realisasi';
  canManage: boolean;
  rapTotal?: number;
  qtyDrafts?: Record<string, string>;
  onQtyDraftChange?: (id: string, value: string) => void;
  onSubmitQty?: (row: RapItem) => void;
  onOpenRealization?: (row: RapItem) => void;
  onEdit?: (row: RapItem) => void;
  onDelete?: (id: string) => void;
}

export default function RapItemList({
  items,
  rapActuals,
  mode,
  canManage,
  rapTotal,
  qtyDrafts = {},
  onQtyDraftChange,
  onSubmitQty,
  onOpenRealization,
  onEdit,
  onDelete,
}: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<RapStatusFilter>('all');
  const isDesktop = useIsDesktop();
  const [viewMode, setViewMode] = useState<RapViewMode>('grouped');

  useEffect(() => {
    setViewMode(isDesktop ? 'table' : 'grouped');
  }, [isDesktop]);

  const enriched = useMemo(() => {
    return items.map(row => {
      const actual = rapActuals[row.id];
      const actualQty = actual?.qty || 0;
      const plannedQty = Number(row.quantity) || 0;
      const plannedAmt = plannedQty * Number(row.unit_price);
      const actualAmt = actual?.amount || 0;
      const fillPct = plannedQty > 0 ? (actualQty / plannedQty) * 100 : 0;
      let status: RapStatusFilter = 'none';
      if (actualQty !== 0) {
        if (plannedQty > 0 && actualQty >= plannedQty) status = 'done';
        else if (fillPct > 100) status = 'over';
        else status = 'under';
      }
      return { row, actual, actualQty, plannedQty, plannedAmt, actualAmt, fillPct, status };
    });
  }, [items, rapActuals]);

  const sorted = useMemo(() => {
    if (mode !== 'realisasi') return enriched;
    const withStatus = enriched.map(e => ({ ...e, status: e.status as RapRowStatus }));
    return sortByRealizationStatus(withStatus);
  }, [enriched, mode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter(e => {
      if (typeFilter !== 'all' && e.row.type !== typeFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (q && !e.row.name.toLowerCase().includes(q) && !(e.row.type || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sorted, search, typeFilter, statusFilter]);

  const unrealizedCount = enriched.filter(e => e.status === 'none').length;

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const e of filtered) {
      const key = e.row.type || 'other';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [filtered]);

  const types = useMemo(() => [...new Set(items.map(i => i.type || 'other'))], [items]);

  const renderRowActions = (row: RapItem) => {
    if (mode === 'planning' && canManage) {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => onEdit?.(row)} className="text-emerald-600 text-xs font-bold">Edit</button>
          <button type="button" onClick={() => onDelete?.(row.id)} className="text-rose-500 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      );
    }
    if (mode === 'realisasi' && canManage) {
      return (
        <div className="flex gap-2 items-center mt-2">
          <input
            type="number"
            step="any"
            placeholder={`Qty (${row.unit}) — minus = koreksi`}
            value={qtyDrafts[row.id] ?? ''}
            onChange={e => onQtyDraftChange?.(row.id, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmitQty?.(row); } }}
            className="flex-1 px-3 py-2 border rounded-xl text-sm"
          />
          <button type="button" onClick={() => onSubmitQty?.(row)} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0">↵</button>
        </div>
      );
    }
    return null;
  };

  const renderItemBody = (e: typeof enriched[0], compact = false) => {
    const { row, actualQty, plannedQty, plannedAmt, actualAmt, fillPct } = e;
    const selisih = formatSelisih(plannedAmt, actualAmt);
    const content = (
      <>
        <div className={`flex justify-between gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">{row.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {TYPE_LABELS[row.type] || row.type} · Rencana {plannedQty} {row.unit} × {formatRupiah(Number(row.unit_price))}
            </div>
            {(actualQty !== 0 || mode === 'realisasi') && (
              <div className={`text-xs mt-0.5 ${actualQty < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                Realisasi: {actualQty} {row.unit} · {formatRupiah(actualAmt)}
                {mode === 'realisasi' && actualQty !== 0 && (
                  <span className={`ml-1 font-bold ${selisih.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ({selisih.diff >= 0 ? '+' : '−'}{selisih.label})
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold">{formatRupiah(plannedAmt)}</div>
            {mode === 'planning' && canManage && (
              <div className="flex gap-1 justify-end mt-1">{renderRowActions(row)}</div>
            )}
          </div>
        </div>
        {plannedQty > 0 && (
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${fillPct > 100 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, fillPct))}%` }}
            />
          </div>
        )}
        {mode === 'realisasi' && renderRowActions(row)}
      </>
    );

    if (mode === 'realisasi' && canManage) {
      return (
        <div key={row.id} className="p-4 border-t">
          <button type="button" onClick={() => onOpenRealization?.(row)} className="w-full text-left">
            {content}
          </button>
        </div>
      );
    }

    return (
      <div key={row.id} className={`p-4 border-t ${compact ? 'py-3' : ''}`}>
        {content}
      </div>
    );
  };

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari item RAP..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-xl text-sm bg-white">
          <option value="all">Semua kategori</option>
          {types.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
        {mode === 'realisasi' && (
          <>
            <button
              type="button"
              onClick={() => setStatusFilter(v => v === 'none' ? 'all' : 'none')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                statusFilter === 'none'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              Belum realisasi ({unrealizedCount})
            </button>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as RapStatusFilter)} className="px-3 py-2 border rounded-xl text-sm bg-white">
              <option value="all">Semua status</option>
              <option value="none">Belum direalisasi</option>
              <option value="under">Kurang dari RAP</option>
              <option value="over">Over RAP</option>
              <option value="done">Tercapai</option>
            </select>
          </>
        )}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'grouped' as const, icon: List, label: 'Grup' },
            { id: 'table' as const, icon: Table2, label: 'Tabel' },
            { id: 'cards' as const, icon: LayoutGrid, label: 'Kartu' },
          ]).map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewMode(v.id)}
              title={v.label}
              className={`p-2 rounded-lg ${viewMode === v.id ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
            >
              <v.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {rapTotal != null && (
        <div className="bg-emerald-50 rounded-xl p-3 text-sm font-bold text-emerald-800 flex justify-between">
          <span>Total RAP · {filtered.length}/{items.length} item</span>
          <span>{formatRupiah(rapTotal)}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-600 text-center py-8 bg-white rounded-xl border">Tidak ada item cocok filter.</p>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="text-left p-3">Item</th>
                <th className="text-left p-3">Kategori</th>
                <th className="text-right p-3">Rencana</th>
                <th className="text-right p-3">Realisasi</th>
                <th className="text-right p-3">RAP (Rp)</th>
                <th className="text-right p-3">%</th>
                {mode === 'planning' && canManage && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.row.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium">{e.row.name}</td>
                  <td className="p-3">{TYPE_LABELS[e.row.type] || e.row.type}</td>
                  <td className="p-3 text-right">{e.plannedQty} {e.row.unit}</td>
                  <td className={`p-3 text-right ${e.actualQty < 0 ? 'text-amber-600' : ''}`}>{e.actualQty} {e.row.unit}</td>
                  <td className="p-3 text-right font-bold">{formatRupiah(e.plannedAmt)}</td>
                  <td className="p-3 text-right">{e.plannedQty > 0 ? `${Math.round(e.fillPct)}%` : '—'}</td>
                  {mode === 'planning' && canManage && (
                    <td className="p-3">
                      <button type="button" onClick={() => onEdit?.(e.row)} className="text-emerald-600 font-bold">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.map(e => (
            <div key={e.row.id} className="bg-white rounded-xl border p-3">
              {renderItemBody(e, true)}
            </div>
          ))}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 font-bold text-sm uppercase">{TYPE_LABELS[cat] || cat}</div>
            {list.map(e => renderItemBody(e))}
          </div>
        ))
      )}
    </div>
  );
}
