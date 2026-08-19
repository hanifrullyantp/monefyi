import { useMemo, useState } from 'react';
import { ChevronUp, AlertTriangle } from 'lucide-react';
import { calcEstimationSummary, countedEstimationItems } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';

interface Props {
  draft: EstimationFormDraft;
  expanded: boolean;
  onToggleExpanded: () => void;
  navSidebarCollapsed: boolean;
}

export default function EstimationStickySummary({
  draft,
  expanded,
  onToggleExpanded,
  navSidebarCollapsed,
}: Props) {
  const countedItems = useMemo(() => countedEstimationItems(draft.items), [draft.items]);
  const summary = useMemo(
    () => calcEstimationSummary(
      countedItems,
      draft.overhead_pct,
      draft.discount_pct,
      draft.tax_pct,
      { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
    ),
    [countedItems, draft.overhead_pct, draft.discount_pct, draft.tax_pct, draft.discount_amount, draft.adjustments],
  );

  const profitNegative = summary.totalProfit < 0;

  return (
    <div
      className={`fixed left-0 right-0 z-30 bottom-[4.75rem] lg:bottom-0 safe-bottom ${
        navSidebarCollapsed ? 'lg:left-[4.5rem]' : 'lg:left-64'
      }`}
    >
      {expanded && (
        <div className="mx-3 sm:mx-4 mb-2 max-w-[100rem] sm:ml-auto sm:mr-auto bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[45vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Breakdown</p>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <Row label="Subtotal HPP" value={formatRupiahFull(summary.subtotalHpp)} />
            {summary.itemDiscountTotal > 0 && (
              <Row label="Diskon per item" value={`−${formatRupiahFull(summary.itemDiscountTotal)}`} negative />
            )}
            <Row label="Subtotal jual item" value={formatRupiahFull(summary.subtotalSellingItems)} />
            {draft.overhead_pct > 0 && (
              <Row
                label={`Overhead (${draft.overhead_pct}%)`}
                value={`+${formatRupiahFull(summary.overheadAmount)}`}
                accent
              />
            )}
            <div className="border-t border-dashed border-slate-200 pt-2">
              <Row label="Subtotal penawaran" value={formatRupiahFull(summary.subtotalBeforeDiscount)} bold />
            </div>
            {draft.discount_pct > 0 && (
              <Row label={`Diskon total (${draft.discount_pct}%)`} value={`−${formatRupiahFull(summary.discountAmountPct)}`} negative />
            )}
            {draft.discount_amount > 0 && (
              <Row label="Diskon total (nominal)" value={`−${formatRupiahFull(summary.discountAmountFixed)}`} negative />
            )}
            {draft.adjustments.filter(a => a.label.trim() && a.amount > 0).map(adj => (
              <Row key={adj.id} label={adj.label.trim()} value={`−${formatRupiahFull(adj.amount)}`} negative />
            ))}
            {draft.tax_pct > 0 && (
              <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(summary.taxAmount)} />
            )}
            <Row label="Margin rata-rata" value={`${summary.avgMarginPct.toFixed(1)}%`} bold />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white shadow-[0_-4px_24px_rgba(5,150,105,0.35)] border-t border-emerald-500/30"
        aria-expanded={expanded}
      >
        <div className="max-w-[100rem] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90">
              Total penawaran
            </div>
            <div className="text-xl sm:text-2xl font-black tabular-nums leading-tight truncate">
              {formatRupiahFull(summary.grandTotal)}
            </div>
          </div>
          <div className="shrink-0 text-right border-l border-white/20 pl-3">
            <div className={`text-[10px] font-semibold uppercase tracking-wide flex items-center justify-end gap-1 ${
              profitNegative ? 'text-red-200' : 'text-emerald-100/90'
            }`}>
              {profitNegative && <AlertTriangle className="w-3 h-3" />}
              Profit
            </div>
            <div className={`text-base sm:text-lg font-bold tabular-nums ${
              profitNegative ? 'text-red-100' : 'text-white'
            }`}>
              {formatRupiahFull(summary.totalProfit)}
            </div>
          </div>
          <ChevronUp
            className={`w-5 h-5 shrink-0 text-emerald-100 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
  accent,
  bold,
}: {
  label: string;
  value: string;
  negative?: boolean;
  accent?: boolean;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
      <span className="truncate">{label}</span>
      <span className={`tabular-nums shrink-0 ${negative ? 'text-red-600' : accent ? 'text-amber-700' : ''}`}>
        {value}
      </span>
    </div>
  );
}
