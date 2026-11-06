import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FolderOpen, Wallet, Settings, Bell, Menu, X, ArrowLeft,
  Sparkles, Wifi, WifiOff, Clock, Users, Receipt,
  BarChart3, Shield, ChevronRight, Database, PanelRightClose, PanelRight, Lock, User,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { isPlatformAdmin } from '../services/adminService';
import { showWorkerShell, canAccessManagerFeatures } from '../utils/platformUi';
import { AppHeader, AccountMenu, BottomNav } from './common';
import CommandModal from './CommandModal';
import NotificationPanel from './NotificationPanel';
import PreviewModeMenu from './layout/PreviewModeMenu';
import EntitlementPreviewPanel from './layout/EntitlementPreviewPanel';
import { PlannerLogo } from './MonefyiLogo';
import { EstimatorLogo } from './EstimatorLogo';
import { shouldShowEstimatorProductBrand } from '../lib/appProductBrand';
import { ESTIMATOR_THEME_COLOR } from '../lib/estimatorBrand';
import ToastHost from './ToastHost';
import EstimatorLaunchPromoAdminModal from './admin/EstimatorLaunchPromoAdminModal';
import UndoToast from './ui/UndoToast';
import { loadFinanceVersion } from '../lib/financeVersion';
import { loadMigrationFlags } from '../lib/migrationFlags';
import { DEFAULT_MIGRATION_FLAGS } from '../types/rpp';
import { useOrgBrand } from '../hooks/useOrgBrand';
import { MONEFYI_BRAND } from '../lib/orgBrand';
import RightPanel from './layout/RightPanel';
import { useShellStore } from '../store/shellStore';
import { useEntitlement } from '../hooks/useEntitlement';
import UpgradeModal from './entitlement/UpgradeModal';
import type { UpgradeModalTrigger } from '../types/entitlement';
import { analytics } from '../lib/analytics/events';
import { applyEstimatorDocumentBrand } from '../lib/estimatorBrand';
import { isAdminFullAccess, canAccessPlannerNavModule, plannerNavModuleLabel, isEstimatorOnlyPlan, type PlannerNavModule } from '../lib/entitlement';
import UserMenuDropdown from './estimator/shell/UserMenuDropdown';
import EstimatorBottomNavItem from './estimator/shell/EstimatorBottomNavItem';
import CustomerSupportWidget from './common/CustomerSupportWidget';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const {
    user, tenant, activeTab, setActiveTab, setFinanceVersionPreference,
    migrationFlags, setMigrationFlags,
    syncStatus, pendingSyncCount, isOnline, lastSynced, unreadCount, commandModalOpen,
    setCommandModalOpen, sidebarOpen, setSidebarOpen, navSidebarCollapsed, toggleNavSidebarCollapsed,
    rightPanelHidden, toggleRightPanelHidden,
    platformRole, uiViewMode, setUiViewMode, entitlementPreviewMode,
    selectedProjectId, logout,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<UpgradeModalTrigger>('pro_feature');
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | undefined>();
  const entitlement = useEntitlement();
  const { isLoading: entitlementLoading } = entitlement;

  useEffect(() => {
    if (!user?.id) return;
    loadFinanceVersion(user.id)
      .then(setFinanceVersionPreference)
      .catch(() => setFinanceVersionPreference('v3'));
    loadMigrationFlags(user.id)
      .then(setMigrationFlags)
      .catch(() => setMigrationFlags({ ...DEFAULT_MIGRATION_FLAGS }));
  }, [user?.id, setFinanceVersionPreference, setMigrationFlags]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setMigrationFlags(detail);
    };
    window.addEventListener('monefyi:migration-flags-changed', handler);
    return () => window.removeEventListener('monefyi:migration-flags-changed', handler);
  }, [setMigrationFlags]);

  const { style: orgBrandStyle } = useOrgBrand(tenant?.brandColor);
  const isSuperAdmin = isPlatformAdmin(platformRole, user?.email);
  const adminFullAccess = isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode);
  const estimatorOnly = !adminFullAccess && isEstimatorOnlyPlan(entitlement);
  const isWorker = showWorkerShell(user?.role, platformRole, user?.email, uiViewMode);
  const canAccessHr = canAccessManagerFeatures(user?.role, platformRole, user?.email, uiViewMode);
  const isEstimatorShell = location.pathname.startsWith('/app/estimator');
  const hideMobileProductNav = estimatorOnly && isEstimatorShell;
  const showEstimatorBrand =
    !adminFullAccess && shouldShowEstimatorProductBrand(entitlement);

  useEffect(() => {
    if (entitlementLoading) return;
    applyEstimatorDocumentBrand(showEstimatorBrand);
    return () => {
      if (showEstimatorBrand) applyEstimatorDocumentBrand(false);
    };
  }, [showEstimatorBrand, entitlementLoading]);

  const ownerMobileTabs = estimatorOnly
    ? [
      { id: 'projects', label: 'Proyek', icon: FolderOpen },
      { id: 'estimator', label: 'Estimator', icon: Receipt },
    ]
    : [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'projects', label: 'Proyek', icon: FolderOpen },
      { id: 'command', label: '✦', icon: Sparkles, special: true },
      { id: 'estimator', label: 'Estimator', icon: Receipt },
      { id: 'finance', label: 'Finance', icon: Wallet },
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
    if (tabId === 'projects') {
      return activeTab === 'projects' || location.pathname.startsWith('/app/projects/');
    }
    if (tabId === 'estimator') return location.pathname.startsWith('/app/estimator');
    if (tabId === 'finance') {
      return activeTab === 'finance' || location.pathname.startsWith('/app/finance-v2');
    }
    if (tabId === 'database') {
      return location.pathname.startsWith('/app/database');
    }
    if (tabId === 'home') {
      return activeTab === 'home'
        && !location.pathname.startsWith('/app/estimator')
        && !location.pathname.startsWith('/app/finance-v2')
        && !location.pathname.startsWith('/app/database');
    }
    return activeTab === tabId;
  };

  const ownerSidebarItems = estimatorOnly
    ? [
      { id: 'projects', label: 'Proyek', icon: FolderOpen },
      { id: 'estimator', label: 'Estimator', icon: Receipt },
    ]
    : [
      { id: 'home', label: 'Dashboard', icon: Home },
      { id: 'projects', label: 'Proyek', icon: FolderOpen },
      { id: 'database', label: 'Database', icon: Database },
      { id: 'estimator', label: 'Estimator', icon: Receipt },
      { id: 'finance', label: 'Keuangan Bisnis', icon: Wallet },
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

  const openUpgrade = (trigger: UpgradeModalTrigger, featureName?: string) => {
    setUpgradeTrigger(trigger);
    setUpgradeFeatureName(featureName);
    setUpgradeOpen(true);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ trigger?: UpgradeModalTrigger; featureName?: string }>).detail;
      openUpgrade(detail?.trigger ?? 'pro_feature', detail?.featureName);
    };
    window.addEventListener('monefyi:open-upgrade', handler);
    return () => window.removeEventListener('monefyi:open-upgrade', handler);
  }, []);

  const isNavLocked = (tabId: string) => {
    if (adminFullAccess || entitlementLoading) return false;
    const module = tabId as PlannerNavModule;
    if (['home', 'projects', 'database', 'estimator', 'finance', 'hr'].includes(tabId)) {
      return !canAccessPlannerNavModule(entitlement, module);
    }
    return false;
  };

  const navigateToTab = async (tabId: string) => {
    if (navigationGuard) {
      const canLeave = await navigationGuard.promptLeave();
      if (!canLeave) return;
    }

    const plannerModule = tabId as PlannerNavModule;
    if (
      !adminFullAccess
      && ['home', 'projects', 'database', 'estimator', 'finance', 'hr'].includes(tabId)
      && !canAccessPlannerNavModule(entitlement, plannerModule)
    ) {
      if (tabId === 'estimator' && !entitlement.isEstimator) {
        openUpgrade('estimator_paywall', plannerNavModuleLabel(plannerModule));
      } else {
        analytics.proFeatureClicked({ featureName: plannerNavModuleLabel(plannerModule) });
        openUpgrade('pro_feature', plannerNavModuleLabel(plannerModule));
      }
      setSidebarOpen(false);
      return;
    }

    if (tabId === 'estimator') {
      setActiveTab('estimator');
      navigate('/app/estimator');
    } else if (tabId === 'database') {
      setActiveTab('database');
      navigate('/app/database');
    } else if (tabId === 'finance') {
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
    if (estimatorOnly) {
      openUpgrade('pro_feature', 'Pengaturan');
      return;
    }
    setActiveTab('settings');
    navigate(`/app?tab=settings&st=${st}`);
    setSidebarOpen(false);
  };

  const openCommandModal = () => {
    if (estimatorOnly) {
      openUpgrade('pro_feature', 'Monefyi AI');
      return;
    }
    setCommandModalOpen(true);
  };

  const getSyncIndicator = () => {
    switch (syncStatus) {
      case 'synced': return { color: 'bg-emerald-500', text: 'Tersinkron', textColor: 'text-emerald-700', bg: 'bg-emerald-50' };
      case 'syncing': return { color: 'bg-amber-500 animate-pulse', text: 'Menyinkron...', textColor: 'text-amber-700', bg: 'bg-amber-50' };
      case 'offline': return { color: 'bg-slate-400', text: `Offline${pendingSyncCount > 0 ? ` · ${pendingSyncCount} item` : ''}`, textColor: 'text-slate-600', bg: 'bg-slate-100/80' };
      case 'error': return { color: 'bg-rose-500', text: 'Sync error', textColor: 'text-rose-700', bg: 'bg-rose-50' };
    }
  };

  const sync = getSyncIndicator();
  const lastSyncText = lastSynced ? `${Math.floor((Date.now() - lastSynced.getTime()) / 60000)} mnt lalu` : 'Belum pernah';

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Profil saya',
      icon: <User className="w-4 h-4 shrink-0" />,
      onClick: () => goSettingsTab('profil'),
    },
    ...(isEstimatorShell ? [{
      id: 'estimator-settings',
      label: 'Pengaturan Estimator',
      icon: <Settings className="w-4 h-4 shrink-0" />,
      onClick: () => navigate('/app/estimator/settings'),
    }] : []),
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: <Settings className="w-4 h-4 shrink-0" />,
      onClick: () => goSettingsTab('organisasi'),
    },
    ...(isSuperAdmin ? [{
      id: 'admin',
      label: 'Super Admin',
      icon: <Shield className="w-4 h-4 shrink-0" />,
      onClick: () => navigate('/admin'),
    }] : []),
  ];

  const showRightPanel =
    /^\/app\/projects\/[^/]+$/.test(location.pathname)
    || location.pathname.startsWith('/app/finance-v2')
    || location.pathname.startsWith('/app/database');

  const {
    breadcrumb,
    projectId: shellProjectId,
    hideRightPanel,
    onOpenRap,
    onOpenProgress,
    estimatorCode,
    onEstimatorBack,
  } = useShellStore();
  const isEstimatorDetail = /^\/app\/estimator\/(?!pricelist(?:\/|$)|settings(?:\/|$)).+/.test(location.pathname);
  const isProjectDetail = /^\/app\/projects\/[^/]+$/.test(location.pathname) || (activeTab === 'projects' && Boolean(selectedProjectId));

  const headerTitle = (() => {
    if (breadcrumb.length > 0) {
      return breadcrumb.map((b, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className={i === breadcrumb.length - 1 ? 'text-slate-800' : 'text-slate-500'}>{b.label}</span>
        </span>
      ));
    }
    if (location.pathname.startsWith('/app/finance-v2')) return 'Keuangan Bisnis';
    if (location.pathname.startsWith('/app/database')) return 'Database Master';
    const title = activeTab === 'home' ? 'Dashboard'
      : activeTab === 'projects' ? 'Manajemen Proyek'
        : activeTab === 'estimator' ? 'Estimator'
          : activeTab === 'finance' ? 'Keuangan'
            : activeTab === 'hr' ? 'HR & Karyawan'
              : activeTab === 'settings' ? 'Pengaturan' : activeTab;
    return title;
  })();

  return (
    <div className="flex h-screen overflow-hidden org-branded" style={orgBrandStyle}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shell-sidebar z-30 transition-[width] duration-200 shrink-0 ${
          navSidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
      >
        {/* Logo + collapse + Monefyi AI */}
        <div className={`${navSidebarCollapsed ? 'px-2 py-3' : 'p-4'}`}>
          <div className={`flex items-center gap-2 ${navSidebarCollapsed ? 'flex-col' : ''}`}>
            {showEstimatorBrand ? (
              <EstimatorLogo className="rounded-xl object-contain shadow-xs shrink-0 w-9 h-9" />
            ) : (
              <PlannerLogo
                className={`rounded-xl object-contain shadow-xs shrink-0 ${
                  navSidebarCollapsed ? 'w-9 h-9' : 'w-9 h-9'
                }`}
              />
            )}
            {!navSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div
                  className="font-black text-sm leading-tight text-[#0F172A]"
                >
                  {showEstimatorBrand ? 'Estimator' : 'Planner'}
                </div>
                <div className="text-[11px] text-[#5B6B7A] font-medium truncate">Monefyi Workspace</div>
              </div>
            )}
            <button
              type="button"
              onClick={toggleNavSidebarCollapsed}
              className={`p-1.5 min-h-11 min-w-11 flex items-center justify-center rounded-xl text-[#5B6B7A] hover:bg-[#F4F7F5] hover:text-[#0F172A] transition-colors shrink-0 ${
                navSidebarCollapsed ? 'mt-1' : ''
              }`}
              title={navSidebarCollapsed ? 'Perluas menu' : 'Perkecil menu'}
              aria-label={navSidebarCollapsed ? 'Perluas menu navigasi' : 'Perkecil menu navigasi'}
            >
              <ChevronRight
                className={`w-5 h-5 transition-transform duration-200 ${
                  navSidebarCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={openCommandModal}
            className={`mt-3 relative flex items-center justify-center shadow-sm hover:opacity-95 transition-all ${
              navSidebarCollapsed
                ? 'w-11 h-11 mx-auto rounded-xl'
                : 'w-full h-11 rounded-xl gap-2'
            }`}
            style={{ background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)' }}
            aria-label="Buka Monefyi AI"
            title="Monefyi AI"
          >
            <Sparkles className="w-5 h-5 text-white shrink-0" />
            {!navSidebarCollapsed && (
              <span className="text-sm font-bold text-white">Monefyi AI</span>
            )}
            {pendingSyncCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
              </span>
            )}
          </button>

          {tenant && !navSidebarCollapsed && (
            <div className="mt-3 px-3 py-2 bg-[#F4F7F5] border border-[#E5EAE8] rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                {tenant.logo ? (
                  <img src={tenant.logo} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-[#059669] shrink-0 flex items-center justify-center text-[11px] font-bold text-white">
                    {tenant.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#0F172A] truncate">{tenant.name}</div>
                  <div className="text-[10px] text-[#5B6B7A] capitalize font-medium">{tenant.plan} plan</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className={`flex-1 overflow-y-auto space-y-1 ${navSidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              title={navSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl text-sm transition-all relative ${
                navSidebarCollapsed
                  ? 'justify-center p-2.5 min-h-11'
                  : 'gap-3 px-3.5 py-2.5 min-h-11'
              } ${
                isTabActive(item.id)
                  ? 'bg-emerald-50 text-[#047857] font-bold border border-emerald-200 shadow-xs'
                  : 'text-[#5B6B7A] font-medium hover:bg-[#F4F7F5] hover:text-[#0F172A]'
              }`}
            >
              <item.icon className={`shrink-0 ${navSidebarCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'} ${
                isTabActive(item.id) ? 'text-[#059669]' : 'text-[#5B6B7A]'
              }`} />
              {!navSidebarCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {isNavLocked(item.id) && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
                  )}
                  {item.id === 'home' && unreadCount > 0 && (
                    <span className={`${isNavLocked(item.id) ? '' : 'ml-auto'} px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full`}>
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
              {navSidebarCollapsed && item.id === 'home' && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {isSuperAdmin && (
          <EntitlementPreviewPanel collapsed={navSidebarCollapsed} />
        )}
      </aside>

      {/* Mobile Drawer (Account Menu) */}
      <AccountMenu
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          handleNav(tab);
          setSidebarOpen(false);
        }}
        userName={user?.name || 'User'}
        userRole={user?.role === 'owner' ? 'Pemilik' : user?.role === 'manager' ? 'Manajer' : user?.role === 'admin' ? 'Admin' : 'Staff'}
        tenantName={tenant?.name || 'Monefyi'}
        isSuperAdmin={isSuperAdmin}
        onOpenPreviewMode={() => setPreviewSheetOpen(true)}
        onOpenAdmin={() => {
          navigate('/admin');
          setSidebarOpen(false);
        }}
        onOpenSettings={() => {
          if (isEstimatorShell) {
            navigate('/app/estimator/settings');
          } else {
            goSettingsTab('organisasi');
          }
          setSidebarOpen(false);
        }}
        onLogout={() => {
          setSidebarOpen(false);
          void logout();
        }}
        isOnline={isOnline}
        isEstimator={showEstimatorBrand}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header (Design System) */}
        {!isProjectDetail && !isEstimatorDetail && (
          <div className="lg:hidden">
            <AppHeader
              title={showEstimatorBrand ? 'Estimator' : 'Planner'}
              isEstimator={showEstimatorBrand}
              onOpenMenu={() => setSidebarOpen(true)}
              onOpenNotif={() => setNotifOpen(v => !v)}
              unreadCount={unreadCount}
              userName={user?.name}
              isOnline={isOnline}
            />
          </div>
        )}

        {/* Mobile Header for Estimator Detail */}
        {isEstimatorDetail && (
          <header className="lg:hidden flex-shrink-0 h-14 flex items-center justify-between px-3 bg-white border-b border-[#E5EAE8] z-20">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onEstimatorBack?.() ?? navigate('/app/estimator')}
                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-700 active:scale-95 transition-transform"
                aria-label="Kembali ke daftar estimasi"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {estimatorCode && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold font-mono truncate max-w-[12rem]">
                  {estimatorCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNotifOpen(v => !v)}
                aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} baru` : 'Notifikasi'}
                className="relative w-11 h-11 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="w-11 h-11 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Menu akun"
              >
                <span className="w-8 h-8 rounded-full bg-[#1D4ED8] text-white font-bold text-sm flex items-center justify-center capitalize">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </button>
            </div>
          </header>
        )}

        {/* Desktop Top Bar (Shared across all pages) */}
        <header className="hidden lg:flex shell-header px-6 h-14 items-center justify-between shrink-0 z-20">
          <div className="text-sm font-bold text-[#0F172A] capitalize flex items-center flex-wrap gap-1">
            {headerTitle}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              syncStatus === 'synced' ? 'bg-emerald-50 text-[#047857] border-emerald-200' :
              syncStatus === 'syncing' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              syncStatus === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${sync.color}`} />
              <span className="hidden sm:inline">{sync.text}</span>
              <span className="hidden lg:inline text-[#5B6B7A] font-normal">· {lastSyncText}</span>
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-[#047857]" /> : <WifiOff className="w-3.5 h-3.5 text-slate-500" />}
            </div>

            {showRightPanel && (
              <button
                type="button"
                onClick={toggleRightPanelHidden}
                className="hidden xl:flex w-10 h-10 items-center justify-center rounded-xl hover:bg-[#F4F7F5] text-[#5B6B7A] hover:text-[#0F172A] transition-colors"
                title={rightPanelHidden ? 'Tampilkan panel kanan' : 'Sembunyikan panel kanan'}
                aria-label={rightPanelHidden ? 'Tampilkan panel kanan' : 'Sembunyikan panel kanan'}
              >
                {rightPanelHidden
                  ? <PanelRight className="w-5 h-5 text-[#5B6B7A]" />
                  : <PanelRightClose className="w-5 h-5 text-[#5B6B7A]" />}
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(v => !v)}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F4F7F5] text-[#5B6B7A] hover:text-[#0F172A] transition-colors"
                aria-label="Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F4F7F5] text-[#5B6B7A] hover:text-[#0F172A] transition-colors"
                aria-label="Super Admin"
                title="Super Admin"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => goSettingsTab('organisasi')}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F4F7F5] text-[#5B6B7A] hover:text-[#0F172A] transition-colors"
              aria-label="Pengaturan organisasi"
              title="Pengaturan organisasi"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => goSettingsTab('profil')}
              className="w-8 h-8 ml-1 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs active:scale-95 transition-transform"
              aria-label="Profil saya"
              title={user?.name || 'Profil'}
            >
              {user?.name?.charAt(0) || 'U'}
            </button>
          </div>
        </header>

        {/* Mobile Notification Panel overlay */}
        <div className="lg:hidden">
          <AnimatePresence>
            {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
          </AnimatePresence>
        </div>

        {/* Page Content + Right Panel */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
          {showRightPanel && !hideRightPanel && !rightPanelHidden && (
            <RightPanel
              projectId={shellProjectId}
              onOpenRap={onOpenRap ?? undefined}
              onOpenProgress={onOpenProgress ?? undefined}
            />
          )}
          {showRightPanel && !hideRightPanel && rightPanelHidden && (
            <button
              type="button"
              onClick={toggleRightPanelHidden}
              className="hidden xl:flex fixed right-0 top-1/2 -translate-y-1/2 z-20 items-center gap-1 pl-2 pr-1.5 py-3 rounded-l-xl bg-white border border-r-0 border-slate-200 shadow-md text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              title="Tampilkan panel kanan"
              aria-label="Tampilkan panel kanan"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Navigation — Mobile (Estimator-only: sembunyikan di shell Estimator) */}
        {!hideMobileProductNav && !isProjectDetail && !isEstimatorDetail && (
          isWorker ? (
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-100 safe-bottom shrink-0 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-around h-16 px-2">
                {workerTabs.map((tab) => (
                  tab.special ? (
                    <button
                      key={tab.id}
                      onClick={openCommandModal}
                      className="relative -mt-6 flex flex-col items-center active:scale-95 transition-all duration-200"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-300/40 relative">
                        <Sparkles className="w-6 h-6 text-white" />
                        {pendingSyncCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {pendingSyncCount > 9 ? '9+' : pendingSyncCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-600 font-bold mt-1">Monefyi</span>
                    </button>
                  ) : (
                    <button
                      key={tab.id}
                      onClick={() => handleNav(tab.id)}
                      className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-all duration-200 rounded-xl active:scale-95 ${
                        isTabActive(tab.id)
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-slate-600 hover:text-slate-800'
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
          ) : (
            <BottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => handleNav(tab)}
              onOpenMonefyiAi={openCommandModal}
              pendingSyncCount={pendingSyncCount}
            />
          )
        )}
      </div>

      {/* Mobile Preview Mode Picker Sheet */}
      <AnimatePresence>
        {previewSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-xs"
              onClick={() => setPreviewSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-white rounded-t-2xl p-5 shadow-2xl z-10 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <div className="font-bold text-base text-[#0F172A]">Mode Pratinjau</div>
                  <div className="text-xs text-[#5B6B7A]">Lihat aplikasi dari perspektif peran berbeda</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSheetOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {([
                  { id: 'auto' as const, label: 'Otomatis (Sesuai peran akun)' },
                  { id: 'owner' as const, label: 'Pemilik (Owner)' },
                  { id: 'worker' as const, label: 'Pekerja Lapangan (Worker)' },
                ]).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setUiViewMode(m.id);
                      setPreviewSheetOpen(false);
                    }}
                    className={`min-h-[46px] w-full rounded-xl px-4 flex items-center justify-between text-sm transition-all ${
                      uiViewMode === m.id
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                        : 'text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>{m.label}</span>
                    {uiViewMode === m.id && <span className="text-emerald-600 font-extrabold text-xs">Aktif</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Command Modal */}
      <AnimatePresence>
        {commandModalOpen && <CommandModal />}
      </AnimatePresence>
      <ToastHost />
      <EstimatorLaunchPromoAdminModal />
      <UndoToast />
      <CustomerSupportWidget />
      <UpgradeModal
        open={upgradeOpen}
        trigger={upgradeTrigger}
        featureName={upgradeFeatureName}
        onClose={() => {
          setUpgradeOpen(false);
          setUpgradeFeatureName(undefined);
        }}
        onManageProjects={() => navigate('/app?tab=projects')}
      />
    </div>
  );
}
