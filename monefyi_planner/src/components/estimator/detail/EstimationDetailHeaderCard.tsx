import { useState } from 'react';
import EstimatorActionsMenu from '../EstimatorActionsMenu';
import AutoSaveIndicator from '../AutoSaveIndicator';
import EstimationProjectLinkCoachmark from './EstimationProjectLinkCoachmark';
import {
  dashboardStatusLabel,
  estimationSourceLabel,
  formatUpdateAgeLabel,
  getDashboardBucket,
} from '../../../lib/estimatorListDashboard';
import { ESTIMATION_STATUS_LABEL, formatRupiahCompact } from '../../../lib/estimatorFormat';
import {
  ESTIMATION_WORKFLOW_STATUSES,
  isStatusReadOnly,
  normalizeEstimationStatus,
} from '../../../lib/estimationStatus';
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
  onConvert: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  convertedProjectId: string | null;
  linkedProjectId: string | null;
  linkedProjectName?: string;
  sentAt?: string | null;
  updatedAt?: string | null;
  waAt?: string | null;
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
  onConvert,
  onDuplicate,
  onDelete,
  convertedProjectId,
  linkedProjectId,
  userId,
  updatedAt,
  waAt,
  autoSaveStatus,
  onRetryAutoSave,
}: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const status = normalizeEstimationStatus(draft.status);
  const bucket = getDashboardBucket(status);
  const statusLabel = isNew ? 'Draft baru' : dashboardStatusLabel(status);
  const source = estimationSourceLabel({ wa_at: waAt ?? null, customer_phone: draft.customer_phone });
  const locked = isReadOnly || isStatusReadOnly(status) || isNew;
  const marginPct = Number.isFinite(summary.avgMarginPct) ? Math.round(summary.avgMarginPct) : null;

  const statusChoices: EstimationStatus[] = [
    ...ESTIMATION_WORKFLOW_STATUSES,
    ...(status === 'rejected' ? [] : (['rejected'] as const)),
  ];

  return (
    <article
      id="estimation-detail-header"
      className="relative overflow-hidden rounded-[20px] text-white"
      style={{
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 48%, #047857 100%)',
        boxShadow: '0 10px 28px rgba(6, 78, 59, 0.22)',
      }}
    >
      <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.08]" />
      <span className="pointer-events-none absolute -left-10 -bottom-12 h-36 w-36 rounded-full bg-white/[0.06]" />

      <div className="relative px-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (!locked && !statusChanging) setStatusOpen(v => !v);
                }}
                disabled={locked || statusChanging}
                aria-expanded={statusOpen}
                aria-label={`Status ${statusLabel}`}
                className={`inline-flex items-center min-h-11 px-3 rounded-full text-xs font-bold ${
                  bucket === 'active'
                    ? 'bg-sky-400/25 text-white'
                    : bucket === 'lead'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/20 text-white'
                } disabled:opacity-70`}
              >
                {statusLabel}
              </button>
              <span className="text-[11px] font-medium text-[#D1FAE5]">Sumber: {source}</span>
            </div>
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
                variant="onDark"
              />
            )}
          </div>
        </div>

        {statusOpen && !locked && (
          <div className="mt-3 flex flex-wrap gap-2">
            {statusChoices.map(choice => {
              const active = status === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={statusChanging}
                  onClick={() => {
                    setStatusOpen(false);
                    if (!active) onStatusTransition(choice);
                  }}
                  className={`inline-flex items-center min-h-11 px-3 rounded-full text-xs font-bold ${
                    active ? 'bg-white text-emerald-800' : 'bg-white/15 text-white'
                  }`}
                >
                  {ESTIMATION_STATUS_LABEL[choice] || choice}
                </button>
              );
            })}
          </div>
        )}

        <input
          value={draft.title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Nama proyek"
          disabled={isReadOnly}
          aria-label="Nama proyek"
          className="on-dark-field mt-4 w-full text-2xl font-black bg-transparent border-0 outline-none py-0.5 disabled:opacity-70"
        />
        <input
          value={draft.customer_name}
          onChange={e => onClientNameChange(e.target.value)}
          placeholder="Nama klien"
          disabled={isReadOnly}
          aria-label="Nama klien"
          className="on-dark-field on-dark-field-muted mt-1 w-full text-sm font-medium bg-transparent border-0 outline-none py-0.5 disabled:opacity-70"
        />

        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#D1FAE5]">Nilai proyek</p>
            <p className="mt-1 text-xl font-black tabular-nums">{formatRupiahCompact(summary.grandTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#D1FAE5]">Est. profit</p>
            <p className="mt-1 text-xl font-black tabular-nums">
              {formatRupiahCompact(summary.totalProfit)}
              {marginPct != null && (
                <span className="ml-1.5 text-sm font-semibold text-[#D1FAE5]">{marginPct}%</span>
              )}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs font-medium text-[#D1FAE5]">
          {countedItemCount} item · {formatUpdateAgeLabel(updatedAt)}
        </p>

        {!isNew && autoSaveStatus && onRetryAutoSave && (
          <div className="mt-2 flex justify-end">
            <AutoSaveIndicator
              status={autoSaveStatus}
              onRetry={onRetryAutoSave}
              variant="light"
            />
          </div>
        )}
      </div>
    </article>
  );
}
