import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export type UserMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
};

type Props = {
  userName?: string;
  items: UserMenuItem[];
};

export default function UserMenuDropdown({ userName, items }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 p-0.5 rounded-full hover:bg-slate-100 transition-all duration-200 active:scale-95"
        aria-label="Menu pengguna"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-full bg-org-primary flex items-center justify-center text-org-on-primary text-xs font-bold shrink-0">
          {userName?.charAt(0) || 'U'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 py-1 bg-white rounded-xl shadow-lg border border-slate-100 z-50">
          {userName && (
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
            </div>
          )}
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors ${
                item.danger ? 'text-rose-600' : 'text-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
