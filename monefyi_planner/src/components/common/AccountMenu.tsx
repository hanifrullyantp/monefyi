import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Home,
  FolderOpen,
  Database,
  Receipt,
  Wallet,
  Users,
  Eye,
  Shield,
  Settings,
  Send,
  Sliders,
} from 'lucide-react';

export type AccountMenuTab =
  | 'home'
  | 'projects'
  | 'database'
  | 'estimator'
  | 'finance'
  | 'hr';

type Props = {
  open: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: AccountMenuTab) => void;
  userName?: string;
  userRole?: string;
  tenantName?: string;
  isSuperAdmin?: boolean;
  uiViewMode?: 'auto' | 'owner' | 'worker';
  onOpenPreviewMode?: () => void;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onOpenTelegramSettings?: () => void;
  onOpenFullSettings?: () => void;
  onLogout?: () => void;
  isOnline?: boolean;
  isEstimator?: boolean;
};

export default function AccountMenu({
  open,
  onClose,
  activeTab,
  onSelectTab,
  userName = 'User',
  userRole = 'Pemilik',
  tenantName = 'Monefyi',
  isSuperAdmin = false,
  uiViewMode = 'auto',
  onOpenPreviewMode,
  onOpenAdmin,
  onOpenSettings,
  onOpenTelegramSettings,
  onOpenFullSettings,
  onLogout,
  isOnline = true,
  isEstimator = false,
}: Props) {
  const initial = userName.charAt(0).toLowerCase() || 'u';

  const menuItems = [
    { id: 'home' as const, label: 'Dashboard', icon: Home },
    { id: 'projects' as const, label: 'Proyek', icon: FolderOpen },
    { id: 'database' as const, label: 'Database', icon: Database },
    { id: 'estimator' as const, label: 'Estimator', icon: Receipt },
    { id: 'finance' as const, label: 'Keuangan Bisnis', icon: Wallet },
    { id: 'hr' as const, label: 'HR & Karyawan', icon: Users },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-[318px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#E5EAE8] flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl text-white font-extrabold text-xl flex items-center justify-center shrink-0 ${
                  isEstimator ? 'bg-[#157F5F]' : 'bg-[#059669]'
                }`}
              >
                {isEstimator ? 'E' : 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-extrabold text-[#0F172A] truncate">
                  {isEstimator ? 'Estimator' : 'Planner'}
                </div>
                <div
                  className={`text-[11px] font-bold ${
                    isOnline ? 'text-[#047857]' : 'text-slate-500'
                  }`}
                >
                  {isOnline ? '● Online · tersinkron' : '○ Offline'}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup menu"
                className="w-11 h-11 border-0 bg-transparent flex items-center justify-center p-0 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable menu content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Menu Utama */}
              <div>
                <div className="text-[10px] font-extrabold text-[#8A99A6] tracking-[0.08em] px-2.5 py-1">
                  MENU UTAMA
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {menuItems.map(item => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`min-h-[46px] w-full rounded-xl flex items-center gap-3 px-3 text-sm transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-[#064E3B] to-[#047857] text-white font-bold shadow-sm'
                            : 'text-[#334155] font-semibold hover:bg-[#F4F7F5]'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Akun & Alat */}
              <div>
                <div className="text-[10px] font-extrabold text-[#8A99A6] tracking-[0.08em] px-2.5 py-1">
                  AKUN & ALAT
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPreviewMode?.();
                      onClose();
                    }}
                    className="min-h-[52px] w-full rounded-xl flex items-center justify-between gap-3 px-3 py-1.5 text-left text-[#334155] hover:bg-[#F4F7F5] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Eye className="w-5 h-5 shrink-0 text-emerald-600" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#0F172A]">Mode Pratinjau Admin</div>
                        <div className="text-[11px] text-[#5B6B7A] truncate">
                          Ganti peran tampilan (Auto/Owner/Worker)
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase shrink-0">
                      {uiViewMode}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenTelegramSettings) {
                        onOpenTelegramSettings();
                      } else {
                        onOpenSettings?.();
                      }
                      onClose();
                    }}
                    className="min-h-[52px] w-full rounded-xl flex items-center gap-3 px-3 py-1.5 text-left text-[#334155] hover:bg-[#F4F7F5] transition-colors"
                  >
                    <Send className="w-5 h-5 shrink-0 text-sky-600" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-[#0F172A] flex items-center gap-1.5">
                        <span>Pengaturan Telegram & Bot</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">Bot</span>
                      </div>
                      <div className="text-[11px] text-[#5B6B7A] truncate">
                        Bot Token, Chat ID & Notifikasi
                      </div>
                    </div>
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdmin?.();
                        onClose();
                      }}
                      className="min-h-[52px] w-full rounded-xl flex items-center gap-3 px-3 py-1.5 text-left text-[#334155] hover:bg-[#F4F7F5] transition-colors"
                    >
                      <Shield className="w-5 h-5 shrink-0 text-amber-600" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0F172A]">Super Admin</div>
                        <div className="text-[11px] text-[#5B6B7A] truncate">
                          Kendali platform & marketing
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings?.();
                      onClose();
                    }}
                    className="min-h-[52px] w-full rounded-xl flex items-center gap-3 px-3 py-1.5 text-left text-[#334155] hover:bg-[#F4F7F5] transition-colors"
                  >
                    <Settings className="w-5 h-5 shrink-0 text-slate-600" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-[#0F172A]">Pengaturan Estimator</div>
                      <div className="text-[11px] text-[#5B6B7A] truncate">
                        PDF, branding, WA & pembayaran
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenFullSettings) {
                        onOpenFullSettings();
                      } else {
                        onOpenSettings?.();
                      }
                      onClose();
                    }}
                    className="min-h-[52px] w-full rounded-xl flex items-center gap-3 px-3 py-1.5 text-left text-[#334155] hover:bg-[#F4F7F5] transition-colors"
                  >
                    <Sliders className="w-5 h-5 shrink-0 text-indigo-600" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-[#0F172A]">Pengaturan Lengkap</div>
                      <div className="text-[11px] text-[#5B6B7A] truncate">
                        Organisasi, AI provider & domain
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* User profile card & Keluar */}
            <div className="border-t border-[#E5EAE8] p-4 flex items-center gap-2.5 bg-white shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#1D4ED8] text-white font-bold text-base flex items-center justify-center shrink-0 capitalize">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-[#0F172A] truncate">{userName}</div>
                <div className="text-[11px] text-[#5B6B7A] truncate">
                  {userRole} {tenantName ? `· ${tenantName}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="h-11 px-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] text-[#9F1239] font-bold text-xs hover:bg-rose-100 active:scale-95 transition-all shrink-0 flex items-center justify-center"
              >
                Keluar
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

