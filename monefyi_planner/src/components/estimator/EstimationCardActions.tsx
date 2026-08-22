import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Copy, MessageCircle, MoreVertical, Pencil, Receipt, Rocket, Trash2,
} from 'lucide-react';

type Props = {
  onShareWhatsApp?: () => void;
  onKwitansi?: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  waLoading?: boolean;
  kwitansiLoading?: boolean;
};

export default function EstimationCardActions({
  onShareWhatsApp,
  onKwitansi,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  waLoading = false,
  kwitansiLoading = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const stop = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
      {onShareWhatsApp && (
        <button
          type="button"
          title="WhatsApp"
          aria-label="Bagikan WhatsApp"
          disabled={waLoading}
          onClick={e => stop(e, onShareWhatsApp)}
          className="p-2.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors disabled:opacity-60"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}

      {onKwitansi && (
        <button
          type="button"
          title="Kwitansi"
          aria-label="Generate kwitansi"
          disabled={kwitansiLoading}
          onClick={e => stop(e, onKwitansi)}
          className="p-2.5 rounded-xl text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 transition-colors disabled:opacity-60"
        >
          <Receipt className="w-4 h-4" />
        </button>
      )}

      <div ref={menuRef} className="relative">
        <button
          type="button"
          title="Menu"
          aria-label="Menu aksi"
          aria-expanded={menuOpen}
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(v => !v);
          }}
          className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-40 min-w-[11.5rem] bg-white border border-slate-200 rounded-xl shadow-xl py-1">
            <MenuItem icon={Pencil} label="Edit" onClick={e => stop(e, onEdit)} />
            <MenuItem icon={Copy} label="Duplikat" onClick={e => stop(e, onDuplicate)} />
            {onConvert && (
              <MenuItem
                icon={Rocket}
                label="Buat / sambung proyek"
                onClick={e => stop(e, onConvert)}
              />
            )}
            <div className="my-1 border-t border-slate-100" />
            <MenuItem icon={Trash2} label="Hapus" danger onClick={e => stop(e, onDelete)} />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: (e: MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-slate-50 ${
        danger ? 'text-rose-600' : 'text-slate-700'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );
}
