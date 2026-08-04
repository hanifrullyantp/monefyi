import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Maximize2, Minimize2, Square } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { RoomCardSizeValue } from './RoomCardSize';
import { persistRoomCardSize } from './RoomCardSize';

const OPTIONS: {
  value: RoomCardSizeValue;
  label: string;
  icon: typeof Square;
}[] = [
  { value: 'sm', label: 'Kecil', icon: Minimize2 },
  { value: 'md', label: 'Sedang', icon: Square },
  { value: 'lg', label: 'Besar', icon: Maximize2 },
];

export interface RoomCardSizeDropdownProps {
  value: RoomCardSizeValue;
  onChange: (size: RoomCardSizeValue) => void;
  className?: string;
}

/**
 * Ukuran kartu via dropdown — hemat ruang toolbar.
 */
export default function RoomCardSizeDropdown({
  value,
  onChange,
  className,
}: RoomCardSizeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1];
  const ActiveIcon = active.icon;

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        aria-label={`Ukuran kartu: ${active.label}`}
        title={`Ukuran: ${active.label}`}
      >
        <ActiveIcon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <ul className="absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {OPTIONS.map(({ value: sizeValue, label, icon: Icon }) => (
            <li key={sizeValue}>
              <button
                type="button"
                onClick={() => {
                  persistRoomCardSize(sizeValue);
                  onChange(sizeValue);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold',
                  value === sizeValue
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
