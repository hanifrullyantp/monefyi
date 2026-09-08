import { Plus, User } from 'lucide-react';
import EstimatorActionsMenu from '../EstimatorActionsMenu';
import AutoSaveIndicator from '../AutoSaveIndicator';
import StatusBadgeDropdown from '../StatusBadgeDropdown';
import EstimationDetailSummaryMetrics from './EstimationDetailSummaryMetrics';
import EstimationDetailMetaRow from './EstimationDetailMetaRow';
import EstimationProjectLinkCoachmark from './EstimationProjectLinkCoachmark';
import { formatEstimationClientLine } from '../../../lib/estimatorClientLine';
import { normalizeEstimationStatus } from '../../../lib/estimationStatus';
import type { AutoSaveStatus } from '../../../hooks/useAutoSave';
import type { EstimationFormDraft, EstimationStatus, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  countedItemCount: number;
  isNew: boolean;
  isReadOnly: boolean;
  statusChanging: boolean;
  detailOpen: boolean;
  onToggleDetail: () => void;
  onTitleChange: (title: string) => void;
  onStatusTransition: (next: EstimationStatus) => void;
  onAddItem: () => void;
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  convertedProjectId: string | null;
  linkedProjectId: string | null;
  linkedProjectName?: string;
  sentAt?: string | null;
  updatedAt?: string | null;
  userId?: string;
  autoSaveStatus?: AutoSaveStatus;
  onRetryAutoSave?: () => void;
};

export default function EstimationDetailHeaderCard({
  draft,
  summary,
  countedItemCount,
  isNew,
  isReadOnly,
  statusChanging,
  detailOpen,
  onToggleDetail,
  onTitleChange,
  onStatusTransition,
  onAddItem,
  onConvert,
  onDuplicate,
  onDelete,
  convertedProjectId,
  linkedProjectId,
  linkedProjectName,
  sentAt,
  updatedAt,
  userId,
  autoSaveStatus,
  onRetryAutoSave,
}: Props) {
  const status = normalizeEstimationStatus(draft.status);
  const clientLine = formatEstimationClientLine(draft);

  return (
    <article
      id="estimation-detail-header"
      className="rounded-2xl mb-4 shadow-xl shadow-emerald-900/20 border border-emerald-700/25 overflow-hidden"
    >
      <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 px-4 pt-4 pb-3 text-white rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)] pointer-events-none" />

        <div className="relative flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-[11px] font-bold text-emerald-100/90 tracking-wide">{draft.code}</span>
              {isNew ? (
                <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white backdrop-blur-sm">
                  WA
                </span>
              ) : (
                <StatusBadgeDropdown
                  status={draft.status}
                  onTransition={onStatusTransition}
                  disabled={statusChanging || isReadOnly}
                  variant="onDark"
                />
              )}
            </div>
            <input
              value={draft.title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="Judul estimasi *"
              disabled={isReadOnly}
              className="w-full text-xl sm:text-2xl font-black bg-transparent border-0 border-b border-transparent hover:border-white/30 focus:border-white outline-none py-0.5 placeholder:text-emerald-100/60 disabled:opacity-70 text-white"
            />
            <button
              type="button"
              id="estimation-client-tab"
              onClick={onToggleDetail}
              className={`mt-1.5 w-full text-left flex items-center gap-1.5 text-sm transition-colors duration-200 rounded-lg px-1 py-1 -mx-1 ${
                detailOpen ? 'text-white bg-white/20' : 'text-emerald-100/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">{clientLine || 'Belum ada klien — tap untuk isi'}</span>
            </button>
          </div>
          {!isNew && (
            <EstimatorActionsMenu
              status={draft.status}
              convertedProjectId={convertedProjectId}
              onConvert={onConvert}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          )}
        </div>

        <div className="relative">
          <EstimationDetailSummaryMetrics summary={summary} variant="onDark" />
          <EstimationDetailMetaRow
            status={status}
            sentAt={sentAt}
            updatedAt={updatedAt}
            itemCount={countedItemCount}
            linkedProjectName={linkedProjectName}
            variant="onDark"
          />
        </div>

        <div className="relative mt-3 pt-3 border-t border-white/15 space-y-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={onToggleDetail}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 ${
                detailOpen ? 'bg-white/25 text-white' : 'text-emerald-100/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Klien
            </button>
            {!isNew && userId && !linkedProjectId && !isReadOnly && (
              <EstimationProjectLinkCoachmark userId={userId} />
            )}
            {!isNew && autoSaveStatus && onRetryAutoSave && (
              <div className="ml-auto shrink-0">
                <AutoSaveIndicator
                  status={autoSaveStatus}
                  onRetry={onRetryAutoSave}
                  variant="light"
                />
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex justify-stretch sm:justify-end">
              <button
                type="button"
                onClick={onAddItem}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg shadow-emerald-950/25 transition-all duration-200 active:scale-95"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Tambah Rincian
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
