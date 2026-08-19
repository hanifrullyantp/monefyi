import type { MouseEvent } from 'react';
import { FileText, Hammer, MessageCircle } from 'lucide-react';
import { deriveEstimationProductGroup } from '../../lib/estimationListGrouping';
import {
  daysSinceIso,
  formatDateTimeId,
  formatRupiahCompact,
  formatRupiahFull,
  ESTIMATION_STATUS_LABEL,
} from '../../lib/estimatorFormat';
import {
  estimationProgressPercent,
  getPipelineSummaryBucket,
  normalizeEstimationStatus,
  PIPELINE_GROUP_META,
  PIPELINE_GROUP_ORDER,
  type PipelineSummaryBucket,
} from '../../lib/estimationStatus';
import type { Estimation } from '../../types/estimator';

const SECTION_ICONS = {
  wa: MessageCircle,
  survei: FileText,
  closing: Hammer,
} as const;

type Props = {
  groups: Array<{ bucket: PipelineSummaryBucket; rows: Estimation[] }>;
  activePipelineFilter: '' | PipelineSummaryBucket;
  onToggleFilter: (bucket: PipelineSummaryBucket | '') => void;
  onOpen: (id: string) => void;
  onFollowUp: (id: string) => void;
};

function stopClick(e: MouseEvent) {
  e.stopPropagation();
}

function displayName(est: Estimation): string {
  return est.customer_name?.trim() || est.title.trim() || est.code;
}

function LeadCard({
  est,
  onOpen,
}: {
  est: Estimation;
  onOpen: () => void;
}) {
  const product = deriveEstimationProductGroup(est.title);
  const total = Number(est.total_selling_price) || 0;

  let badge = 'Lead baru';
  if (est.survei_at) {
    badge = `Survei ${formatDateTimeId(est.survei_at)}`;
  } else if (daysSinceIso(est.updated_at) === 0) {
    badge = 'Diperbarui hari ini';
  } else if (daysSinceIso(est.updated_at) > 0) {
    badge = `${daysSinceIso(est.updated_at)} hari lalu`;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-white/80 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow"
    >
      <p className="font-bold text-slate-900 leading-snug">{displayName(est)}</p>
      <p className="text-sm text-slate-500 mt-0.5">
        {product} · Est: {formatRupiahCompact(total)}
      </p>
      <span className="inline-block mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200/80">
        {badge}
      </span>
    </button>
  );
}

function PenawaranCard({
  est,
  onOpen,
  onFollowUp,
}: {
  est: Estimation;
  onOpen: () => void;
  onFollowUp: () => void;
}) {
  const status = normalizeEstimationStatus(est.status);
  const product = deriveEstimationProductGroup(est.title);
  const waitDays = daysSinceIso(est.sent_at || est.survei_at || est.updated_at);
  const title = est.customer_name?.trim()
    ? `${est.customer_name} — ${product !== 'Umum' ? product : est.title}`
    : est.title;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="w-full text-left bg-white rounded-2xl border border-white/80 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 leading-snug line-clamp-2">{title}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {waitDays === 0 ? 'Diperbarui hari ini' : `Menunggu ${waitDays} hari`}
            {status === 'survei' ? ` · ${ESTIMATION_STATUS_LABEL.survei}` : ''}
          </p>
          <p className="text-xs font-semibold text-violet-700 mt-1 tabular-nums">
            {formatRupiahFull(Number(est.total_selling_price))}
          </p>
        </div>
        <button
          type="button"
          onClick={e => {
            stopClick(e);
            onFollowUp();
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 shadow-sm"
        >
          Follow-up
        </button>
      </div>
    </div>
  );
}

function ProyekCard({
  est,
  onOpen,
}: {
  est: Estimation;
  onOpen: () => void;
}) {
  const progress = estimationProgressPercent(est.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-white/80 shadow-sm px-4 py-3.5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-bold text-slate-900 leading-snug truncate">{est.title}</p>
        <span className="text-sm font-black text-emerald-700 tabular-nums shrink-0">{progress}%</span>
      </div>
      <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5">
        {ESTIMATION_STATUS_LABEL[normalizeEstimationStatus(est.status)]}
        {est.customer_name ? ` · ${est.customer_name}` : ''}
      </p>
    </button>
  );
}

function PipelineGroupCard({
  bucket,
  est,
  onOpen,
  onFollowUp,
}: {
  bucket: PipelineSummaryBucket;
  est: Estimation;
  onOpen: () => void;
  onFollowUp: () => void;
}) {
  if (bucket === 'wa') return <LeadCard est={est} onOpen={onOpen} />;
  if (bucket === 'survei') return <PenawaranCard est={est} onOpen={onOpen} onFollowUp={onFollowUp} />;
  return <ProyekCard est={est} onOpen={onOpen} />;
}

export default function EstimationPipelineGroupList({
  groups,
  activePipelineFilter,
  onToggleFilter,
  onOpen,
  onFollowUp,
}: Props) {
  const visibleGroups = activePipelineFilter
    ? groups.filter(g => g.bucket === activePipelineFilter)
    : groups;

  if (visibleGroups.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        Tidak ada estimasi di filter pipeline ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PIPELINE_GROUP_ORDER.map(bucketKey => {
        const group = visibleGroups.find(g => g.bucket === bucketKey);
        if (!group) return null;

        const meta = PIPELINE_GROUP_META[bucketKey];
        const Icon = SECTION_ICONS[bucketKey];
        const isActive = activePipelineFilter === bucketKey;

        return (
          <section
            key={bucketKey}
            className={`rounded-2xl border p-3 sm:p-4 ${meta.sectionClass} ${
              isActive ? 'ring-2 ring-offset-1 ring-slate-300' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onToggleFilter(isActive ? '' : bucketKey)}
              className={`flex items-center gap-2 mb-3 w-full text-left ${meta.headerClass}`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${meta.iconClass}`} />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wide">
                {group.rows.length} {meta.title}
              </span>
            </button>
            <div className="space-y-2.5">
              {group.rows.map(est => (
                <PipelineGroupCard
                  key={est.id}
                  bucket={bucketKey}
                  est={est}
                  onOpen={() => onOpen(est.id)}
                  onFollowUp={() => onFollowUp(est.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function buildPipelineGroups(rows: Estimation[]) {
  const buckets: Record<PipelineSummaryBucket, Estimation[]> = {
    wa: [],
    survei: [],
    closing: [],
  };
  for (const row of rows) {
    const bucket = getPipelineSummaryBucket(row.status);
    if (bucket) buckets[bucket].push(row);
  }
  return PIPELINE_GROUP_ORDER
    .map(bucket => ({ bucket, rows: buckets[bucket] }))
    .filter(g => g.rows.length > 0);
}
