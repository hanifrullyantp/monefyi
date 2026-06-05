import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FolderOpen, Wallet, Settings, Bell, Menu, X,
  Sparkles, Wifi, WifiOff, Clock, Users, Calculator,
  BarChart3, ChevronRight, LogOut, User, Shield, Building2,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { isPlatformAdmin } from '../services/adminService';
import { showWorkerShell, canAccessManagerFeatures } from '../utils/platformUi';
import CommandModal from './CommandModal';
import NotificationPanel from './NotificationPanel';
import ToastHost from './ToastHost';
import UndoToast from './ui/UndoToast';
import { loadFinanceVersion } from '../lib/financeVersion';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const {
    user, tenant, activeTab, setActiveTab, financeVersion, setFinanceVersionPreference,
    syncStatus, pendingSyncCount, isOnline, lastSynced, unreadCount, commandModalOpen,
    setCommandModalOpen, sidebarOpen, setSidebarOpen, logout, platformRole, uiViewMode,
    setUiViewMode,
  } = useAppStore();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadFinanceVersion(user.id)
      .then(setFinanceVersionPreference)
      .catch(() => setFinanceVersionPreference('v1'));
  }, [user?.id, setFinanceVersionPreference]);

  const isSuperAdmin = isPlatformAdmin(platformRole, user?.email);
  const isWorker = showWorkerShell(user?.role, platformRole, user?.email, uiViewMode);
  const canAccessHr = canAccessManagerFeatures(user?.role, platformRole, user?.email, uiViewMode);

  const ownerTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'projects', label: 'Proyek', icon: FolderOpen },
    { id: 'command', label: '✦', icon: Sparkles, special: true },
    { id: 'estimator', label: 'Estimator', icon: Calculator },
    { id: 'finance', label: 'Finance', icon: Wallet },
    ...(canAccessHr ? [{ id: 'hr', label: 'HR', icon: Users }] : []),
  ];

  const workerTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Absensi', icon: Clock },
    { id: 'command', label: '✦', icon: Sparkles, special: true },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'todos', label: 'Todolist', icon: BarChart3 },
  ];

  const tabs = isWorker ? workerTabs : ownerTabs;

  const ownerSidebarItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'projects', label: 'Proyek', icon: FolderOpen },
    { id: 'estimator', label: 'Estimator', icon: Calculator },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
    ...(canAccessHr
      ? [{ id: 'hr', label: 'HR & Karyawan', icon: Users }]
      : []),
  ];

  const workerSidebarItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Absensi', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'todos', label: 'Todo', icon: BarChart3 },
  ];

  const sidebarItems = isWorker ? workerSidebarItems : ownerSidebarItems;

  const navigateToTab = (tabId: string) => {
    if (tabId === 'estimator') {
      navigate('/app/estimator');
    } else if (tabId === 'finance' && financeVersion === 'v2') {
      navigate('/app/finance-v2');
    } else {
      navigate('/app');
      setActiveTab(tabId);
    }
    setSidebarOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
  };

  const handleNav = navigateToTab;

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const getSyncIndicator = () => {
    switch (syncStatus) {
      case 'synced': return { color: 'bg-emerald-500', text: 'Tersinkron', textColor: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
      case 'syncing': return { color: 'bg-amber-500 animate-pulse', text: 'Menyinkron...', textColor: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
      case 'offline': return { color: 'bg-slate-400', text: `Offline${pendingSyncCount > 0 ? ` · ${pendingSyncCount} item` : ''}`, textColor: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };
      case 'error': return { color: 'bg-rose-500', text: 'Sync error', textColor: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' };
    }
  };

  const sync = getSyncIndicator();
  const lastSyncText = lastSynced ? `${Math.floor((Date.now() - lastSynced.getTime()) / 60000)} mnt lalu` : 'Belum pernah';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm z-30">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-sm leading-tight">Monefyi</div>
              <div className="text-xs text-indigo-600 font-semibold">Planner</div>
            </div>
          </div>
          {tenant && (
            <div className="mt-3 px-2 py-1.5 bg-slate-50 rounded-lg">
              <div className="text-xs font-medium text-slate-700 truncate">{tenant.name}</div>
              <div className="text-xs text-slate-400 capitalize">{tenant.plan} plan</div>
            </div>
          )}
          {isSuperAdmin && (
            <div className="mt-3 p-2.5 bg-violet-50 border border-violet-100 rounded-xl">
              <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-2">Preview mode</div>
              <div className="flex gap-1">
                {([
                  { id: 'auto' as const, label: 'Auto' },
                  { id: 'owner' as const, label: 'Owner' },
                  { id: 'worker' as const, label: 'Worker' },
                ]).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setUiViewMode(m.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg ${
                      uiViewMode === m.id ? 'bg-violet-600 text-white' : 'bg-white text-violet-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 rounded-lg"
              >
                <Shield className="w-3.5 h-3.5" /> Super Admin
              </button>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 ${activeTab === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
              {item.id === 'home' && unreadCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sync Status */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${sync.bg} mb-3`}>
            <div className={`w-2 h-2 rounded-full ${sync.color}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${sync.textColor}`}>{sync.text}</div>
              <div className="text-xs text-slate-400 truncate">{lastSyncText}</div>
            </div>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-slate-400" /> : <WifiOff className="w-3.5 h-3.5 text-slate-400" />}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.name.charAt(0) || 'U'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{user?.name}</div>
                <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-slate-100">
                    <div className="font-medium text-slate-800 text-sm">{user?.name}</div>
                    <div className="text-xs text-slate-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => navigateToTab('settings')}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4" /> Pengaturan
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" /> Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl lg:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">Monefyi</div>
                    <div className="text-xs text-indigo-600 font-semibold">Planner</div>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="glass border-b border-slate-200 px-4 lg:px-6 h-14 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 lg:hidden transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="hidden lg:block">
              <div className="text-sm font-semibold text-slate-800 capitalize">
                {activeTab === 'home' ? 'Dashboard' :
                  activeTab === 'projects' ? 'Manajemen Proyek' :
                    activeTab === 'estimator' ? 'Estimator' :
                      activeTab === 'finance' ? 'Keuangan' :
                        activeTab === 'hr' ? 'HR & Karyawan' :
                          activeTab === 'settings' ? 'Pengaturan' : activeTab}
              </div>
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm">Monefyi</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status - Mobile */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${sync.bg} ${sync.textColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${sync.color}`} />
              <span className="hidden md:block">{sync.text}</span>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
              </AnimatePresence>
            </div>

            {/* Settings gear */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen(v => !v)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                aria-label="Pengaturan"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>
              <AnimatePresence>
                {settingsOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40"
                      aria-label="Tutup menu"
                      onClick={() => setSettingsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" /> Pengaturan
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToTab('settings')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <User className="w-4 h-4" /> Profil Saya
                      </button>
                      {canAccessHr && (
                        <button
                          type="button"
                          onClick={() => navigateToTab('hr')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Building2 className="w-4 h-4" /> Organisasi
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigateToTab('settings')}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Bell className="w-4 h-4" /> Notifikasi
                      </button>
                      <div className="border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => { setSettingsOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-4 h-4" /> Keluar
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Avatar */}
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold hidden lg:flex"
              aria-label="Profil"
            >
              {user?.name.charAt(0) || 'U'}
            </button>
            <button
              type="button"
              onClick={() => navigateToTab('settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold lg:hidden"
              aria-label="Profil"
            >
              {user?.name.charAt(0) || 'U'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Navigation — Mobile */}
        <nav className="lg:hidden border-t border-slate-200 bg-white safe-bottom shrink-0">
          <div className="flex items-end justify-around px-2 pt-2 pb-3">
            {tabs.map((tab) => (
              tab.special ? (
                <button
                  key={tab.id}
                  onClick={() => setCommandModalOpen(true)}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-300/50 animate-breathe relative">
                    <Sparkles className="w-6 h-6 text-white" />
                    {pendingSyncCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {pendingSyncCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-indigo-600 font-bold mt-1">Monefyi</span>
                </button>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => handleNav(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors duration-150 border-b-2 ${
                    activeTab === tab.id
                      ? 'text-indigo-600 border-indigo-600'
                      : 'text-slate-400 border-transparent hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className={`text-[10px] font-semibold ${activeTab === tab.id ? 'font-bold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              )
            ))}
          </div>
        </nav>
      </div>

      {/* Monefyi Button — Desktop FAB */}
      <button
        onClick={() => setCommandModalOpen(true)}
        className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center shadow-2xl shadow-indigo-300/50 hover:scale-110 transition-all z-30 animate-breathe"
      >
        <Sparkles className="w-6 h-6 text-white" />
        {pendingSyncCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {pendingSyncCount}
          </span>
        )}
      </button>

      {/* Command Modal */}
      <AnimatePresence>
        {commandModalOpen && <CommandModal />}
      </AnimatePresence>
      <ToastHost />
      <UndoToast />
    </div>
  );
}
