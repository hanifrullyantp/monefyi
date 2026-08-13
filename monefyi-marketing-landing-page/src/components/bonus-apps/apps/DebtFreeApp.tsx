import React, { useState, useMemo } from 'react';
import { Target, TrendingDown, Clock, DollarSign, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AppInputCurrency } from '../shared/AppInputCurrency';
import { AppInputPercent } from '../shared/AppInputPercent';
import { AppResultCard } from '../shared/AppResultCard';
import { calculateDebtFree, DebtItem } from '../../../lib/calculator-utils';
import { formatRupiah, formatMonthYear, formatDuration } from '../../../lib/formatters';
import { cn } from '../../../lib/cn';

export function DebtFreeApp() {
  const [income, setIncome] = useState(10000000);
  const [alokasi, setAlokasi] = useState(3000000);
  const [strategi, setStrategi] = useState<'snowball' | 'avalanche'>('snowball');
  const [debts, setDebts] = useState<DebtItem[]>([
    { id: '1', nama: 'Kartu Kredit', sisaPokok: 5000000, bungaPerBulan: 1.5, cicilanMinimum: 500000 },
    { id: '2', nama: 'Motor', sisaPokok: 12000000, bungaPerBulan: 2.0, cicilanMinimum: 800000 },
  ]);
  const [showAllMonths, setShowAllMonths] = useState(false);

  const addDebt = () => {
    if (debts.length < 5) {
      setDebts([...debts, { id: Date.now().toString(), nama: `Hutang ${debts.length + 1}`, sisaPokok: 0, bungaPerBulan: 0, cicilanMinimum: 0 }]);
    }
  };

  const removeDebt = (id: string) => {
    if (debts.length > 1) {
      setDebts(debts.filter(d => d.id !== id));
    }
  };

  const updateDebt = (id: string, key: keyof DebtItem, value: any) => {
    setDebts(debts.map(d => d.id === id ? { ...d, [key]: value } : d));
  };

  const results = useMemo(() => {
    return calculateDebtFree(debts, alokasi, strategi);
  }, [debts, alokasi, strategi]);

  const alokasiPercent = (alokasi / income) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppInputCurrency label="Penghasilan Bersih/Bln" value={income} onChange={setIncome} />
        <div className="space-y-1">
          <AppInputCurrency label="Alokasi Bayar Hutang/Bln" value={alokasi} onChange={setAlokasi} />
          <p className={cn('text-[10px] font-medium', alokasiPercent > 40 ? 'text-red-400' : 'text-slate-500')}>
            {alokasiPercent.toFixed(1)}% dari penghasilan {alokasiPercent > 40 ? '(Melebihi batas aman 40%)' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daftar Hutang</label>
        </div>
        {debts.map((d, idx) => (
          <div key={d.id} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 relative group">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Hutang {idx + 1}</span>
              {debts.length > 1 && (
                <button onClick={() => removeDebt(d.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                value={d.nama}
                onChange={e => updateDebt(d.id, 'nama', e.target.value)}
                placeholder="Nama Hutang (KPR, Motor, dll)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
              />
              <AppInputCurrency label="Sisa Pokok" value={d.sisaPokok} onChange={v => updateDebt(d.id, 'sisaPokok', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AppInputPercent label="Bunga / Bulan" value={d.bungaPerBulan} onChange={v => updateDebt(d.id, 'bungaPerBulan', v)} />
              <AppInputCurrency label="Cicilan Minimum" value={d.cicilanMinimum} onChange={v => updateDebt(d.id, 'cicilanMinimum', v)} />
            </div>
          </div>
        ))}
        {debts.length < 5 && (
          <button onClick={addDebt} className="w-full py-2 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all flex items-center justify-center gap-2 text-sm font-medium">
            <Plus size={14} /> Tambah Hutang
          </button>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strategi Pelunasan</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setStrategi('snowball')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all',
              strategi === 'snowball' ? 'bg-green-500/10 border-green-500/50 shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            )}
          >
            <Target className={cn('mb-2', strategi === 'snowball' ? 'text-green-400' : 'text-slate-500')} size={24} />
            <p className="text-sm font-bold text-white mb-1">Debt Snowball</p>
            <p className="text-[10px] text-slate-400">Lunasi hutang terkecil dulu untuk motivasi mental yang cepat.</p>
          </button>
          <button
            onClick={() => setStrategi('avalanche')}
            className={cn(
              'p-4 rounded-2xl border text-left transition-all',
              strategi === 'avalanche' ? 'bg-blue-500/10 border-blue-500/50 shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            )}
          >
            <TrendingDown className={cn('mb-2', strategi === 'avalanche' ? 'text-blue-400' : 'text-slate-500')} size={24} />
            <p className="text-sm font-bold text-white mb-1">Debt Avalanche</p>
            <p className="text-[10px] text-slate-400">Lunasi bunga tertinggi dulu untuk menghemat total bunga.</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AppResultCard label="Bebas Hutang" value={results.monthsToFree} suffix=" bln" variant="success" />
        <AppResultCard label="Total Bunga" value={results.totalBungaDibayar} prefix="Rp " variant="danger" />
        <AppResultCard label="Total Bayar" value={results.totalDibayar} prefix="Rp " />
        <div className="p-4 border border-slate-700 rounded-2xl bg-slate-800 flex flex-col justify-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Bebas</span>
          <span className="text-sm font-extrabold text-white">{formatMonthYear(results.monthsToFree)}</span>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" /> Timeline Pelunasan
        </h4>
        <div className="space-y-4">
          {results.debtTimeline.map((t, idx) => (
            <div key={t.id} className="relative">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-medium text-slate-300">{t.nama}</span>
                <span className="text-green-400 font-bold">{formatMonthYear(t.lunasBulan)}</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-1000"
                  style={{ width: `${((results.debtTimeline.length - idx) / results.debtTimeline.length) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
        <button
          onClick={() => setShowAllMonths(!showAllMonths)}
          className="w-full px-4 py-3 bg-slate-700/50 flex justify-between items-center text-xs font-bold text-white uppercase"
        >
          Detail Pembayaran Bulanan
          {showAllMonths ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showAllMonths && (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-900 text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2 font-bold">Bulan</th>
                  <th className="px-4 py-2 font-bold">Total Bayar</th>
                  <th className="px-4 py-2 font-bold">Sisa Hutang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {results.monthlyData.slice(0, 24).map((m) => (
                  <tr key={m.bulan} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-slate-300">{formatMonthYear(m.bulan)}</td>
                    <td className="px-4 py-2 text-white">{formatRupiah(m.totalBayar)}</td>
                    <td className="px-4 py-2 text-red-400">{formatRupiah(m.totalSisa)}</td>
                  </tr>
                ))}
                {results.monthlyData.length > 24 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-center text-slate-500 italic">
                      ... {results.monthlyData.length - 24} bulan berikutnya
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
