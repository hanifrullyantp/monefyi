import { X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type PopupCard = {
  icon?: string;
  value: string;
  label: string;
  bg?: string;
  color?: string;
};

export type PopupListItem = {
  icon?: string;
  title: string;
  meta?: string;
  value: string;
  valueColor?: string;
};

export type CardPopupProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  cards: PopupCard[];
  list: PopupListItem[];
  detailLabel?: string;
  onOpenDetail?: () => void;
};

export default function CardPopup({
  open,
  onClose,
  title,
  cards,
  list,
  detailLabel = 'Buka Detail',
  onOpenDetail,
}: CardPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-[61] bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-black text-slate-900">{title}</h3>
              <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Tutup">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {cards.map((c, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 p-3 text-center">
                    <div className="text-lg font-black text-slate-900">{c.value}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">{c.label}</div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-50">
                {list.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{item.title}</div>
                      {item.meta && <div className="text-xs text-slate-500 truncate">{item.meta}</div>}
                    </div>
                    <div className="text-sm font-bold shrink-0" style={{ color: item.valueColor || undefined }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {onOpenDetail && (
              <div className="p-4 border-t">
                <button
                  type="button"
                  onClick={() => { onOpenDetail(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm"
                >
                  {detailLabel} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
