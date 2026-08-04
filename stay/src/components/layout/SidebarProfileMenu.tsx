import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Mail, Shield, User, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export interface SidebarProfileMenuProps {
  compact?: boolean;
}

/**
 * Menu profil sidebar — info akun + logout dengan konfirmasi.
 */
export default function SidebarProfileMenu({ compact = false }: SidebarProfileMenuProps) {
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
      setMenuOpen(false);
    }
  };

  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl transition-colors hover:bg-slate-50',
          compact ? 'justify-center px-2 py-2' : 'px-2 py-2',
          menuOpen && 'bg-slate-50'
        )}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        data-testid="sidebar-profile-btn"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700">
          <span className="text-xs font-bold text-white">{initial}</span>
        </div>
        {!compact && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-slate-800">{user.name}</p>
              <p className="text-[10px] capitalize text-slate-400">{user.role}</p>
            </div>
            <User className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          </>
        )}
      </button>

      {menuOpen && (
        <div
          className={cn(
            'absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900',
            compact ? 'w-64' : 'w-full min-w-[200px]'
          )}
          data-testid="sidebar-profile-menu"
          role="dialog"
          aria-label="Menu profil"
        >
          <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-lg font-black text-white">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900 dark:text-white">{user.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                  <Shield className="h-3 w-3" />
                  {user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {tenant && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{tenant.name}</span>
              </p>
            )}
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmLogout(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              data-testid="sidebar-logout-btn"
            >
              <LogOut className="h-4 w-4" />
              Keluar dari akun
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
        title="Konfirmasi Keluar"
        size="sm"
        data-testid="logout-confirm-modal"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmLogout(false)}
              disabled={loggingOut}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? 'Keluar...' : 'Ya, Keluar'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Anda akan keluar dari <strong>{tenant?.name ?? 'STAY'}</strong> sebagai{' '}
          <strong>{user.name}</strong>. Lanjutkan?
        </p>
      </Modal>
    </div>
  );
}
