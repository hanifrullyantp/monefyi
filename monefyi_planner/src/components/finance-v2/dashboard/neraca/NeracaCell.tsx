import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CurrencyDisplay from '../shared/CurrencyDisplay';
import EducationTooltip from '../shared/EducationTooltip';
import { zoneStyles, type ColorZone } from '../neracaColors';

export interface NeracaCellProps {
  label: string;
  subLabel?: string;
  value: number;
  navigateTo: string;
  colorZone: ColorZone;
  breakdown?: { label: string; amount: number }[];
  quickActionLabel?: string;
  onQuickAction?: () => void;
  tooltipContent: string;
}

export default function NeracaCell({
  label,
  subLabel,
  value,
  navigateTo,
  colorZone,
  breakdown = [],
  quickActionLabel,
  onQuickAction,
  tooltipContent,
}: NeracaCellProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const styles = zoneStyles(colorZone);
  const isZero = !value || Math.abs(value) < 0.01;
  const hasBreakdown = breakdown.length > 0;

  const handleClick = () => {
    if (hasBreakdown) setExpanded(v => !v);
    else navigate(navigateTo);
  };

  return (
    <div
      className={`min-w-[88px] flex-shrink-0 border border-amber-900/10 transition-colors ${
        isZero ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: styles.cellBg }}
    >
      <div
        className="text-center px-1 py-2 flex flex-col items-center gap-0.5"
        style={{ backgroundColor: styles.colHeader, color: styles.text }}
      >
        <div className="flex items-center gap-0.5 justify-center">
          <span className="text-[10px] font-bold uppercase leading-tight">{label}</span>
          <EducationTooltip content={tooltipContent} label={label} />
        </div>
        {subLabel && <span className="text-[9px] opacity-80 leading-tight">{subLabel}</span>}
      </div>

      <button
        type="button"
        onClick={handleClick}
        title="Klik untuk lihat detail →"
        className="w-full px-2 py-3 text-right hover:brightness-95 transition-all cursor-pointer group"
        style={{ color: styles.text }}
      >
        <div className="text-sm font-semibold tabular-nums text-right">
          {isZero ? (
            <span className="text-slate-400 italic">—</span>
          ) : (
            <CurrencyDisplay value={value} variant="full" negativeRed />
          )}
        </div>
        <div className="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 text-center mt-1">
          {hasBreakdown ? (expanded ? 'Tutup' : 'Detail ▼') : 'Klik ▶'}
        </div>
      </button>

      {expanded && hasBreakdown && (
        <div className="border-t border-amber-900/10 px-2 py-2 text-[10px] space-y-1"
          style={{ color: styles.text }}
        >
          {breakdown.map(item => (
            <div key={item.label} className="flex justify-between gap-1">
              <span className="truncate">{item.label}</span>
              <CurrencyDisplay value={item.amount} variant="short" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => navigate(navigateTo)}
            className="w-full mt-1 text-[10px] font-bold text-indigo-700 hover:underline"
          >
            → Lihat Semua Detail
          </button>
          {quickActionLabel && onQuickAction && (
            <button
              type="button"
              onClick={onQuickAction}
              className="w-full text-[10px] font-bold text-emerald-700 hover:underline"
            >
              {quickActionLabel}
            </button>
          )}
        </div>
      )}

      {expanded && !hasBreakdown && (
        <button
          type="button"
          onClick={() => navigate(navigateTo)}
          className="w-full py-1 text-[10px] font-bold text-indigo-700 flex items-center justify-center gap-1"
        >
          Detail <ChevronDown className="w-3 h-3" />
        </button>
      )}
      {expanded && hasBreakdown && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full py-0.5 flex justify-center text-slate-400"
          aria-label="Tutup"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
