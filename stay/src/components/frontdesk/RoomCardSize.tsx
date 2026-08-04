import { Maximize2, Minimize2, Square } from 'lucide-react';
import { cn } from '../../utils/cn';

export type RoomCardSizeValue = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'stay-room-card-size';

const SIZE_OPTIONS: {
  value: RoomCardSizeValue;
  label: string;
  icon: typeof Square;
}[] = [
  { value: 'sm', label: 'Kecil', icon: Minimize2 },
  { value: 'md', label: 'Sedang', icon: Square },
  { value: 'lg', label: 'Besar', icon: Maximize2 },
];

export interface RoomCardSizeProps {
  value: RoomCardSizeValue;
  onChange: (size: RoomCardSizeValue) => void;
  className?: string;
}

export function readRoomCardSize(): RoomCardSizeValue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'sm' || stored === 'md' || stored === 'lg') return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.innerWidth < 640) return 'sm';
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) return 'md';
  return 'sm';
}

export function persistRoomCardSize(size: RoomCardSizeValue): void {
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    /* ignore */
  }
}

/**
 * Toggle ukuran kartu kamar (Kecil / Sedang / Besar).
 */
export default function RoomCardSize({ value, onChange, className }: RoomCardSizeProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900',
        className
      )}
      role="group"
      aria-label="Ukuran kartu kamar"
    >
      {SIZE_OPTIONS.map(({ value: sizeValue, label, icon: Icon }) => (
        <button
          key={sizeValue}
          type="button"
          title={label}
          onClick={() => onChange(sizeValue)}
          className={cn(
            'flex min-h-[36px] min-w-[36px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition-all sm:min-h-[40px] sm:min-w-[40px] sm:px-2.5',
            value === sizeValue
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
          aria-pressed={value === sizeValue}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
