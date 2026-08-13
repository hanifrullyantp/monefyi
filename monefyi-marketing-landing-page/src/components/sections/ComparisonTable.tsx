import React from 'react';
import { Check, X, Info } from 'lucide-react';
import { SectionWrapper } from '../ui/SectionWrapper';
import { SectionHeader } from '../ui/SectionHeader';
import { comparisonData } from '../../data/comparison-data';
import { cn } from '../../lib/cn';
import { EditableText } from '../admin/EditableText';

export function ComparisonTable() {
  return (
    <SectionWrapper background="alt">
      <SectionHeader
        eyebrow="COMPARISON"
        title="Kenapa Harus"
        highlight="Monefyi?"
        subtitle="Kami bukan sekadar pencatat pengeluaran. Kami adalah solusi finansial lengkap."
      />

      <div className="max-w-6xl mx-auto overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-6 px-4 text-slate-500 font-bold uppercase text-xs tracking-widest">Fitur Utama</th>
              <th className="py-6 px-4 text-slate-300 font-bold text-center">Excel / Buku</th>
              <th className="py-6 px-4 text-slate-300 font-bold text-center">Mobile Banking</th>
              <th className="py-6 px-4 text-slate-300 font-bold text-center">App Lain</th>
              <th className="py-6 px-4 text-green-400 font-black text-center bg-green-500/5 rounded-t-3xl border-x border-t border-green-500/20">Monefyi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {comparisonData.map((row, i) => (
              <tr key={i} className="group hover:bg-white/5 transition-colors">
                <td className="py-5 px-4 text-sm font-medium text-slate-300 flex items-center gap-2">
                  <EditableText id={`comparison_feature_${i}`} defaultValue={row.feature} />
                  {row.feature === 'Safe to Spend harian' && <Info size={12} className="text-slate-600 cursor-help" />}
                </td>
                <td className="py-5 px-4 text-center">{renderVal(row.excel)}</td>
                <td className="py-5 px-4 text-center">{renderVal(row.bankApp)}</td>
                <td className="py-5 px-4 text-center">{renderVal(row.other)}</td>
                <td className="py-5 px-4 text-center bg-green-500/5 border-x border-green-500/20">
                  {renderVal(row.monefyi, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
}

function renderVal(val: boolean | string, isMonefyi = false) {
  if (typeof val === 'string') {
    return <span className={cn('text-xs font-bold', isMonefyi ? 'text-green-400' : 'text-slate-500')}>{val}</span>;
  }
  if (val === true) {
    return <Check size={20} className={cn('mx-auto', isMonefyi ? 'text-green-500' : 'text-slate-500')} />;
  }
  return <X size={20} className="mx-auto text-slate-800" />;
}
