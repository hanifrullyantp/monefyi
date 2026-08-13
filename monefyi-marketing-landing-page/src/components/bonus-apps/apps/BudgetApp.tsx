import React, { useState, useMemo } from 'react';
import { PieChart, Home, ShoppingBag, PiggyBank, Heart, Target, Lightbulb } from 'lucide-react';
import { AppInputCurrency } from '../shared/AppInputCurrency';
import { AppResultCard } from '../shared/AppResultCard';
import { AppSlider } from '../shared/AppSlider';
import { calculateBudget } from '../../../lib/calculator-utils';
import { cn } from '../../../lib/cn';

export function BudgetApp() {
  const [income, setIncome] = useState(10000000);
  const [metode, setMetode] = useState<'50/30/20' | '40/30/20/10' | '70/20/10' | 'custom'>('50/30/20');
  const [custom, setCustom] = useState({ kebutuhan: 50, keinginan: 30, tabungan: 20, sedekah: 0 });

  const results = useMemo(() => {
    return calculateBudget(income, metode, custom);
  }, [income, metode, custom]);

  const updateCustom = (key: string, val: number) => {
    setCustom(prev => {
      const next = { ...prev, [key]: val };
      return next;
    });
  };

  const totalCustom = custom.kebutuhan + custom.keinginan + custom.tabungan + custom.sedekah;

  return (
    <div className="space-y-6">
      <AppInputCurrency label="Total Penghasilan Bulanan" value={income} onChange={setIncome} />

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pilih Metode Budgeting</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: '50/30/20', label: '50/30/20', desc: 'Populer: 50% Keb, 30% Kei, 20% Tab', icon: PieChart, color: 'text-green-400' },
            { id: '40/30/20/10', label: '40/30/20/10', desc: 'Islami: Tambah 10% Sedekah', icon: Heart, color: 'text-amber-400' },
            { id: '70/20/10', label: '70/20/10', desc: 'Sederhana: 70% Pengeluaran', icon: Target, color: 'text-blue-400' },
            { id: 'custom', label: 'Kustom', desc: 'Atur sendiri persentase kamu', icon: Lightbulb, color: 'text-purple-400' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMetode(m.id as any)}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all',
                metode === m.id ? 'bg-slate-800 border-green-500/50 shadow-lg' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              )}
            >
              <m.icon className={cn('mb-2', metode === m.id ? m.color : 'text-slate-500')} size={20} />
              <p className="text-sm font-bold text-white mb-0.5">{m.label}</p>
              <p className="text-[10px] text-slate-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {metode === 'custom' && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl space-y-4">
          <AppSlider label="Kebutuhan" value={custom.kebutuhan} onChange={v => updateCustom('kebutuhan', v)} />
          <AppSlider label="Keinginan" value={custom.keinginan} onChange={v => updateCustom('keinginan', v)} />
          <AppSlider label="Tabungan" value={custom.tabungan} onChange={v => updateCustom('tabungan', v)} />
          <AppSlider label="Sedekah" value={custom.sedekah} onChange={v => updateCustom('sedekah', v)} />
          <div className={cn('text-center font-bold text-xs', totalCustom === 100 ? 'text-green-400' : 'text-red-400')}>
            Total: {totalCustom}% {totalCustom !== 100 && '(Harus 100%)'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <AppResultCard label="Kebutuhan" value={results.kebutuhan} prefix="Rp " variant="highlight" />
        <AppResultCard label="Keinginan" value={results.keinginan} prefix="Rp " variant="default" />
        <AppResultCard label="Tabungan" value={results.tabungan} prefix="Rp " variant="success" />
        {metode === '40/30/20/10' || (metode === 'custom' && results.sedekah > 0) ? (
          <AppResultCard label="Sedekah" value={results.sedekah} prefix="Rp " variant="warning" />
        ) : metode === '70/20/10' ? (
          <AppResultCard label="Hutang/Donasi" value={results.hutang} prefix="Rp " variant="danger" />
        ) : null}
      </div>

      {/* Donut Chart Visual */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
        <div className="relative w-40 h-40">
           <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
             <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="4"></circle>
             {(() => {
               let offset = 0;
               const data = [
                 { v: results.kebutuhan, c: '#3b82f6' },
                 { v: results.keinginan, c: '#a855f7' },
                 { v: results.tabungan, c: '#10b981' },
                 { v: results.sedekah || results.hutang, c: '#f59e0b' }
               ].filter(d => d.v > 0);
               const total = income;
               
               return data.map((d, i) => {
                 const percent = (d.v / total) * 100;
                 const dash = `${percent} ${100 - percent}`;
                 const currentOffset = offset;
                 offset += percent;
                 return (
                   <circle
                     key={i}
                     cx="18"
                     cy="18"
                     r="16"
                     fill="transparent"
                     stroke={d.c}
                     strokeWidth="4"
                     strokeDasharray={dash}
                     strokeDashoffset={-currentOffset}
                     className="transition-all duration-1000 ease-out"
                   />
                 );
               });
             })()}
           </svg>
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
             <span className="text-[10px] font-bold text-slate-500 uppercase">Total</span>
             <span className="text-xs font-bold text-white">100%</span>
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"/> <span className="text-[10px] text-slate-400">Kebutuhan</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"/> <span className="text-[10px] text-slate-400">Keinginan</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"/> <span className="text-[10px] text-slate-400">Tabungan</span></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"/> <span className="text-[10px] text-slate-400">{metode === '70/20/10' ? 'Hutang' : 'Sedekah'}</span></div>
        </div>
      </div>
    </div>
  );
}
