import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import {
  Clock, Copy, FileText, MessageCircle, MoreVertical, Pencil, Receipt, Rocket, Trash2, User,
} from 'lucide-react';
import EstimationStatusPill from './EstimationStatusPill';
import {
  formatRelativeTimeId,
  formatRupiahCompact,
  formatRupiahFull,
} from '../../../lib/estimatorFormat';
import { normalizeEstimationStatus } from '../../../lib/estimationStatus';
import type { Estimation, EstimationWorkflowStatus } from '../../../types/estimator';

type Props = {
  estimation: Estimation;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  onShareWhatsApp?: () => void;
  onKwitansi?: () => void;
  waLoading?: boolean;
  kwitansiLoading?: boolean;
};

function stopCardClick(e: MouseEvent) {
  e.stopPropagation();
}

function cardKeyDown(e: KeyboardEvent, onOpen: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onOpen();
  }
}

function clientLine(est: Estimation): string | null {
  const name = est.customer_name?.trim();
  const place = est.customer_address?.trim() || est.customer_phone?.trim();
  if (!name && !place) return null;
  if (name && place) return `${name} · ${place}`;
  return name || place || null;
}

function pdfMetaLabel(est: Estimation): string {
  if (est.sent_at) return 'PDF Sent';
  if (normalizeEstimationStatus(est.status) === 'penawaran') return 'Penawaran';
  return 'Draft';
}

export default function EstimationListCard({
  estimation: est,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
  onShareWhatsApp,
  onKwitansi,
  waLoading = false,
  kwitansiLoading = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = normalizeEstimationStatus(est.status);
  const profit = Number(est.total_profit) || 0;
  const profitNegative = profit < 0;
  const isConverted = status === 'converted';
  const client = clientLine(est);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const runMenu = (e: MouseEvent, fn: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    fn();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => cardKeyDown(e, onOpen)}
      className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer p-5"
    >
      {/* Header: kode + status + menu */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
            {est.code}
          </span>
          <EstimationStatusPill status={status} compact />
        </div>
        <div ref={menuRef} className="relative shrink-0" onClick={stopCardClick}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
            className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-all duration-200 active:scale-95"
            aria-label="Menu estimasi"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-40 min-w-[11.5rem] bg-white border border-slate-200 rounded-xl shadow-xl py-1">
              <MenuRow icon={Pencil} label="Edit" onClick={e => runMenu(e, onEdit)} />
              <MenuRow icon={Copy} label="Duplikat" onClick={e => runMenu(e, onDuplicate)} />
              {!isConverted && onConvert && (
                <MenuRow icon={Rocket} label="Jadikan proyek" onClick={e => runMenu(e, onConvert)} />
              )}
              <div className="my-1 border-t border-slate-100" />
              <MenuRow icon={Trash2} label="Hapus" danger onClick={e => runMenu(e, onDelete)} />
            </div>
          )}
        </div>
      </div>

      {/* Body: judul + klien */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2">{est.title}</h3>
        {client && (
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 min-w-0">
            <User size={12} className="shrink-0" aria-hidden />
            <span className="truncate">{client}</span>
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-100">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Nilai Proyek</p>
          <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatRupiahCompact(Number(est.total_selling_price))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block tabular-nums">
            {formatRupiahFull(Number(est.total_selling_price))}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Est. Profit</p>
          <p className={`text-lg font-bold mt-1 tabular-nums ${profitNegative ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatRupiahCompact(profit)}
          </p>
        </div>
      </div>

      {/* Footer: meta + quick actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-xs text-slate-400 min-w-0">
          <span className="flex items-center gap-1 shrink-0">
            <Clock size={12} aria-hidden />
            {formatRelativeTimeId(est.updated_at)}
          </span>
          <span className="flex items-center gap-1 truncate">
            <FileText size={12} className="shrink-0" aria-hidden />
            {pdfMetaLabel(est)}
          </span>
        </div>
        {!isConverted && (
          <div className="flex items-center gap-1 shrink-0" onClick={stopCardClick}>
            {onShareWhatsApp && (
              <button
                type="button"
                title="WhatsApp"
                disabled={waLoading}
                onClick={e => runMenu(e, onShareWhatsApp)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-emerald-50 text-emerald-600 transition-all duration-200 active:scale-95 disabled:opacity-60"
              >
                <MessageCircle size={16} />
              </button>
            )}
            {onKwitansi && (
              <button
                type="button"
                title="Kwitansi"
                disabled={kwitansiLoading}
                onClick={e => runMenu(e, onKwitansi)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-emerald-50 text-emerald-600 transition-all duration-200 active:scale-95 disabled:opacity-60"
              >
                <Receipt size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function MenuRow({
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
