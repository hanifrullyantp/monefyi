import { useState } from 'react';
import { GripVertical, Square, SquareCheck, MoreVertical, AlertTriangle } from 'lucide-react';
import type { MappedRapItem } from '../../lib/migration/planner-mapper';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  item: MappedRapItem;
  onToggleCheck?: () => void;
  showMenu?: boolean;
};

function formatQty(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

export default function WorkItemRow({ item, onToggleCheck, showMenu = true }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOver = item.status === 'over';
  const isPending = item.status === 'pending';
  const isChecked = item.checked || item.qtyActual > 0;
  const statusColor = isOver ? 'bg-rose-500' : isPending ? 'bg-slate-300' : 'bg-emerald-500';

  return (
    <div className={`flex items-center gap-2 px-4 py-3 hover:bg-slate-50/80 border-b border-slate-50 last:border-0 ${isChecked ? 'bg-emerald-50/30' : ''}`}>
      <GripVertical className="w-4 h-4 text-slate-300 shrink-0 cursor-grab" />
      <button
        type="button"
        onClick={onToggleCheck}
        disabled={!onToggleCheck}
        className={`shrink-0 transition-colors ${
          onToggleCheck
            ? 'text-slate-400 hover:text-emerald-600 cursor-pointer'
            : 'text-slate-300 cursor-not-allowed opacity-60'
        }`}
        aria-label={isChecked ? 'Tandai belum' : 'Tandai selesai'}
      >
        {isChecked ? <SquareCheck className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-800 truncate">{item.name}</span>
          {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
        </div>
        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
          <span>
            <span className={isOver ? 'text-rose-600 font-semibold' : ''}>{formatQty(item.qtyActual)}</span>
            <span> / {formatQty(item.qtyPlan)} {item.unit}</span>
          </span>
          <span>@{formatRupiah(item.unitPrice)}</span>
          <span className={isOver ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
            = {formatRupiah(item.total)}
          </span>
          {!isPending && (
            <span className="text-slate-400">(RAP: {formatRupiah(item.rapTotal)})</span>
          )}
        </div>
      </div>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`} />
      {showMenu && (
        <div className="relative shrink-0">
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="p-1 hover:bg-slate-100 rounded-lg">
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  );
}
