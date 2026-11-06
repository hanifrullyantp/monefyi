import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export type ListCardMetric = {
  label: string;
  value: string | number;
  valueColor?: string;
};

type Props = {
  id?: string;
  indicatorColor?: string;
  title: string;
  subtitle?: string;
  pill?: ReactNode;
  valueText?: string;
  progressText?: string;
  onClick?: () => void;

  // Expandable details
  expandable?: boolean;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (open: boolean) => void;
  metrics?: ListCardMetric[];
  progressPercent?: number;
  progressBarColor?: string;
  progressLabel?: string;
  progressDetailText?: string;
  alertNote?: string;
  actions?: ReactNode;
  customExpandedContent?: ReactNode;
};

export default function ListCard({
  indicatorColor = '#10B981',
  title,
  subtitle,
  pill,
  valueText,
  progressText,
  onClick,
  expandable = true,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onToggleExpand,
  metrics,
  progressPercent,
  progressBarColor = '#059669',
  progressLabel = 'Budget terpakai',
  progressDetailText,
  alertNote,
  actions,
  customExpandedContent,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isExpanded;
    setInternalExpanded(next);
    onToggleExpand?.(next);
  };

  return (
    <div className="bg-white border border-[#E5EAE8] rounded-[14px] overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
      {/* Compact Main Row */}
      <div
        onClick={onClick}
        className={`flex items-stretch cursor-pointer select-none ${
          onClick ? 'active:bg-slate-50' : ''
        }`}
      >
        {/* Left colored accent strip */}
        <div
          className="w-[5px] shrink-0"
          style={{ backgroundColor: indicatorColor }}
          aria-hidden="true"
        />

        {/* Info Column */}
        <div className="flex-1 min-w-0 py-3 pl-3 pr-1 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[15px] font-bold text-[#0F172A] truncate">
              {title}
            </span>
            {pill && <div className="shrink-0">{pill}</div>}
          </div>
          {subtitle && (
            <div className="text-xs text-[#5B6B7A] truncate">
              {subtitle}
            </div>
          )}
        </div>

        {/* Value & Progress */}
        <div className="flex flex-col justify-center items-end px-1 shrink-0">
          {valueText && (
            <div className="text-[15px] font-extrabold text-[#0F172A] tabular-nums truncate">
              {valueText}
            </div>
          )}
          {progressText && (
            <div className="text-[11px] font-bold text-[#5B6B7A] tabular-nums">
              {progressText}
            </div>
          )}
        </div>

        {/* Chevron Expand Button */}
        {expandable && (
          <button
            type="button"
            onClick={toggleExpand}
            aria-label={isExpanded ? 'Tutup detail' : 'Tampilkan detail'}
            aria-expanded={isExpanded}
            className="w-12 border-0 bg-transparent flex items-center justify-center p-0 text-slate-600 active:scale-95 transition-transform shrink-0"
          >
            <span
              className={`w-[30px] height-[30px] rounded-full bg-[#F1F5F4] flex items-center justify-center transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown className="w-[18px] h-[18px]" />
            </span>
          </button>
        )}
      </div>

      {/* Expanded Accordion Body */}
      {expandable && isExpanded && (
        <div className="border-t border-[#E5EAE8] p-3 sm:p-3.5 bg-[#FAFCFB] flex flex-col gap-3">
          {customExpandedContent ? (
            customExpandedContent
          ) : (
            <>
              {/* 3-column metrics */}
              {metrics && metrics.length > 0 && (
                <div
                  className="grid gap-2 text-left"
                  style={{
                    gridTemplateColumns: `repeat(${metrics.length}, minmax(0, 1fr))`,
                  }}
                >
                  {metrics.map((m, idx) => (
                    <div key={idx} className="min-w-0">
                      <div className="text-[10px] font-bold text-[#5B6B7A] tracking-[0.04em] uppercase truncate">
                        {m.label}
                      </div>
                      <div
                        className="text-sm sm:text-base font-extrabold mt-0.5 truncate"
                        style={{ color: m.valueColor || '#0F172A' }}
                      >
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress bar */}
              {progressPercent != null && (
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-[#5B6B7A]">
                    <span>{progressLabel}</span>
                    <span>{progressDetailText || `${Math.round(progressPercent)}%`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#E5EAE8] mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, progressPercent))}%`,
                        backgroundColor: progressBarColor,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Alert note */}
              {alertNote && (
                <div className="text-xs font-semibold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] p-2.5 leading-snug">
                  {alertNote}
                </div>
              )}

              {/* Action buttons */}
              {actions && (
                <div className="flex items-center gap-2 pt-1">{actions}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

