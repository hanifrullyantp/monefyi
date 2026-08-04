import { useEffect, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Desktop width in px — default 480 */
  width?: number;
  side?: 'right' | 'bottom';
  className?: string;
  'aria-label'?: string;
}

/**
 * Sheet panel (shadcn-style) — slide dari kanan (desktop) / bottom (mobile).
 */
export default function Sheet({
  open,
  onOpenChange,
  children,
  width = 480,
  className,
  'aria-label': ariaLabel = 'Panel detail',
}: SheetProps) {
  const dragControls = useDragControls();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <motion.button
            type="button"
            aria-label="Tutup panel"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Desktop: right sheet */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={cn(
              'absolute bottom-0 right-0 top-0 hidden flex-col bg-white shadow-2xl sm:flex',
              className
            )}
            style={{ width: 'min(480px, 100vw)' }}
            data-testid="room-detail-sheet-desktop"
          >
            {children}
          </motion.aside>

          {/* Mobile: bottom sheet */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className={cn(
              'absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-white shadow-2xl sm:hidden',
              className
            )}
            data-testid="room-detail-sheet-mobile"
          >
            <div
              className="flex shrink-0 cursor-grab justify-center py-3 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
            </div>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export interface SheetHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function SheetHeader({ children, onClose, className }: SheetHeaderProps) {
  return (
    <div className={cn('relative shrink-0', className)}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-xl bg-white/90 p-2 text-gray-500 shadow-sm hover:bg-gray-100 hover:text-gray-800"
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {children}
    </div>
  );
}

export function SheetBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto overscroll-contain', className)}>
      {children}
    </div>
  );
}
