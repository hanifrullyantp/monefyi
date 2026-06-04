import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** e.g. '85vh' | '95vh' */
  height?: string;
  children: ReactNode;
  showDragHandle?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  height = '85vh',
  children,
  showDragHandle = true,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 400) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col justify-end"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Tutup"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col w-full max-h-[96vh]"
            style={{ height }}
            onClick={e => e.stopPropagation()}
          >
            {showDragHandle && (
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0"
                onPointerDown={e => dragControls.start(e)}
              >
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>
            )}
            {title && (
              <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
