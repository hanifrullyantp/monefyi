import { useState } from 'react';
import { GripVertical, Square, SquareCheck, AlertTriangle, Database } from 'lucide-react';
import type { MappedRapItem } from '../../lib/migration/planner-mapper';
import type { RapFieldPatch } from '../../lib/rapItemGrouping';
import { formatRupiah } from '../../utils/projectUi';

type Props = {
  item: MappedRapItem;
  onToggleCheck?: () => void;
  savedToDatabase?: boolean;
  onSaveToDatabase?: () => void;
  onDoubleClick?: () => void;
  onFieldEdit?: (patch: RapFieldPatch) => void;
  canEdit?: boolean;
};

function formatQty(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
  return v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

export default function WorkItemRow({
  item, onToggleCheck, savedToDatabase = false, onSaveToDatabase,
  onDoubleClick, onFieldEdit, canEdit = false,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(item.name);
  const isOver = item.status === 'over';
  const isPending = item.status === 'pending';
  const isChecked = item.checked || item.qtyActual > 0;
  const statusColor = isOver ? 'bg-rose-500' : isPending ? 'bg-slate-300' : 'bg-emerald-500';

  const commitName = () => {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== item.name) {
      onFieldEdit?.({ name: trimmed });
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 hover:bg-emerald-50/40 rounded-xl mx-1 transition-colors cursor-default ${isChecked ? 'bg-emerald-50/40' : ''}`}
      onDoubleClick={onDoubleClick}
    >
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
          {editingName && canEdit ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
              className="text-sm font-semibold border border-emerald-300 rounded-lg px-2 py-0.5 w-full min-w-0"
            />
          ) : (
            <span
              className={`text-sm font-semibold text-slate-800 truncate ${canEdit ? 'cursor-text hover:text-emerald-700' : ''}`}
              onClick={() => { if (canEdit) { setNameDraft(item.name); setEditingName(true); } }}
              title={canEdit ? 'Klik edit nama · 2× detail' : undefined}
            >
              {item.name}
            </span>
          )}
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
      {onSaveToDatabase && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onSaveToDatabase(); }}
          title={savedToDatabase ? 'Tersimpan di Database Master' : 'Simpan ke Database Master'}
          className={`p-1 rounded-lg shrink-0 transition-colors ${
            savedToDatabase
              ? 'text-amber-500 hover:bg-amber-50'
              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
          }`}
          aria-label="Simpan ke database"
        >
          <Database className={`w-4 h-4 ${savedToDatabase ? 'fill-amber-400/30' : ''}`} />
        </button>
      )}
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`} />
    </div>
  );
}
