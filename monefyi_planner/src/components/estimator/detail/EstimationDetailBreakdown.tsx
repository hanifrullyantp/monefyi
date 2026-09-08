import { AlertTriangle } from 'lucide-react';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  expanded: boolean;
};

export default function EstimationDetailBreakdown({ draft, summary, expanded }: Props) {
  if (!expanded) return null;

  const profitNegative = summary.totalProfit < 0;

  return (
    <div
      id="estimation-detail-breakdown"
      className="mt-3 pt-3 border-t border-slate-100 max-h-[40vh] overflow-y-auto"
    >
      <div
        className={`p-3 rounded-xl border mb-3 ${
          profitNegative ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'
        }`}
      >
        <div
          className={`text-xs font-medium flex items-center gap-1 ${
            profitNegative ? 'text-red-700' : 'text-emerald-700'
          }`}
        >
          {profitNegative && <AlertTriangle className="w-3.5 h-3.5" />}
          Profit estimasi
        </div>
        <div
          className={`text-lg font-bold tabular-nums ${
            profitNegative ? 'text-red-800' : 'text-emerald-800'
          }`}
        >
          {formatRupiahFull(summary.totalProfit)}
        </div>
        <p className={`text-[10px] mt-1 ${profitNegative ? 'text-red-600/80' : 'text-emerald-600/80'}`}>
          Margin rata-rata: {summary.avgMarginPct.toFixed(1)}%
        </p>
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Breakdown</p>
      <div className="space-y-2 text-sm">
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
          <Row
            label={`Diskon total (${draft.discount_pct}%)`}
            value={`−${formatRupiahFull(summary.discountAmountPct)}`}
            negative
          />
        )}
        {draft.discount_amount > 0 && (
          <Row
            label="Diskon total (nominal)"
            value={`−${formatRupiahFull(summary.discountAmountFixed)}`}
            negative
          />
        )}
        {draft.adjustments.filter(a => a.label.trim() && a.amount > 0).map(adj => (
          <Row key={adj.id} label={adj.label.trim()} value={`−${formatRupiahFull(adj.amount)}`} negative />
        ))}
        {draft.tax_pct > 0 && (
          <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(summary.taxAmount)} />
        )}
      </div>
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
