import { ClipboardCheck, Handshake, MessageCircle, type LucideIcon } from 'lucide-react';
import { ESTIMATION_STATUS_DOT, ESTIMATION_STATUS_LABEL } from '../../lib/estimatorFormat';
import type { PipelineSummaryBucket } from '../../lib/estimationStatus';

const SUMMARY_ITEMS: Array<{
  bucket: PipelineSummaryBucket;
  icon: LucideIcon;
  cardBg: string;
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  activeRing: string;
}> = [
  {
    bucket: 'wa',
    icon: MessageCircle,
    cardBg: 'bg-emerald-50/80',
    cardBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    activeRing: 'ring-emerald-400',
  },
  {
    bucket: 'survei',
    icon: ClipboardCheck,
    cardBg: 'bg-sky-50/80',
    cardBorder: 'border-sky-200',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    activeRing: 'ring-sky-400',
  },
  {
    bucket: 'closing',
    icon: Handshake,
    cardBg: 'bg-amber-50/80',
    cardBorder: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    activeRing: 'ring-amber-400',
  },
];

interface Props {
  counts: Record<PipelineSummaryBucket, number>;
  activePipelineFilter: '' | PipelineSummaryBucket;
  onSelect: (bucket: PipelineSummaryBucket | '') => void;
}

export default function EstimationPipelineSummary({
  counts,
  activePipelineFilter,
  onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
      {SUMMARY_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = activePipelineFilter === item.bucket;
        const count = counts[item.bucket];

        return (
          <button
            key={item.bucket}
            type="button"
            onClick={() => onSelect(isActive ? '' : item.bucket)}
            className={`text-left rounded-2xl border p-3 sm:p-3.5 transition-all ${item.cardBg} ${item.cardBorder} ${
              isActive ? `ring-2 ${item.activeRing} shadow-sm` : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">
                {ESTIMATION_STATUS_LABEL[item.bucket]}
              </span>
            </div>
            <div className="flex items-end justify-between gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums leading-none">
                {count}
              </span>
              <span className={`w-2 h-2 rounded-full shrink-0 mb-1 ${ESTIMATION_STATUS_DOT[item.bucket]}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
