import type { ReactNode } from 'react';
import {
  PIPELINE_GROUP_META,
  PIPELINE_GROUP_ORDER,
  type PipelineSummaryBucket,
} from '../../../lib/estimationStatus';
import type { Estimation } from '../../../types/estimator';
import type { PipelineTabId } from '../EstimationPipelineTabs';

type Props = {
  groups: Array<{ bucket: PipelineSummaryBucket; rows: Estimation[] }>;
  archiveCount: number;
  activeTab: PipelineTabId;
  onTabChange: (tab: PipelineTabId) => void;
  renderItem: (est: Estimation) => ReactNode;
  archiveRows: Estimation[];
};

type TabDef = {
  id: PipelineTabId;
  label: string;
  count: number;
};

function PipelineTabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <span>{tab.label}</span>
      <span
        className={`tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {tab.count}
      </span>
    </button>
  );
}

export default function EstimatorPipelineSegmentedTabs({
  groups,
  archiveCount,
  activeTab,
  onTabChange,
  renderItem,
  archiveRows,
}: Props) {
  const totalActive = groups.reduce((sum, g) => sum + g.rows.length, 0);

  const tabs: TabDef[] = [
    { id: 'all', label: 'Semua', count: totalActive },
    ...PIPELINE_GROUP_ORDER.map(bucket => ({
      id: bucket as PipelineTabId,
      label: PIPELINE_GROUP_META[bucket].title,
      count: groups.find(g => g.bucket === bucket)?.rows.length ?? 0,
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
      <div className="flex gap-2 px-4 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <PipelineTabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>

      {visibleRows.length === 0 ? (
        <div className="mx-4 text-center py-12 px-4 text-sm text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          Tidak ada estimasi di tab ini.
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {visibleRows.map(est => (
            <div key={est.id}>{renderItem(est)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
