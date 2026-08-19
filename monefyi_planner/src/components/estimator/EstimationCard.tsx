import type { MouseEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import EstimationCardStatusDropdown from './EstimationCardStatusDropdown';
import EstimationCardActions from './EstimationCardActions';
import { formatRupiahFull } from '../../lib/estimatorFormat';
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
  onStatusChange?: (status: EstimationWorkflowStatus | 'rejected') => void;
  statusLoading?: EstimationWorkflowStatus | 'rejected' | null;
  waLoading?: boolean;
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
  waLoading = false,
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
      className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs text-emerald-600 font-bold">{est.code}</span>
            <EstimationCardStatusDropdown
              status={status}
              onStatusChange={onStatusChange}
              loadingStatus={statusLoading}
            />
          </div>
          <h3 className="font-bold text-slate-900 leading-snug line-clamp-2 md:truncate">{est.title}</h3>
          {(est.customer_name || est.customer_phone) && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {est.customer_name || '—'}
              {est.customer_phone ? ` · ${est.customer_phone}` : ''}
            </p>
          )}
        </div>

        <EstimationCardActions
          onShareWhatsApp={showWhatsApp ? onShareWhatsApp : undefined}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onConvert={showConvert ? onConvert : undefined}
          waLoading={waLoading}
        />
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
