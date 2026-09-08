import { Plus } from 'lucide-react';
import EstimatorActionsMenu from '../EstimatorActionsMenu';
import AutoSaveIndicator from '../AutoSaveIndicator';
import StatusBadgeDropdown from '../StatusBadgeDropdown';
import EstimationDetailSummaryMetrics from './EstimationDetailSummaryMetrics';
import EstimationDetailMetaRow from './EstimationDetailMetaRow';
import EstimationProjectLinkCoachmark from './EstimationProjectLinkCoachmark';
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
  onTitleChange: (title: string) => void;
  onClientNameChange: (name: string) => void;
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
  onTitleChange,
  onClientNameChange,
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

  return (
    <article
      id="estimation-detail-header"
      className="rounded-2xl shadow-xl shadow-emerald-900/20 border border-emerald-700/25 overflow-hidden"
    >
      <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 px-4 pt-4 pb-3 text-white rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)] pointer-events-none" />

        <div className="relative flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {isNew ? (
                <span className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white backdrop-blur-sm">
                  Draft baru
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
              placeholder="Nama proyek *"
              disabled={isReadOnly}
              className="w-full text-xl font-black bg-transparent border-0 border-b border-transparent hover:border-white/30 focus:border-white outline-none py-0.5 placeholder:text-white/50 disabled:opacity-70 text-white caret-white [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(16,185,129)] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            />
            <input
              value={draft.customer_name}
              onChange={e => onClientNameChange(e.target.value)}
              placeholder="Nama klien"
              disabled={isReadOnly}
              className="mt-1.5 w-full text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-white/30 focus:border-white/70 outline-none py-0.5 placeholder:text-white/45 disabled:opacity-70 text-white/95 caret-white [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(16,185,129)] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isNew && userId && !linkedProjectId && !isReadOnly && (
              <EstimationProjectLinkCoachmark userId={userId} />
            )}
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

        <div className="relative mt-3 pt-3 border-t border-white/15">
          {!isNew && autoSaveStatus && onRetryAutoSave && (
            <div className="mb-2 flex justify-end">
              <AutoSaveIndicator
                status={autoSaveStatus}
                onRetry={onRetryAutoSave}
                variant="light"
              />
            </div>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={onAddItem}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg shadow-emerald-950/25 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Tambah Rincian
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
