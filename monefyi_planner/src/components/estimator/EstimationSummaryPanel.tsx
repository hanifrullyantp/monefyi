import { calcEstimationSummary } from '../../lib/estimatorCalc';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import type { EstimationFormDraft } from '../../types/estimator';

interface Props {
  draft: EstimationFormDraft;
}

export default function EstimationSummaryPanel({ draft }: Props) {
  const activeItems = draft.items.filter(i => i.name.trim());
  const s = calcEstimationSummary(
    activeItems,
    draft.overhead_pct,
    draft.discount_pct,
    draft.tax_pct,
  );

  const marginWidth = Math.min(100, Math.max(0, s.avgMarginPct));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-20 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ringkasan</h3>
        {activeItems.length > 0 && (
          <p className="text-[11px] text-slate-600 mt-0.5">{activeItems.length} item</p>
        )}
      </div>

      <div className="p-4 space-y-2 text-sm">
        <Row label="Subtotal HPP" value={formatRupiahFull(s.subtotalHpp)} />
        <Row label="Subtotal jual item" value={formatRupiahFull(s.subtotalSellingItems)} />
        {draft.overhead_pct > 0 && (
          <Row
            label={`Overhead (${draft.overhead_pct}% dari HPP)`}
            value={`+${formatRupiahFull(s.overheadAmount)}`}
            accent
          />
        )}
        <div className="border-t border-dashed border-slate-200 pt-2">
          <Row label="Subtotal penawaran" value={formatRupiahFull(s.subtotalBeforeDiscount)} bold />
        </div>
        {draft.discount_pct > 0 && (
          <Row label={`Diskon (${draft.discount_pct}%)`} value={`−${formatRupiahFull(s.discountAmount)}`} negative />
        )}
        {draft.discount_pct > 0 && (
          <Row label="Setelah diskon" value={formatRupiahFull(s.afterDiscount)} muted />
        )}
        {draft.tax_pct > 0 && (
          <Row label={`PPN (${draft.tax_pct}%)`} value={formatRupiahFull(s.taxAmount)} />
        )}
      </div>

      <div className="px-4 pb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Margin rata-rata item</span>
          <span className="font-semibold text-emerald-700">{s.avgMarginPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${marginWidth}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">
          Margin = laba ÷ harga jual. HPP = harga jual × (1 − margin%).
        </p>
      </div>

      <div className="mx-4 mb-4 bg-gradient-to-br from-emerald-600 to-emerald-600 text-white rounded-xl p-4">
        <div className="text-[11px] font-medium opacity-90 uppercase tracking-wide">Total penawaran</div>
        <div className="text-2xl font-black tabular-nums mt-0.5">{formatRupiahFull(s.grandTotal)}</div>
      </div>

      <div className="mx-4 mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
        <div className="text-xs text-emerald-700 font-medium">Profit estimasi</div>
        <div className="text-lg font-bold text-emerald-800 tabular-nums">{formatRupiahFull(s.totalProfit)}</div>
        <p className="text-[10px] text-emerald-600/80 mt-1">Laba item + overhead − diskon (belum termasuk PPN)</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  negative,
  accent,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  negative?: boolean;
  accent?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 items-baseline">
      <span className={`text-xs ${muted ? 'text-slate-600' : 'text-slate-600'}`}>{label}</span>
      <span
        className={`text-sm tabular-nums shrink-0 ${
          negative ? 'text-rose-600' : accent ? 'text-emerald-600' : bold ? 'text-slate-900 font-bold' : 'text-slate-800 font-semibold'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
