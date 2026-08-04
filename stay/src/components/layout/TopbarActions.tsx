import { Moon, Settings, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import NotificationCenter from '../frontdesk/NotificationCenter';
import { useFrontDeskPreferencesStore } from '../../stores/frontDeskPreferencesStore';

/** Tombol ikon konsisten untuk topbar — light mode first, dark via class .dark */
export const topbarIconButtonClass =
  'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

interface TopbarActionsProps {
  className?: string;
}

/**
 * Aksi global header: dark mode, notifikasi, preferensi Front Desk.
 */
export default function TopbarActions({ className }: TopbarActionsProps) {
  const navigate = useNavigate();
  const darkMode = useFrontDeskPreferencesStore((s) => s.darkMode);
  const setPreference = useFrontDeskPreferencesStore((s) => s.setPreference);

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => setPreference('darkMode', !darkMode)}
        className={topbarIconButtonClass}
        aria-label={darkMode ? 'Mode terang' : 'Mode gelap'}
        data-testid="dark-mode-toggle"
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <NotificationCenter buttonClassName={topbarIconButtonClass} panelAlign="right" />
      <button
        type="button"
        onClick={() => navigate('/settings/frontdesk-preferences')}
        className={topbarIconButtonClass}
        aria-label="Preferensi Front Desk"
        data-testid="frontdesk-settings-btn"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
