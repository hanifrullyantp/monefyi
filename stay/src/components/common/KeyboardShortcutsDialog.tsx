import Modal from '../ui/Modal';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Cheat sheet keyboard shortcuts Front Desk.
 */
export default function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
      data-testid="keyboard-shortcuts-dialog"
    >
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Pintasan cepat untuk resepsionis. Bisa dimatikan di Pengaturan Front Desk.
      </p>
      <ul className="space-y-2">
        {KEYBOARD_SHORTCUTS.map(({ keys, description }) => (
          <li
            key={description}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {description}
            </span>
            <div className="flex shrink-0 gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
