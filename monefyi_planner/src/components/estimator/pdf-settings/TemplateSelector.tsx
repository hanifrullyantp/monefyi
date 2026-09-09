import { Check } from 'lucide-react';
import { PDF_TEMPLATE_OPTIONS, type PdfTemplate } from '../../../types/estimator';

type Props = {
  selected: PdfTemplate;
  onSelect: (id: PdfTemplate) => void;
  title?: string;
};

const THUMB: Record<PdfTemplate, string> = {
  formal: 'bg-[#1e3a8a]',
  modern: 'bg-[#6d28d9]',
  clean: 'bg-neutral-900',
  fullcolor: 'bg-gradient-to-br from-emerald-500 to-cyan-500',
  futuristic: 'bg-neutral-950',
};

export default function TemplateSelector({ selected, onSelect, title = 'Pilih template' }: Props) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {PDF_TEMPLATE_OPTIONS.map(t => {
          const active = selected === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onSelect(t.value)}
              className={`relative rounded-2xl border-2 overflow-hidden text-left transition-all ${
                active
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`aspect-[3/4] ${THUMB[t.value]} relative p-3`}>
                <div className="h-2 w-16 rounded bg-white/70 mb-2" />
                <div className="h-1.5 w-full rounded bg-white/30 mb-1" />
                <div className="h-1.5 w-4/5 rounded bg-white/25 mb-3" />
                <div className="space-y-1">
                  <div className="h-8 rounded bg-white/20" />
                  <div className="h-8 rounded bg-white/15" />
                  <div className="h-8 rounded bg-white/10" />
                </div>
                {active && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white">
                <p className="font-bold text-sm text-slate-900">{t.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
