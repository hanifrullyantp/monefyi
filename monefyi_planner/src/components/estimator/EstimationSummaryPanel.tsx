import { calcEstimationSummary, countedEstimationItems } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';
import { AlertTriangle } from 'lucide-react';

interface Props {
  draft: EstimationFormDraft;
}

export default function EstimationSummaryPanel({ draft }: Props) {
  const namedItems = draft.items.filter(i => i.name.trim());
  const countedItems = countedEstimationItems(draft.items);
  const s = calcEstimationSummary(
    countedItems,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
    { discountAmount: draft.discount_amount, adjustments: draft.adjustments },
  );

  const marginWidth = Math.min(100, Math.max(0, s.avgMarginPct));
  const profitNegative = s.totalProfit < 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-20 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ringkasan</h3>
        {countedItems.length > 0 && (
          <p className="text-[11px] text-slate-600 mt-0.5">
            {countedItems.length} item masuk total
            {namedItems.length > countedItems.length && (
              <span className="text-slate-400"> · {namedItems.length - countedItems.length} tidak dihitung</span>
            )}
          </p>
        )}
      </div>

      <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl p-4">
        <div className="text-[11px] font-medium opacity-90 uppercase tracking-wide">Total penawaran</div>
        <div className="text-2xl font-black tabular-nums mt-0.5">{formatRupiahFull(s.grandTotal)}</div>
      </div>

      <div className={`mx-4 mt-3 p-3 rounded-xl border ${
        profitNegative
          ? 'bg-red-50 border-red-100'
          : 'bg-emerald-50 border-emerald-100'
      }`}>
        <div className={`text-xs font-medium flex items-center gap-1 ${
          profitNegative ? 'text-red-700' : 'text-emerald-700'
        }`}>
          {profitNegative && <AlertTriangle className="w-3.5 h-3.5" />}
          Profit estimasi
        </div>
        <div className={`text-lg font-bold tabular-nums ${
          profitNegative ? 'text-red-800' : 'text-emerald-800'
        }`}>
          {formatRupiahFull(s.totalProfit)}
        </div>
        <p className={`text-[10px] mt-1 ${profitNegative ? 'text-red-600/80' : 'text-emerald-600/80'}`}>
          Margin rata-rata: {s.avgMarginPct.toFixed(1)}%
        </p>
      </div>

      <div className="p-4 space-y-2 text-sm mt-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Breakdown</p>
        <Row label="Subtotal HPP" value={formatRupiahFull(s.subtotalHpp)} />
        {s.itemDiscountTotal > 0 && (
          <Row label="Diskon per item" value={`−${formatRupiahFull(s.itemDiscountTotal)}`} negative />
        )}
        <Row label="Subtotal jual item" value={formatRupiahFull(s.subtotalSellingItems)} />
        {draft.overhead_pct > 0 && (
          <Row
            label={`Overhead (${draft.overhead_pct}%)`}
            value={`+${formatRupiahFull(s.overheadAmount)}`}
            accent
          />
        )}
        <div className="border-t border-dashed border-slate-200 pt-2">
          <Row label="Subtotal penawaran" value={formatRupiahFull(s.subtotalBeforeDiscount)} bold />
        </div>
        {draft.discount_pct > 0 && (
          <Row label={`Diskon total (${draft.discount_pct}%)`} value={`−${formatRupiahFull(s.discountAmountPct)}`} negative />
        )}
        {draft.discount_amount > 0 && (
          <Row label="Diskon total (nominal)" value={`−${formatRupiahFull(s.discountAmountFixed)}`} negative />
        )}
        {draft.adjustments.filter(a => a.label.trim() && a.amount > 0).map(adj => (
          <Row key={adj.id} label={adj.label.trim()} value={`−${formatRupiahFull(adj.amount)}`} negative />
        ))}
        {draft.tax_pct > 0 && (
          <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(s.taxAmount)} />
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Margin item</span>
          <span className="font-semibold text-emerald-700">{s.avgMarginPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${marginWidth}%` }}
          />
        </div>
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
  muted,
}: {
  label: string;
  value: string;
  negative?: boolean;
  accent?: boolean;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold text-slate-800' : muted ? 'text-slate-500' : 'text-slate-600'}`}>
      <span className="truncate">{label}</span>
      <span className={`tabular-nums shrink-0 ${negative ? 'text-red-600' : accent ? 'text-amber-700' : ''}`}>
        {value}
      </span>
    </div>
  );
}
