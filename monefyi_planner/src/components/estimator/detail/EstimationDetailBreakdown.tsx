import { useMemo } from 'react';
import { effectiveItemSelling } from '../../../lib/estimatorCalc';
import { estimationItemDisplayName } from '../../../lib/estimatorItemDisplayName';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationFormDraft, EstimationSummary } from '../../../types/estimator';

type Props = {
  draft: EstimationFormDraft;
  summary: EstimationSummary;
  expanded: boolean;
  className?: string;
};

/** Breakdown customer-facing — tanpa profit/margin; baris nol disembunyikan. */
export default function EstimationDetailBreakdown({
  draft,
  summary,
  expanded,
  className = '',
}: Props) {
  const clientLines = useMemo(() => {
    const lines: Array<{ key: string; label: string; value: string; muted?: boolean }> = [];
    draft.items.forEach((item, idx) => {
      if (item.included === false || !item.name.trim()) return;
      const label = estimationItemDisplayName(item);
      if (item.is_bonus) {
        lines.push({
          key: `bonus-${idx}`,
          label: `${label} (bonus)`,
          value: 'Gratis',
          muted: true,
        });
        return;
      }
      lines.push({
        key: `item-${idx}`,
        label: label,
        value: formatRupiahFull(effectiveItemSelling(item)),
      });
    });
    return lines;
  }, [draft.items]);

  if (!expanded) return null;

  const hasItemDiscount = summary.itemDiscountTotal > 0;
  const positiveAdjustments = draft.adjustments.filter(a => a.label.trim() && a.amount > 0);

  return (
    <div
      id="estimation-detail-breakdown"
      className={`max-h-[50vh] overflow-y-auto p-4 space-y-2 text-sm bg-white border border-slate-200 rounded-t-2xl shadow-lg ${className}`}
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Rincian total</p>

      {clientLines.length > 0 ? (
        <ul className="space-y-1.5 pb-2 border-b border-dashed border-slate-200">
          {clientLines.map(line => (
            <li key={line.key} className={`flex justify-between gap-2 ${line.muted ? 'text-emerald-700' : 'text-slate-700'}`}>
              <span className="truncate text-[13px]">{line.label}</span>
              <span className="tabular-nums shrink-0 text-[13px] font-semibold">{line.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Row label="Subtotal item" value={formatRupiahFull(summary.subtotalSellingItems)} />
      )}

      {hasItemDiscount && (
        <Row label="Diskon per item" value={`−${formatRupiahFull(summary.itemDiscountTotal)}`} negative />
      )}
      {draft.overhead_pct > 0 && summary.overheadAmount > 0 && (
        <Row
          label={`Overhead (${draft.overhead_pct}%)`}
          value={`+${formatRupiahFull(summary.overheadAmount)}`}
          accent
        />
      )}
      {(clientLines.length > 0 || hasItemDiscount || summary.overheadAmount > 0) && (
        <div className="border-t border-dashed border-slate-200 pt-2">
          <Row label="Subtotal penawaran" value={formatRupiahFull(summary.subtotalBeforeDiscount)} bold />
        </div>
      )}
      {draft.discount_pct > 0 && summary.discountAmountPct > 0 && (
        <Row
          label={`Diskon total (${draft.discount_pct}%)`}
          value={`−${formatRupiahFull(summary.discountAmountPct)}`}
          negative
        />
      )}
      {draft.discount_amount > 0 && summary.discountAmountFixed > 0 && (
        <Row
          label="Diskon total (nominal)"
          value={`−${formatRupiahFull(summary.discountAmountFixed)}`}
          negative
        />
      )}
      {positiveAdjustments.map(adj => (
        <Row key={adj.id} label={adj.label.trim()} value={`−${formatRupiahFull(adj.amount)}`} negative />
      ))}
      {draft.tax_pct > 0 && summary.taxAmount > 0 && (
        <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(summary.taxAmount)} />
      )}
      {summary.billingDiscountAmount > 0 && (
        <Row
          label="Potongan tagihan"
          value={`−${formatRupiahFull(summary.billingDiscountAmount)}`}
          negative
        />
      )}
      {summary.billingBonusNote.trim() && (
        <p className="text-[11px] text-emerald-700 leading-snug">
          Bonus: {summary.billingBonusNote.trim()}
        </p>
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
