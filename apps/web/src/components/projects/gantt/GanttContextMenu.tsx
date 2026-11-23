import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface GanttContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
  children?: GanttContextMenuItem[];
}

interface GanttContextMenuProps {
  x: number;
  y: number;
  items: GanttContextMenuItem[];
  onClose: () => void;
}

function MenuItems({
  items,
  onClose,
}: {
  items: GanttContextMenuItem[];
  onClose: () => void;
}) {
  return (
    <>
      {items.map(item => {
        if (item.separator) {
          return <div key={item.id} className="my-1 border-t border-slate-100" />;
        }

        if (item.children?.length) {
          return (
            <div key={item.id} className="relative group/sub">
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-default">
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <span className="text-slate-400 text-xs">›</span>
              </div>
              <div className="hidden group-hover/sub:block absolute left-full top-0 ml-0.5 min-w-[180px] bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-[120]">
                <MenuItems items={item.children} onClose={onClose} />
              </div>
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 ${
              item.danger
                ? 'text-rose-600 hover:bg-rose-50'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </>
  );
}

/**
 * Floating context menu for Gantt task list and bars.
 */
export default function GanttContextMenu({ x, y, items, onClose }: GanttContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    if (rect.right > window.innerWidth) el.style.left = `${Math.max(8, maxX)}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${Math.max(8, maxY)}px`;
  }, [x, y, items]);

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[110] min-w-[200px] bg-white rounded-xl border border-slate-200 shadow-2xl py-1 overflow-visible"
      style={{ left: x, top: y }}
      onContextMenu={e => e.preventDefault()}
    >
      <MenuItems items={items} onClose={onClose} />
    </div>,
    document.body,
  );
}
