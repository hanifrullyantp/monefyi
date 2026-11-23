import { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import type { EvmMetricDef } from '../../utils/evmMetrics';

interface Props {
  metric: EvmMetricDef;
  value: string;
  ok?: boolean;
}

export default function MetricHelpCard({ metric, value, ok = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative bg-white rounded-xl p-3 border text-center">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="absolute top-2 right-2 p-1 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
        aria-label={`Info ${metric.label}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <div className={`text-lg font-black pr-4 ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase">{metric.label}</div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 p-3 bg-slate-900 text-white text-left rounded-xl shadow-xl text-xs leading-relaxed">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-bold text-sm">{metric.title}</div>
            <button type="button" onClick={() => setOpen(false)} className="p-0.5 hover:bg-white/10 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-200 mb-2">{metric.description}</p>
          <p className="font-mono text-emerald-200 text-[10px] mb-1">{metric.formula}</p>
          <p className="text-slate-600 text-[10px]">Sumber: {metric.source}</p>
        </div>
      )}
    </div>
  );
}
