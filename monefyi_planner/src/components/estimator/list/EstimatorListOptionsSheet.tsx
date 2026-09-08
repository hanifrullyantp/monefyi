import {
  AlignJustify, Columns3, List, RefreshCw, Settings,
} from 'lucide-react';
import BottomSheet from '../../ui/BottomSheet';
import {
  ESTIMATION_LIST_VIEW_OPTIONS,
  type EstimationListViewMode,
} from '../../../lib/estimationListView';
import type { EstimationGroupMode } from '../../../lib/estimationListGrouping';
import type { EstimationStatus } from '../../../types/estimator';

type SortKey = 'newest' | 'oldest' | 'value_desc' | 'value_asc' | 'profit_desc' | 'status';

type Props = {
  open: boolean;
  onClose: () => void;
  listViewMode: EstimationListViewMode;
  onListViewChange: (mode: EstimationListViewMode) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  groupMode: EstimationGroupMode;
  onGroupChange: (mode: EstimationGroupMode) => void;
  statusFilter: '' | EstimationStatus;
  onStatusFilterChange: (status: '' | EstimationStatus) => void;
  statusFilters: Array<{ value: '' | EstimationStatus; label: string; count: number }>;
  sortOptions: Array<{ value: SortKey; label: string }>;
  groupOptions: Array<{ value: EstimationGroupMode; label: string }>;
  onRefresh: () => void;
  onOpenPricelist: () => void;
  onOpenSettings: () => void;
};

const viewIcons: Record<EstimationListViewMode, typeof AlignJustify> = {
  standard: AlignJustify,
  kanban: Columns3,
};

export default function EstimatorListOptionsSheet({
  open,
  onClose,
  listViewMode,
  onListViewChange,
  sortKey,
  onSortChange,
  groupMode,
  onGroupChange,
  statusFilter,
  onStatusFilterChange,
  statusFilters,
  sortOptions,
  groupOptions,
  onRefresh,
  onOpenPricelist,
  onOpenSettings,
}: Props) {
  const pickStatus = (value: '' | EstimationStatus) => {
    onStatusFilterChange(value);
    onClose();
  };

  const pickSort = (value: SortKey) => {
    onSortChange(value);
    onClose();
  };

  const pickGroup = (value: EstimationGroupMode) => {
    onGroupChange(value);
    onClose();
  };

  const pickView = (value: EstimationListViewMode) => {
    onListViewChange(value);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Opsi tampilan" height="auto">
      <div className="px-4 pb-6 space-y-5">
        <section>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Tampilan</p>
          <div className="space-y-1">
            {ESTIMATION_LIST_VIEW_OPTIONS.map(option => {
              const Icon = viewIcons[option.value];
              const active = listViewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pickView(option.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] ${
                    active ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Urutkan</p>
          <div className="space-y-1">
            {sortOptions.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => pickSort(o.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] ${
                  sortKey === o.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Kelompokkan</p>
          <div className="space-y-1">
            {groupOptions.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => pickGroup(g.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] ${
                  groupMode === g.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Filter status</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {statusFilters.map(f => (
              <button
                key={f.value || 'all'}
                type="button"
                onClick={() => pickStatus(f.value)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 active:scale-[0.98] ${
                  statusFilter === f.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-slate-400 tabular-nums text-xs">{f.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="pt-2 border-t border-slate-100 space-y-1">
          <button
            type="button"
            onClick={() => { onRefresh(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh data
          </button>
          <button
            type="button"
            onClick={() => { onOpenPricelist(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200"
          >
            <List className="w-4 h-4" />
            Pricelist
          </button>
          <button
            type="button"
            onClick={() => { onOpenSettings(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all duration-200"
          >
            <Settings className="w-4 h-4" />
            Pengaturan Estimator
          </button>
        </section>
      </div>
    </BottomSheet>
  );
}
