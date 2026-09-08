import { ClipboardList, Plus, User } from 'lucide-react';
import EstimatorActionsMenu from '../EstimatorActionsMenu';
import AutoSaveIndicator from '../AutoSaveIndicator';
import StatusBadgeDropdown from '../StatusBadgeDropdown';
import EstimationStatusPill from '../list/EstimationStatusPill';
import EstimationDetailSummaryMetrics from './EstimationDetailSummaryMetrics';
import EstimationDetailMetaRow from './EstimationDetailMetaRow';
import EstimationDetailBreakdown from './EstimationDetailBreakdown';
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
  summaryExpanded: boolean;
  onToggleDetail: () => void;
  onToggleSummary: () => void;
  onTitleChange: (title: string) => void;
  onStatusTransition: (next: EstimationStatus) => void;
  onAddItem: () => void;
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  convertedProjectId: string | null;
  linkedProjectName?: string;
  sentAt?: string | null;
  updatedAt?: string | null;
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
  summaryExpanded,
  onToggleDetail,
  onToggleSummary,
  onTitleChange,
  onStatusTransition,
  onAddItem,
  onConvert,
  onDuplicate,
  onDelete,
  convertedProjectId,
  linkedProjectName,
  sentAt,
  updatedAt,
  autoSaveStatus,
  onRetryAutoSave,
}: Props) {
  const status = normalizeEstimationStatus(draft.status);
  const clientLine = formatEstimationClientLine(draft);

  return (
    <article
      id="estimation-detail-header"
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 mb-4 p-4 sm:p-5"
    >
      {/* Row 1: kode + status + menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
            {draft.code}
          </span>
          {isNew ? (
            <EstimationStatusPill status="wa" compact />
          ) : (
            <StatusBadgeDropdown
              status={draft.status}
              onTransition={onStatusTransition}
              disabled={statusChanging || isReadOnly}
              variant="default"
            />
          )}
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

      {/* Row 2: judul + klien */}
      <div className="mb-1">
        <input
          value={draft.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Judul estimasi *"
          disabled={isReadOnly}
          className="w-full text-xl sm:text-2xl font-black text-slate-900 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-emerald-400 outline-none py-0.5 placeholder:text-slate-400 disabled:opacity-70"
        />
        <button
          type="button"
          onClick={onToggleDetail}
          className={`mt-1.5 w-full text-left flex items-center gap-1.5 text-sm transition-colors duration-200 rounded-lg px-1 py-1 -mx-1 ${
            detailOpen ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">{clientLine || 'Belum ada klien — tap untuk isi'}</span>
        </button>
      </div>

      {/* Row 3: metrics */}
      <EstimationDetailSummaryMetrics summary={summary} />

      {/* Row 4: meta chips */}
      <EstimationDetailMetaRow
        status={status}
        sentAt={sentAt}
        updatedAt={updatedAt}
        itemCount={countedItemCount}
        marginPct={summary.avgMarginPct}
        linkedProjectName={linkedProjectName}
      />

      {/* Row 5: tabs + actions */}
      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={onToggleDetail}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 ${
              detailOpen
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Klien
          </button>
          <button
            type="button"
            onClick={onToggleSummary}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 shrink-0 ${
              summaryExpanded
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Ringkasan
          </button>
          {!isNew && autoSaveStatus && onRetryAutoSave && (
            <div className="ml-auto shrink-0">
              <AutoSaveIndicator
                status={autoSaveStatus}
                onRetry={onRetryAutoSave}
                variant="default"
              />
            </div>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex justify-stretch sm:justify-end">
            <button
              type="button"
              onClick={onAddItem}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Tambah Rincian
            </button>
          </div>
        )}
      </div>

      {/* Inline breakdown accordion */}
      <EstimationDetailBreakdown
        draft={draft}
        summary={summary}
        expanded={summaryExpanded}
      />
    </article>
  );
}
