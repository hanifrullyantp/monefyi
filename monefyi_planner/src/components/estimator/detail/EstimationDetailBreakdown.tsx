import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  expanded: boolean;
  className?: string;
};

/** Breakdown customer-facing — tanpa profit/margin. */
export default function EstimationDetailBreakdown({
  draft,
  summary,
  expanded,
  className = '',
}: Props) {
  if (!expanded) return null;

  return (
    <div
      id="estimation-detail-breakdown"
      className={`max-h-[40vh] overflow-y-auto p-4 space-y-2 text-sm bg-white border border-slate-200 rounded-t-2xl shadow-lg ${className}`}
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Rincian total</p>
      <Row label="Subtotal item" value={formatRupiahFull(summary.subtotalSellingItems)} />
      {summary.itemDiscountTotal > 0 && (
        <Row label="Diskon per item" value={`−${formatRupiahFull(summary.itemDiscountTotal)}`} negative />
      )}
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
      <div className="border-t border-slate-200 pt-2">
        <Row label="Total penawaran" value={formatRupiahFull(summary.grandTotal)} bold />
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
