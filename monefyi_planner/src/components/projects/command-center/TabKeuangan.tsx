import { useState, type ReactNode } from 'react';
import { formatRupiah } from '../../../utils/projectUi';

interface TabKeuanganProps {
  rabTotal: number;
  spent: number;
  received: number;
  surplus: number;
  cpi: number;
  biaya: ReactNode;
  uangMasuk: ReactNode;
}

export default function TabKeuangan({
  rabTotal, spent, received, surplus, cpi, biaya, uangMasuk,
}: TabKeuanganProps) {
  const [sub, setSub] = useState<'biaya' | 'uangmasuk'>('biaya');
  const sisa = Math.max(0, rabTotal - spent);
  const burnPct = rabTotal ? (spent / rabTotal) * 100 : 0;

  const cards = [
    { label: 'RAB', value: formatRupiah(rabTotal), pct: '100%' },
    { label: 'Realisasi', value: formatRupiah(spent), pct: `${Math.round(burnPct)}%` },
    { label: 'Sisa', value: formatRupiah(sisa), pct: `${Math.round(100 - burnPct)}%` },
    { label: 'Diterima', value: formatRupiah(received), pct: rabTotal ? `${Math.round((received / rabTotal) * 100)}%` : '—' },
    { label: 'Saldo+', value: formatRupiah(surplus), pct: surplus >= 0 ? 'Plus' : '⚠ Minus', alert: surplus < 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {cards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border p-3 shadow-sm ${c.alert ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
            <div className="text-[10px] font-bold uppercase text-slate-500">{c.label}</div>
            <div className={`text-base font-black font-mono ${c.alert ? 'text-rose-700' : 'text-slate-900'}`}>{c.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{c.pct}</div>
            {c.label === 'Realisasi' && (
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(burnPct, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
        CPI (Cost Performance Index): <strong className="font-mono">{cpi.toFixed(2)}</strong>
        {cpi < 1 ? ' — biaya lebih tinggi dari nilai kerja selesai' : ' — efisiensi biaya baik'}
      </div>
      <div className="flex gap-2">
        {[
          { id: 'biaya' as const, label: 'Rincian Biaya' },
          { id: 'uangmasuk' as const, label: 'Uang Masuk' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${sub === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'biaya' ? biaya : uangMasuk}
    </div>
  );
}
