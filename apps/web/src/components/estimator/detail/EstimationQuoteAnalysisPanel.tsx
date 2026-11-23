import { PieChart } from 'lucide-react';
import { formatRupiahFull } from '../../../lib/estimatorFormat';
import type { EstimationSummary } from '../../../types/estimator';

type Props = {
  summary: EstimationSummary;
};

/** Ringkasan internal HPP / margin — untuk analisa di sheet Dokumen & Pembayaran. */
export default function EstimationQuoteAnalysisPanel({ summary }: Props) {
  const marginPct = Number.isFinite(summary.avgMarginPct)
    ? Math.round(summary.avgMarginPct * 10) / 10
    : 0;

  const rows: Array<{ label: string; value: string; highlight?: 'profit' | 'cost' }> = [
    { label: 'Total HPP (modal)', value: formatRupiahFull(summary.subtotalHpp), highlight: 'cost' },
    { label: 'Subtotal harga jual item', value: formatRupiahFull(summary.subtotalSellingItems) },
  ];

  if (summary.overheadAmount > 0) {
    rows.push({ label: 'Overhead', value: formatRupiahFull(summary.overheadAmount) });
  }
  if (summary.itemDiscountTotal > 0) {
    rows.push({ label: 'Diskon per item', value: `−${formatRupiahFull(summary.itemDiscountTotal)}` });
  }
  rows.push({ label: 'Total penawaran (klien)', value: formatRupiahFull(summary.grandTotal) });
  rows.push({
    label: 'Estimasi keuntungan',
    value: formatRupiahFull(summary.totalProfit),
    highlight: 'profit',
  });
  rows.push({ label: 'Margin rata-rata', value: `${marginPct}%` });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        <PieChart className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Analisa HPP & keuntungan</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map(row => (
          <li key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="text-slate-600">{row.label}</span>
            <span
              className={`font-bold tabular-nums shrink-0 ${
                row.highlight === 'profit'
                  ? 'text-emerald-700'
                  : row.highlight === 'cost'
                    ? 'text-slate-800'
                    : 'text-slate-900'
              }`}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
