import { calcEstimationSummary } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';

interface Props {
  draft: EstimationFormDraft;
}

export default function EstimationSummaryPanel({ draft }: Props) {
  const s = calcEstimationSummary(
    draft.items.filter(i => i.name.trim()),
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
  );

  const marginWidth = Math.min(100, Math.max(0, s.avgMarginPct));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm sticky top-4">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Ringkasan</h3>

      <div className="space-y-2 text-sm">
        <Row label="Subtotal HPP" value={formatRupiahFull(s.subtotalHpp)} />
        {draft.overhead_pct > 0 && (
          <Row label={`Overhead (${draft.overhead_pct}%)`} value={formatRupiahFull(s.overheadAmount)} />
        )}
        <Row label="Subtotal Jual" value={formatRupiahFull(s.subtotalBeforeDiscount)} muted />
        {draft.discount_pct > 0 && (
          <Row label={`Diskon (${draft.discount_pct}%)`} value={`-${formatRupiahFull(s.discountAmount)}`} negative />
        )}
        {draft.tax_pct > 0 && (
          <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(s.taxAmount)} />
        )}
      </div>

      <div className="my-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Margin rata-rata</span>
          <span>{s.avgMarginPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${marginWidth}%` }}
          />
        </div>
      </div>

      <div className="bg-indigo-600 text-white rounded-xl p-4 mt-3">
        <div className="text-xs opacity-80">TOTAL PENAWARAN</div>
        <div className="text-xl font-black">{formatRupiahFull(s.grandTotal)}</div>
      </div>

      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
        <div className="text-xs text-emerald-700">Profit estimasi</div>
        <div className="text-lg font-bold text-emerald-800">{formatRupiahFull(s.totalProfit)}</div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  negative,
}: {
  label: string;
  value: string;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      <span className={`font-semibold tabular-nums ${negative ? 'text-rose-600' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );
}
