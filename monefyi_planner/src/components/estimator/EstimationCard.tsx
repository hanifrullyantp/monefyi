import type { MouseEvent } from 'react';
import { Copy, Pencil, Trash2, AlertTriangle, Rocket } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatDateIdShort, formatRupiahFull } from '../../lib/estimatorFormat';
import type { Estimation } from '../../types/estimator';

type Props = {
  estimation: Estimation;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
};

export default function EstimationCard({
  estimation: est,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
}: Props) {
  const profit = Number(est.total_profit) || 0;
  const profitNegative = profit < 0;
  const showConvert = est.status === 'accepted' && onConvert;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Mobile / stacked layout */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
          <StatusBadge status={est.status} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 leading-snug">{est.title}</h3>
          {(est.customer_name || est.customer_phone) && (
            <p className="text-xs text-slate-500 mt-0.5">
              Klien: {est.customer_name || '—'}
              {est.customer_phone ? ` · ${est.customer_phone}` : ''}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{formatDateIdShort(est.updated_at)}</p>
        </div>
        <div>
          <div className="text-xl font-black text-slate-900 tabular-nums">
            {formatRupiahFull(Number(est.total_selling_price))}
          </div>
          <p className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${profitNegative ? 'text-red-600' : 'text-emerald-600'}`}>
            {profitNegative && <AlertTriangle className="w-3 h-3" />}
            Profit: {formatRupiahFull(profit)}
          </p>
        </div>
        <CardActions
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onConvert={showConvert ? onConvert : undefined}
        />
      </div>

      {/* Desktop horizontal */}
      <div className="hidden md:flex md:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
            <StatusBadge status={est.status} />
          </div>
          <h3 className="font-bold text-slate-900 truncate">{est.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {est.customer_name ? `Klien: ${est.customer_name}` : 'Tanpa klien'}
            {est.customer_phone ? ` · ${est.customer_phone}` : ''}
          </p>
          <p className="text-xs text-slate-400">{formatDateIdShort(est.updated_at)}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 tabular-nums">
            {formatRupiahFull(Number(est.total_selling_price))}
          </div>
          <p className={`text-xs font-semibold mt-0.5 flex items-center justify-end gap-1 ${profitNegative ? 'text-red-600' : 'text-emerald-600'}`}>
            {profitNegative && <AlertTriangle className="w-3 h-3" />}
            Profit: {formatRupiahFull(profit)}
          </p>
        </div>
        <CardActions
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onConvert={showConvert ? onConvert : undefined}
        />
      </div>
    </article>
  );
}

function CardActions({
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
}) {
  const stop = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="flex gap-1 shrink-0 md:opacity-80 md:group-hover:opacity-100">
      {onConvert && (
        <button
          type="button"
          title="Jadikan Proyek"
          aria-label="Jadikan Proyek"
          onClick={e => stop(e, onConvert)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Jadikan Proyek</span>
        </button>
      )}
      <ActionIcon icon={Pencil} label="Edit" onClick={e => stop(e, onEdit)} />
      <ActionIcon icon={Copy} label="Duplikat" onClick={e => stop(e, onDuplicate)} />
      <ActionIcon icon={Trash2} label="Hapus" danger onClick={e => stop(e, onDelete)} />
    </div>
  );
}

function ActionIcon({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: (e: MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`p-2 rounded-lg ${
        danger
          ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
          : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
