import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FolderOpen, Wallet, Settings, Bell, Menu, X,
  Sparkles, Wifi, WifiOff, Clock, Users, Calculator,
  BarChart3, Shield, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { isPlatformAdmin } from '../services/adminService';
import { showWorkerShell, canAccessManagerFeatures } from '../utils/platformUi';
import CommandModal from './CommandModal';
import NotificationPanel from './NotificationPanel';
import PreviewModeMenu from './layout/PreviewModeMenu';
import { MonefyiLogo } from './MonefyiLogo';
import ToastHost from './ToastHost';
import UndoToast from './ui/UndoToast';
import { loadFinanceVersion } from '../lib/financeVersion';
import { useOrgBrand } from '../hooks/useOrgBrand';
import { MONEFYI_BRAND } from '../lib/orgBrand';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const {
    user, tenant, activeTab, setActiveTab, financeVersion, setFinanceVersionPreference,
    syncStatus, pendingSyncCount, isOnline, lastSynced, unreadCount, commandModalOpen,
    setCommandModalOpen, sidebarOpen, setSidebarOpen, navSidebarCollapsed, toggleNavSidebarCollapsed,
    platformRole, uiViewMode,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadFinanceVersion(user.id)
      .then(setFinanceVersionPreference)
      .catch(() => setFinanceVersionPreference('v1'));
  }, [user?.id, setFinanceVersionPreference]);

  const { style: orgBrandStyle } = useOrgBrand(tenant?.brandColor);
  const isSuperAdmin = isPlatformAdmin(platformRole, user?.email);
  const isWorker = showWorkerShell(user?.role, platformRole, user?.email, uiViewMode);
  const canAccessHr = canAccessManagerFeatures(user?.role, platformRole, user?.email, uiViewMode);

  const ownerMobileTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'estimator', label: 'Estimator', icon: Calculator },
    { id: 'command', label: '✦', icon: Sparkles, special: true },
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

  const mobileTabs = isWorker ? workerTabs : ownerMobileTabs;

  const isTabActive = (tabId: string) => {
    if (tabId === 'estimator') return location.pathname.startsWith('/app/estimator');
    if (tabId === 'finance') {
      return activeTab === 'finance' || location.pathname.startsWith('/app/finance-v2');
    }
    if (tabId === 'home') {
      return activeTab === 'home' && !location.pathname.startsWith('/app/estimator') && !location.pathname.startsWith('/app/finance-v2');
    }
    return activeTab === tabId;
  };

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

  const navigationGuard = useUiStore(s => s.navigationGuard);

  const navigateToTab = async (tabId: string) => {
    if (navigationGuard) {
      const canLeave = await navigationGuard.promptLeave();
      if (!canLeave) return;
    }
    if (tabId === 'estimator') {
      setActiveTab('estimator');
      navigate('/app/estimator');
    } else if (tabId === 'finance' && financeVersion === 'v2') {
      setActiveTab('finance');
      navigate('/app/finance-v2');
    } else {
      navigate('/app');
      setActiveTab(tabId);
    }
    setSidebarOpen(false);
  };

  const handleNav = navigateToTab;

  const goSettingsTab = async (st: string) => {
    if (navigationGuard) {
      const canLeave = await navigationGuard.promptLeave();
      if (!canLeave) return;
    }
    setActiveTab('settings');
    navigate(`/app?tab=settings&st=${st}`);
    setSidebarOpen(false);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden org-branded" style={orgBrandStyle}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-100 shadow-sm z-30 transition-[width] duration-200 ${
          navSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <MonefyiLogo className="w-9 h-9 rounded-xl object-contain shadow-md" />
            <div>
              <div className="font-black text-slate-900 text-sm leading-tight">Monefyi</div>
              <div className="text-xs font-semibold" style={{ color: MONEFYI_BRAND.dark }}>Planner</div>
            </div>
          </div>
          {tenant && (
            <div className="mt-3 px-2 py-1.5 bg-org-soft border border-org-soft rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                {tenant.logo ? (
                  <img src={tenant.logo} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded bg-org-primary shrink-0 flex items-center justify-center text-[10px] font-bold text-org-on-primary">
                    {tenant.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate">{tenant.name}</div>
                  <div className="text-xs text-slate-600 capitalize">{tenant.plan} plan</div>
                </div>
              </div>
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
                isTabActive(item.id)
                  ? 'bg-org-soft text-org-dark shadow-sm border border-org-soft'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 ${isTabActive(item.id) ? 'text-org-primary' : 'text-slate-600'}`} />
              {item.label}
              {item.id === 'home' && unreadCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Monefyi AI */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCommandModalOpen(true)}
            className="hidden lg:flex w-full h-12 rounded-xl items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all relative"
            style={{ background: `linear-gradient(135deg, ${MONEFYI_BRAND.primary}, ${MONEFYI_BRAND.dark})` }}
            aria-label="Buka Monefyi AI"
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white">Monefyi AI</span>
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-md flex items-center justify-center">
                {pendingSyncCount}
              </span>
            )}
          </button>
        </div>
      </aside>

      {navSidebarCollapsed && (
        <button
          type="button"
          onClick={toggleNavSidebarCollapsed}
          className="hidden lg:flex fixed left-2 top-[4.5rem] z-40 p-2 rounded-xl bg-white border border-slate-200 shadow-md text-slate-600 hover:text-emerald-600 hover:border-emerald-200"
          title="Tampilkan menu"
          aria-label="Tampilkan menu navigasi"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

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
                  <MonefyiLogo className="w-9 h-9 rounded-xl object-contain" />
                  <div>
                    <div className="font-black text-slate-900">Monefyi</div>
                    <div className="text-xs text-emerald-600 font-semibold">Planner</div>
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
                      isTabActive(item.id)
                        ? 'bg-org-soft text-org-dark'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>

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
              type="button"
              onClick={toggleNavSidebarCollapsed}
              className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title={navSidebarCollapsed ? 'Tampilkan menu' : 'Sembunyikan menu'}
              aria-label={navSidebarCollapsed ? 'Tampilkan menu navigasi' : 'Sembunyikan menu navigasi'}
            >
              {navSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
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
              <MonefyiLogo className="w-7 h-7 rounded-lg object-contain" />
              <span className="font-bold text-slate-900 text-sm">Monefyi</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status — desktop & tablet */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${sync.bg} ${sync.textColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${sync.color}`} />
              <span className="hidden sm:block">{sync.text}</span>
              <span className="hidden lg:inline text-slate-600 font-normal">· {lastSyncText}</span>
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

            {isSuperAdmin && <PreviewModeMenu />}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                aria-label="Super Admin"
                title="Super Admin"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => goSettingsTab('organisasi')}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Pengaturan organisasi"
              title="Pengaturan organisasi"
            >
              <Settings className="w-5 h-5 text-slate-600" />
            </button>

            <button
              type="button"
              onClick={() => goSettingsTab('profil')}
              className="w-8 h-8 rounded-full bg-org-primary flex items-center justify-center text-org-on-primary text-xs font-bold shrink-0"
              aria-label="Profil saya"
              title={user?.name || 'Profil'}
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
            {mobileTabs.map((tab) => (
              tab.special ? (
                <button
                  key={tab.id}
                  onClick={() => setCommandModalOpen(true)}
                  className="relative -mt-6 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-300/50 animate-breathe relative">
                    <Sparkles className="w-6 h-6 text-white" />
                    {pendingSyncCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {pendingSyncCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 font-bold mt-1">Monefyi</span>
                </button>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => handleNav(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors duration-150 border-b-2 ${
                    isTabActive(tab.id)
                      ? 'text-emerald-600 border-emerald-600'
                      : 'text-slate-600 border-transparent hover:text-slate-800'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className={`text-[10px] font-semibold ${isTabActive(tab.id) ? 'font-bold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              )
            ))}
          </div>
        </nav>
      </div>

      {/* Command Modal */}
      <AnimatePresence>
        {commandModalOpen && <CommandModal />}
      </AnimatePresence>
      <ToastHost />
      <UndoToast />
    </div>
  );
}
