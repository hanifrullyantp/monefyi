import type { ReactNode } from 'react';
import { FileText, Hammer, MessageCircle } from 'lucide-react';
import {
  getPipelineSummaryBucket,
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
  renderItem: (est: Estimation) => ReactNode;
};

export default function EstimationPipelineGroupList({
  groups,
  activePipelineFilter,
  onToggleFilter,
  renderItem,
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
                <div key={est.id}>{renderItem(est)}</div>
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
