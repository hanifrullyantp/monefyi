import type { ReactNode } from 'react';
import { FileText, Hammer, MessageCircle } from 'lucide-react';
import {
  PIPELINE_GROUP_META,
  PIPELINE_GROUP_ORDER,
  type PipelineSummaryBucket,
} from '../../lib/estimationStatus';
import type { Estimation } from '../../types/estimator';

export type PipelineTabId = 'all' | PipelineSummaryBucket | 'archive';

const TAB_ICONS = {
  wa: MessageCircle,
  survei: FileText,
  closing: Hammer,
} as const;

type Props = {
  groups: Array<{ bucket: PipelineSummaryBucket; rows: Estimation[] }>;
  archiveRows: Estimation[];
  archiveCount: number;
  activeTab: PipelineTabId;
  onTabChange: (tab: PipelineTabId) => void;
  renderItem: (est: Estimation) => ReactNode;
  listSpacingClass?: string;
};

export default function EstimationPipelineTabs({
  groups,
  archiveRows,
  archiveCount,
  activeTab,
  onTabChange,
  renderItem,
  listSpacingClass = 'space-y-3',
}: Props) {
  const totalActive = groups.reduce((sum, g) => sum + g.rows.length, 0);

  const tabs: Array<{ id: PipelineTabId; label: string; count: number; icon?: typeof MessageCircle }> = [
    { id: 'all', label: 'Semua', count: totalActive },
    ...PIPELINE_GROUP_ORDER.map(bucket => ({
      id: bucket as PipelineTabId,
      label: PIPELINE_GROUP_META[bucket].title,
      count: groups.find(g => g.bucket === bucket)?.rows.length ?? 0,
      icon: TAB_ICONS[bucket],
    })),
  ];

  if (archiveCount > 0) {
    tabs.push({ id: 'archive', label: 'Arsip', count: archiveCount });
  }

  const visibleRows: Estimation[] = (() => {
    if (activeTab === 'archive') return archiveRows;
    if (activeTab === 'all') {
      return PIPELINE_GROUP_ORDER.flatMap(bucket => groups.find(g => g.bucket === bucket)?.rows ?? []);
    }
    return groups.find(g => g.bucket === activeTab)?.rows ?? [];
  })();

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const meta = tab.id !== 'all' && tab.id !== 'archive'
            ? PIPELINE_GROUP_META[tab.id as PipelineSummaryBucket]
            : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                isActive
                  ? meta
                    ? `${meta.sectionClass} ${meta.headerClass} border-current/20 shadow-sm`
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? meta?.iconClass : 'text-slate-400'}`} />}
              <span>{tab.label}</span>
              <span
                className={`tabular-nums text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/60 text-inherit' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {visibleRows.length === 0 ? (
        <div className="text-center py-12 px-4 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          Tidak ada estimasi di tab ini.
        </div>
      ) : (
        <div className={listSpacingClass}>
          {visibleRows.map(est => (
            <div key={est.id}>{renderItem(est)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
