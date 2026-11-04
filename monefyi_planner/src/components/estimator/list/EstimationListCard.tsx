import { type KeyboardEvent, type MouseEvent } from 'react';
import { ChevronDown, Copy, Receipt, Rocket, Trash2 } from 'lucide-react';
import {
  dashboardPillForRow,
  estimationMarginPct,
  estimationSourceLabel,
  formatUpdateAgeLabel,
  recencyToneForEstimation,
  type DashboardPill,
} from '../../../lib/estimatorListDashboard';
import { ESTIMATION_STATUS_LABEL, formatRupiahCompact } from '../../../lib/estimatorFormat';
import { normalizeEstimationStatus } from '../../../lib/estimationStatus';
import type { Estimation } from '../../../types/estimator';

type Props = {
  estimation: Estimation;
  newestId?: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  onShareWhatsApp?: () => void;
  onChangeStatus?: () => void;
  onArchive?: () => void;
  onKwitansi?: () => void;
  waLoading?: boolean;
  kwitansiLoading?: boolean;
  statusBusy?: boolean;
  archiveBusy?: boolean;
  archiveDisabled?: boolean;
  statusDisabled?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

const PILL_CLASS: Record<Exclude<DashboardPill, null>, string> = {
  terbaru: 'bg-emerald-50 text-emerald-700',
  active: 'bg-sky-50 text-sky-700',
  lead: 'bg-slate-100 text-slate-600',
};

const PILL_LABEL: Record<Exclude<DashboardPill, null>, string> = {
  terbaru: 'Terbaru',
  active: 'Active',
  lead: 'Lead',
};

const TONE_BAR: Record<string, string> = {
  fresh: 'bg-emerald-500',
  aging: 'bg-amber-400',
  stale: 'bg-rose-500',
};

const TONE_TEXT: Record<string, string> = {
  fresh: 'text-emerald-700',
  aging: 'text-amber-700',
  stale: 'text-rose-600',
};

function stop(e: MouseEvent) {
  e.stopPropagation();
}

function cardKeyDown(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onOpen();
  }
}

export default function EstimationListCard({
  estimation: est,
  newestId = null,
  expanded,
  onToggleExpand,
  onOpen,
  onDuplicate,
  onDelete,
  onConvert,
  onShareWhatsApp,
  onChangeStatus,
  onArchive,
  onKwitansi,
  waLoading = false,
  kwitansiLoading = false,
  statusBusy = false,
  archiveBusy = false,
  archiveDisabled = false,
  statusDisabled = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const status = normalizeEstimationStatus(est.status);
  const isConverted = status === 'converted';
  const value = Number(est.total_selling_price) || 0;
  const profit = Number(est.total_profit) || 0;
  const margin = estimationMarginPct(value, profit);
  const tone = recencyToneForEstimation(est);
  const pill = dashboardPillForRow(est, newestId);
  const client = est.customer_name?.trim() || 'Tanpa klien';

  const handlePrimaryClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    onOpen();
  };

  return (
    <article
      className={`bg-white rounded-[14px] border overflow-hidden ${
        selectionMode && selected ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-[#E5EAE8]'
      }`}
    >
      <div className="flex items-stretch">
        {selectionMode && (
          <label
            className="shrink-0 flex items-center justify-center min-w-12 px-1"
            onClick={stop}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect?.()}
              disabled={statusDisabled}
              className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
              aria-label={`Pilih ${est.title || est.code}`}
            />
          </label>
        )}
        <div className={`w-1 shrink-0 ${TONE_BAR[tone]}`} aria-hidden />
        <div
          role="button"
          tabIndex={0}
          onClick={handlePrimaryClick}
          onKeyDown={e => cardKeyDown(e, handlePrimaryClick)}
          className="flex-1 min-w-0 min-h-11 px-3 py-3 text-left cursor-pointer"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{est.title || 'Tanpa judul'}</h3>
                {pill && (
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PILL_CLASS[pill]}`}>
                    {PILL_LABEL[pill]}
                  </span>
                )}
              </div>
              <p className={`mt-0.5 text-xs truncate ${TONE_TEXT[tone]}`}>
                {client} · {formatUpdateAgeLabel(est.updated_at)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-900 tabular-nums">{formatRupiahCompact(value)}</p>
              <p className={`text-xs font-semibold tabular-nums ${profit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatRupiahCompact(profit)}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={e => {
            stop(e);
            if (selectionMode) {
              onToggleSelect?.();
              return;
            }
            onToggleExpand();
          }}
          aria-expanded={expanded}
          aria-label={
            selectionMode
              ? (selected ? 'Batalkan pilihan' : 'Pilih estimasi')
              : (expanded ? 'Tutup detail estimasi' : 'Buka detail estimasi')
          }
          className="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 text-slate-400"
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        inert={expanded ? undefined : true}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-[#E5EAE8] ml-1" onClick={stop}>
            <div className="grid grid-cols-3 gap-2 py-3">
              <Metric label="Nilai proyek" value={formatRupiahCompact(value)} />
              <Metric
                label="Est. profit"
                value={formatRupiahCompact(profit)}
                valueClass={profit < 0 ? 'text-rose-600' : 'text-emerald-700'}
              />
              <Metric label="Margin" value={margin == null ? '—' : `${margin}%`} />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <span className="font-mono text-emerald-700">{est.code}</span>
              <span className="text-slate-300">·</span>
              <span>{ESTIMATION_STATUS_LABEL[status] || status}</span>
              <span className="text-slate-300">·</span>
              <span>{estimationSourceLabel(est)}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <ActionBtn
                label="Follow-up WA"
                onClick={onShareWhatsApp}
                disabled={!onShareWhatsApp || waLoading || isConverted}
              />
              <ActionBtn
                label="Ubah status"
                onClick={onChangeStatus}
                disabled={!onChangeStatus || statusBusy || statusDisabled || isConverted}
              />
              <ActionBtn
                label="Arsipkan"
                onClick={onArchive}
                disabled={!onArchive || archiveBusy || archiveDisabled || isConverted}
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-1">
              {onKwitansi && (
                <IconAction
                  label="Kwitansi"
                  icon={Receipt}
                  disabled={kwitansiLoading || isConverted}
                  onClick={onKwitansi}
                />
              )}
              <IconAction label="Duplikat" icon={Copy} onClick={onDuplicate} />
              {!isConverted && onConvert && (
                <IconAction label="Jadikan proyek" icon={Rocket} onClick={onConvert} />
              )}
              <IconAction label="Hapus estimasi" icon={Trash2} danger onClick={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-11 px-1 rounded-full border border-[#E5EAE8] bg-white text-[11px] font-bold text-slate-700 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

function IconAction({
  label,
  icon: Icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: typeof Copy;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-slate-500 hover:bg-slate-50 disabled:opacity-45 ${
        danger ? 'text-rose-600' : ''
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
