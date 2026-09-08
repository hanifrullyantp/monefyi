import { ChevronUp } from 'lucide-react';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationSummary } from '../../types/estimator';

interface Props {
  summary: EstimationSummary;
  summaryExpanded: boolean;
  onOpenBreakdown: () => void;
  navSidebarCollapsed: boolean;
}

export default function EstimationStickySummary({
  summary,
  summaryExpanded,
  onOpenBreakdown,
  navSidebarCollapsed,
}: Props) {
  const handleClick = () => {
    onOpenBreakdown();
    if (!summaryExpanded) {
      requestAnimationFrame(() => {
        document.getElementById('estimation-detail-breakdown')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    }
  };

  return (
    <div
      className={`fixed left-0 right-0 z-30 bottom-[5.5rem] lg:bottom-0 pointer-events-none ${
        navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64'
      }`}
    >
      <div className="pointer-events-auto px-3 sm:px-4 max-w-[100rem] mx-auto">
        <button
          type="button"
          onClick={handleClick}
          className="w-full bg-white/95 backdrop-blur-lg text-slate-900 rounded-2xl shadow-lg border border-slate-200 transition-all duration-200 active:scale-[0.99]"
          aria-expanded={summaryExpanded}
        >
          <div className="px-4 py-3 flex items-center gap-3 min-w-0">
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Total penawaran
              </div>
              <div className="text-xl sm:text-2xl font-black tabular-nums leading-tight truncate text-emerald-700">
                {formatRupiahFull(summary.grandTotal)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-slate-500 text-xs font-semibold">
              <span>{summaryExpanded ? 'Tutup' : 'Breakdown'}</span>
              <ChevronUp
                className={`w-5 h-5 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
