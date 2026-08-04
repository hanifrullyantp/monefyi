import { useEffect, useCallback } from 'react';
import { useFrontDeskPreferencesStore } from '../stores/frontDeskPreferencesStore';
import { trackFrontDeskEvent } from '../utils/frontDeskAnalytics';
import { playSound } from '../utils/sounds';

export interface KeyboardShortcutHandlers {
  onNewBooking?: () => void;
  onFocusSearch?: () => void;
  onToggleFilter?: () => void;
  onViewGrid?: () => void;
  onViewFloorplan?: () => void;
  onViewTimeline?: () => void;
  onCloseOverlay?: () => void;
  onShowShortcuts?: () => void;
  onOpenCommandPalette?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

/**
 * Global keyboard shortcuts untuk Front Desk.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled = true): void {
  const shortcutsEnabled = useFrontDeskPreferencesStore((s) => s.keyboardShortcutsEnabled);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !shortcutsEnabled) return;
      if (isTypingTarget(e.target)) {
        if (e.key === 'Escape') handlers.onCloseOverlay?.();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers.onOpenCommandPalette?.();
        trackFrontDeskEvent('keyboard_shortcut_used', { key: 'cmd+k' });
        return;
      }

      if (e.key === 'Escape') {
        handlers.onCloseOverlay?.();
        return;
      }

      if (mod) return;

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          playSound('click');
          handlers.onNewBooking?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: 'n' });
          break;
        case 's':
        case '/':
          e.preventDefault();
          handlers.onFocusSearch?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: e.key });
          break;
        case 'f':
          e.preventDefault();
          handlers.onToggleFilter?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: 'f' });
          break;
        case '1':
          handlers.onViewGrid?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: '1' });
          break;
        case '2':
          handlers.onViewFloorplan?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: '2' });
          break;
        case '3':
          handlers.onViewTimeline?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: '3' });
          break;
        case '?':
          e.preventDefault();
          handlers.onShowShortcuts?.();
          trackFrontDeskEvent('keyboard_shortcut_used', { key: '?' });
          break;
        default:
          break;
      }
    },
    [enabled, shortcutsEnabled, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS = [
  { keys: ['N'], description: 'Booking baru' },
  { keys: ['S', '/'], description: 'Fokus pencarian' },
  { keys: ['F'], description: 'Toggle filter panel' },
  { keys: ['1'], description: 'View Grid' },
  { keys: ['2'], description: 'View Denah' },
  { keys: ['3'], description: 'View Timeline' },
  { keys: ['Esc'], description: 'Tutup panel / modal' },
  { keys: ['?'], description: 'Tampilkan shortcut' },
  { keys: ['⌘/Ctrl', 'K'], description: 'Command palette' },
] as const;
