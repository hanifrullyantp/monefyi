import { Sparkles } from 'lucide-react';

export default function BudgetAnalysisDivider() {
  return (
    <div className="relative py-8">
      <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
      <div className="relative flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          ANALISA REAL-TIME
        </span>
        <span className="text-[11px] text-slate-400">Otomatis diperbarui dari data terkini</span>
      </div>
    </div>
  );
}
