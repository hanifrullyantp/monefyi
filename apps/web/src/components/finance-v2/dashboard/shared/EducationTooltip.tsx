import { useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  content: string;
  label?: string;
}

export default function EducationTooltip({ content, label = 'Info' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-0.5 rounded-full hover:bg-black/10 text-inherit opacity-80"
        aria-label={label}
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-56 p-3 bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl shadow-xl">
          {content}
        </div>
      )}
    </div>
  );
}
