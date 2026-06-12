import { useMemo, useState } from 'react';
import { Search, CheckSquare } from 'lucide-react';
import type { RapItem } from '../../services/rapService';
import type { RapActualAgg } from '../../services/costService';
import { rapItemStatus, sortByRealizationStatus } from '../../lib/rapRealizationStats';
import { formatRupiah } from '../../utils/projectUi';
import type { RapRowStatus } from '../../utils/rapTableRows';

const TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Tenaga',
  equipment: 'Alat',
  overhead: 'Overhead',
  other: 'Lainnya',
};

const STATUS_LABEL: Record<RapRowStatus, string> = {
  none: 'Belum',
  under: 'Kurang',
  over: 'Over',
  done: 'Selesai',
};

const STATUS_CLASS: Record<RapRowStatus, string> = {
  none: 'bg-slate-100 text-slate-600',
  under: 'bg-amber-100 text-amber-700',
  over: 'bg-rose-100 text-rose-700',
  done: 'bg-emerald-100 text-emerald-700',
};

interface Props {
  items: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  canManage: boolean;
  amountDrafts: Record<string, string>;
  onAmountDraftChange: (id: string, value: string) => void;
  onToggle: (item: RapItem, realized: boolean, amount?: number) => void;
  busyId?: string | null;
}

export default function RapChecklistView({
  items,
  rapActuals,
  canManage,
  amountDrafts,
  onAmountDraftChange,
  onToggle,
  busyId,
}: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [onlyUnrealized, setOnlyUnrealized] = useState(false);

  const enriched = useMemo(() => {
    const rows = items.map(row => {
      const actual = rapActuals[row.id];
      const actualQty = actual?.qty ?? 0;
      const plannedQty = Number(row.quantity) || 0;
      const plannedAmt = plannedQty * Number(row.unit_price);
      const actualAmt = actual?.amount ?? 0;
      const status = rapItemStatus(row, actual);
      const isRealized = status !== 'none';
      return {
        row,
        actualQty,
        plannedQty,
        plannedAmt,
        actualAmt,
        status,
        isRealized,
      };
    });
    return sortByRealizationStatus(rows);
  }, [items, rapActuals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(e => {
      if (onlyUnrealized && e.status !== 'none') return false;
      if (typeFilter !== 'all' && e.row.type !== typeFilter) return false;
      if (q && !e.row.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, search, typeFilter, onlyUnrealized]);

  const types = useMemo(() => [...new Set(items.map(i => i.type || 'other'))], [items]);
  const unrealizedCount = enriched.filter(e => e.status === 'none').length;

  return (
    <div className="space-y-3 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari item..."
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm bg-white"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-xl text-sm bg-white min-w-0"
        >
          <option value="all">Semua kategori</option>
          {types.map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOnlyUnrealized(v => !v)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold border whitespace-nowrap ${
            onlyUnrealized
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          Belum realisasi ({unrealizedCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 min-w-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">Tidak ada item cocok filter.</p>
        ) : (
          filtered.map(e => {
            const { row, plannedQty, plannedAmt, actualAmt, status, isRealized } = e;
            const busy = busyId === row.id;
            return (
              <div key={row.id} className="p-4 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    disabled={!canManage || busy}
                    onClick={() => onToggle(row, !isRealized, amountDrafts[row.id] ? parseFloat(amountDrafts[row.id]) : undefined)}
                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isRealized
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white hover:border-emerald-400'
                    } disabled:opacity-50`}
                    aria-label={isRealized ? 'Tandai belum realisasi' : 'Tandai sudah realisasi'}
                  >
                    {isRealized && <CheckSquare className="w-4 h-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 break-words">{row.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 break-words">
                      {TYPE_LABELS[row.type] || row.type} · Rencana {plannedQty} {row.unit} × {formatRupiah(Number(row.unit_price))} = {formatRupiah(plannedAmt)}
                    </div>
                    {isRealized && (
                      <div className="text-xs text-emerald-600 mt-0.5 font-medium">
                        Realisasi: {formatRupiah(actualAmt)}
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 mt-3 pl-9 min-w-0">
                    <input
                      type="number"
                      min="0"
                      placeholder={isRealized ? 'Nominal' : `Default ${formatRupiah(plannedAmt)}`}
                      value={amountDrafts[row.id] ?? ''}
                      onChange={ev => onAmountDraftChange(row.id, ev.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                    {!isRealized && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onToggle(
                          row,
                          true,
                          amountDrafts[row.id] ? parseFloat(amountDrafts[row.id]) : undefined,
                        )}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-50 shrink-0"
                      >
                        OK
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
