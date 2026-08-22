import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { AlertTriangle, MapPin, Phone, User } from 'lucide-react';
import EstimationCardStatusDropdown from './EstimationCardStatusDropdown';
import EstimationCardActions from './EstimationCardActions';
import { formatDateTimeId, formatRupiahFull } from '../../lib/estimatorFormat';
import { normalizeEstimationStatus } from '../../lib/estimationStatus';
import type { EstimationListViewMode } from '../../lib/estimationListView';
import type { Estimation, EstimationWorkflowStatus } from '../../types/estimator';

type Props = {
  estimation: Estimation;
  viewMode?: EstimationListViewMode;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  onShareWhatsApp?: () => void;
  onKwitansi?: () => void;
  onStatusChange?: (status: EstimationWorkflowStatus | 'rejected') => void;
  statusLoading?: EstimationWorkflowStatus | 'rejected' | null;
  waLoading?: boolean;
  kwitansiLoading?: boolean;
};

function stopCardClick(e: MouseEvent) {
  e.stopPropagation();
}

function cardKeyDown(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onOpen();
  }
}

export default function EstimationCard({
  estimation: est,
  viewMode = 'standard',
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onShareWhatsApp,
  onKwitansi,
  onStatusChange,
  statusLoading = null,
  waLoading = false,
  kwitansiLoading = false,
}: Props) {
  const status = normalizeEstimationStatus(est.status);
  const profit = Number(est.total_profit) || 0;
  const profitNegative = profit < 0;
  const isConverted = status === 'converted';
  const showConvert = !isConverted && onConvert;
  const showWhatsApp = !isConverted && onShareWhatsApp;
  const showKwitansi = !isConverted && onKwitansi;

  const cardClass =
    viewMode === 'card'
      ? 'bg-white border border-slate-200 rounded-xl px-3.5 py-3 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer'
      : viewMode === 'detail'
        ? 'bg-white border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer'
        : 'bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer';

  if (viewMode === 'card') {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={e => cardKeyDown(e, onOpen)}
        className={cardClass}
      >
        <div className="flex items-center justify-between gap-3 min-w-0">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2 min-w-0 flex-1">
            {est.title}
          </h3>
          <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-tight shrink-0">
            {formatRupiahFull(Number(est.total_selling_price))}
          </div>
        </div>
      </article>
    );
  }

  const actions = (
    <EstimationCardActions
      onShareWhatsApp={showWhatsApp ? onShareWhatsApp : undefined}
      onKwitansi={showKwitansi ? onKwitansi : undefined}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onConvert={showConvert ? onConvert : undefined}
      waLoading={waLoading}
      kwitansiLoading={kwitansiLoading}
    />
  );

  if (viewMode === 'detail') {
    const discountPct = Number(est.discount_pct) || 0;
    const discountAmount = Number(est.discount_amount) || 0;
    const marginPct = Number(est.margin_pct) || 0;
    const overheadPct = Number(est.overhead_pct) || 0;

    return (
      <article
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={e => cardKeyDown(e, onOpen)}
        className={cardClass}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
              <span onClick={stopCardClick} onKeyDown={e => e.stopPropagation()}>
                <EstimationCardStatusDropdown
                  status={status}
                  onStatusChange={onStatusChange}
                  loadingStatus={statusLoading}
                />
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base md:text-lg leading-snug">{est.title}</h3>
          </div>
          <span onClick={stopCardClick} onKeyDown={e => e.stopPropagation()}>
            {actions}
          </span>
        </div>

        {(est.customer_name || est.customer_phone || est.customer_address) && (
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            {est.customer_name && (
              <p className="text-sm text-slate-700 flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{est.customer_name}</span>
              </p>
            )}
            {est.customer_phone && (
              <p className="text-sm text-slate-600 flex items-center gap-2 min-w-0">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{est.customer_phone}</span>
              </p>
            )}
            {est.customer_address && (
              <p className="text-sm text-slate-600 flex items-start gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{est.customer_address}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <DetailMetric label="Total penawaran" value={formatRupiahFull(Number(est.total_selling_price))} highlight />
          <DetailMetric
            label="Profit"
            value={formatRupiahFull(profit)}
            tone={profitNegative ? 'danger' : 'success'}
            icon={profitNegative ? <AlertTriangle className="w-3 h-3" /> : undefined}
          />
          <DetailMetric label="Subtotal HPP" value={formatRupiahFull(Number(est.subtotal_hpp))} />
          <DetailMetric label="Margin rata-rata" value={`${marginPct.toFixed(1)}%`} />
          {(discountPct > 0 || discountAmount > 0) && (
            <DetailMetric
              label="Diskon"
              value={
                discountAmount > 0
                  ? formatRupiahFull(discountAmount)
                  : `${discountPct.toFixed(1)}%`
              }
            />
          )}
          {overheadPct > 0 && (
            <DetailMetric label="Overhead" value={`${overheadPct.toFixed(1)}%`} />
          )}
          <DetailMetric label="Berlaku" value={`${est.validity_days || 0} hari`} />
        </div>

        {est.notes?.trim() && (
          <p className="mt-3 text-xs text-slate-500 line-clamp-2 border-t border-slate-100 pt-3">
            {est.notes.trim()}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>Diperbarui {formatDateTimeId(est.updated_at)}</span>
          <span>Dibuat {formatDateTimeId(est.created_at)}</span>
        </div>
      </article>
    );
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => cardKeyDown(e, onOpen)}
      className={cardClass}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
            <span onClick={stopCardClick} onKeyDown={e => e.stopPropagation()}>
              <EstimationCardStatusDropdown
                status={status}
                onStatusChange={onStatusChange}
                loadingStatus={statusLoading}
              />
            </span>
          </div>
          <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 md:truncate">{est.title}</h3>
          {(est.customer_name || est.customer_phone) && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {est.customer_name || '—'}
              {est.customer_phone ? ` · ${est.customer_phone}` : ''}
            </p>
          )}
        </div>

        <span onClick={stopCardClick} onKeyDown={e => e.stopPropagation()}>
          {actions}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl md:text-lg font-black text-slate-900 tabular-nums leading-tight">
            {formatRupiahFull(Number(est.total_selling_price))}
          </div>
          <p className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${profitNegative ? 'text-red-600' : 'text-emerald-600'}`}>
            {profitNegative && <AlertTriangle className="w-3 h-3 shrink-0" />}
            Profit: {formatRupiahFull(profit)}
          </p>
        </div>
      </div>
    </article>
  );
}

function DetailMetric({
  label,
  value,
  highlight,
  tone,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: 'success' | 'danger';
  icon?: ReactNode;
}) {
  const valueClass = highlight
    ? 'text-slate-900 font-black'
    : tone === 'danger'
      ? 'text-red-600 font-bold'
      : tone === 'success'
        ? 'text-emerald-600 font-bold'
        : 'text-slate-800 font-semibold';

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</p>
      <p className={`text-sm tabular-nums mt-0.5 flex items-center gap-1 truncate ${valueClass}`}>
        {icon}
        {value}
      </p>
    </div>
  );
}
