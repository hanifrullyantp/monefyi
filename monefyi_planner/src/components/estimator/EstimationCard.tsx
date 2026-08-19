import type { MouseEvent } from 'react';
import {
  Copy, MessageCircle, Pencil, Rocket, Trash2, AlertTriangle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import EstimationWorkflowIcons from './EstimationWorkflowIcons';
import { formatDateIdShort, formatRupiahFull } from '../../lib/estimatorFormat';
import { normalizeEstimationStatus } from '../../lib/estimationStatus';
import type { Estimation, EstimationWorkflowStatus } from '../../types/estimator';

type Props = {
  estimation: Estimation;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  onShareWhatsApp?: () => void;
  onStatusChange?: (status: EstimationWorkflowStatus) => void;
  statusLoading?: EstimationWorkflowStatus | null;
};

export default function EstimationCard({
  estimation: est,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onShareWhatsApp,
  onStatusChange,
  statusLoading = null,
}: Props) {
  const status = normalizeEstimationStatus(est.status);
  const profit = Number(est.total_profit) || 0;
  const profitNegative = profit < 0;
  const isConverted = status === 'converted';
  const showConvert = !isConverted && onConvert;
  const showWhatsApp = !isConverted && onShareWhatsApp;

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
      {/* Mobile */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
              <StatusBadge status={status} />
            </div>
            <h3 className="font-bold text-slate-900 leading-snug line-clamp-2">{est.title}</h3>
            {(est.customer_name || est.customer_phone) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {est.customer_name || '—'}
                {est.customer_phone ? ` · ${est.customer_phone}` : ''}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-0.5">{formatDateIdShort(est.updated_at)}</p>
          </div>
        </div>

        {onStatusChange && (
          <EstimationWorkflowIcons
            status={status}
            onSelect={onStatusChange}
            loadingStatus={statusLoading}
            disabled={isConverted}
            compact
          />
        )}

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-black text-slate-900 tabular-nums leading-tight">
              {formatRupiahFull(Number(est.total_selling_price))}
            </div>
            <p className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${profitNegative ? 'text-red-600' : 'text-emerald-600'}`}>
              {profitNegative && <AlertTriangle className="w-3 h-3 shrink-0" />}
              Profit: {formatRupiahFull(profit)}
            </p>
          </div>
          <CardActions
            compact
            onShareWhatsApp={showWhatsApp ? onShareWhatsApp : undefined}
            onConvert={showConvert ? onConvert : undefined}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex md:flex-col gap-3">
        <div className="flex md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
              <StatusBadge status={status} />
            </div>
            <h3 className="font-bold text-slate-900 truncate">{est.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {est.customer_name ? est.customer_name : 'Tanpa klien'}
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
            onShareWhatsApp={showWhatsApp ? onShareWhatsApp : undefined}
            onConvert={showConvert ? onConvert : undefined}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>

        {onStatusChange && (
          <EstimationWorkflowIcons
            status={status}
            onSelect={onStatusChange}
            loadingStatus={statusLoading}
            disabled={isConverted}
          />
        )}
      </div>
    </article>
  );
}

function CardActions({
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onShareWhatsApp,
  compact,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  onShareWhatsApp?: () => void;
  compact?: boolean;
}) {
  const stop = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className={`flex shrink-0 ${compact ? 'gap-0.5' : 'gap-1 md:opacity-80 md:group-hover:opacity-100'}`}>
      {onShareWhatsApp && (
        <ActionIcon
          icon={MessageCircle}
          label="Bagikan WhatsApp"
          onClick={e => stop(e, onShareWhatsApp)}
          accent="whatsapp"
          prominent={compact}
        />
      )}
      {onConvert && (
        <ActionIcon
          icon={Rocket}
          label="Jadikan Proyek"
          onClick={e => stop(e, onConvert)}
          accent="convert"
          prominent={compact}
        />
      )}
      <ActionIcon icon={Pencil} label="Edit" onClick={e => stop(e, onEdit)} prominent={compact} />
      <ActionIcon icon={Copy} label="Duplikat" onClick={e => stop(e, onDuplicate)} prominent={compact} />
      <ActionIcon icon={Trash2} label="Hapus" danger onClick={e => stop(e, onDelete)} prominent={compact} />
    </div>
  );
}

function ActionIcon({
  icon: Icon,
  label,
  onClick,
  danger,
  accent,
  prominent,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: (e: MouseEvent) => void;
  danger?: boolean;
  accent?: 'whatsapp' | 'convert';
  prominent?: boolean;
}) {
  const accentClass = accent === 'whatsapp'
    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
    : accent === 'convert'
      ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100'
      : danger
        ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
        : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50';

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-xl transition-colors ${prominent ? 'p-2.5' : 'p-2 rounded-lg'} ${accentClass}`}
    >
      <Icon className={prominent ? 'w-4 h-4' : 'w-4 h-4'} />
    </button>
  );
}
