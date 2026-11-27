import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Globe, LogOut, Edit3, Check, Building2, Bell, Shield,
  Info, RefreshCw, Loader2, ChevronRight, Lock, Users, Wifi, WifiOff, Sparkles, Wallet,
  CreditCard, FlaskConical, Bot, Bug, FileSpreadsheet,
} from 'lucide-react';
import { setActiveOrgTimeZone } from '../lib/adapters';
import { useAppStore } from '../store/appStore';
import { showToast, useUiStore } from '../store/uiStore';
import { updateProfileName, loadProfileWithSettings, updateProfileSettings } from '../services/profileService';
import { loadOrgDetails, updateOrgFields, mergeOrgSettingsJson } from '../services/orgService';
import { signOutGlobal, updatePassword } from '../services/authService';
import { validatePassword } from '../lib/validators';
import {
  loadNotificationPrefs, saveNotificationPrefs, fetchNotificationPrefsFromSupabase, type NotificationPrefs,
} from '../services/settingsPrefsService';
import UserAccountPanel from '../components/account/UserAccountPanel';
import BrandIdentityPanel from '../components/branding/BrandIdentityPanel';
import { syncPdfBrandFromOrg } from '../services/pdfSettingsService';
import { isPlatformAdmin } from '../services/adminService';
import { Link } from 'react-router-dom';
import { loadFinanceVersion, setFinanceVersion, isSandboxFinance } from '../lib/financeVersion';
import type { FinanceVersion } from '../types/financeV2';
import MigrationDeveloperPanel from '../components/settings/MigrationDeveloperPanel';
import FinanceIntegrationPanel from '../components/finance-v2/FinanceIntegrationPanel';
import UpgradePlansPanel from '../components/settings/UpgradePlansPanel';
import CustomDomainPanel from '../components/settings/CustomDomainPanel';
import TelegramLinkPanel from '../components/settings/TelegramLinkPanel';
import FieldCoordinationPanel from '../components/settings/FieldCoordinationPanel';
import EstimatorSettingsPanel from '../components/estimator/settings/EstimatorSettingsPanel';
import ErrorTraceDiagnosticsPanel from '../components/settings/ErrorTraceDiagnosticsPanel';
import { formatPlanPriceIdr, planForOrg, type PricingPlan } from '../lib/pricingPlans';
import { countProjectsCreatedThisMonth, loadPricingPlans } from '../services/pricingPlanService';
import { useEntitlement } from '../hooks/useEntitlement';
import { entitlementPlanLabel, isAdminFullAccess, isEstimatorOnlyPlan } from '../lib/entitlement';
import { hasEstimatorLicenseAccess } from '../lib/appProductBrand';
import { canAccessManagerFeatures } from '../utils/platformUi';

type SettingsTab = 'profil' | 'estimator' | 'akun' | 'koordinasi' | 'organisasi' | 'pricelist' | 'domain' | 'notifikasi' | 'keamanan' | 'diagnostik' | 'tentang' | 'developer';

const VALID_SETTINGS_TABS: SettingsTab[] = [
  'profil', 'estimator', 'akun', 'koordinasi', 'organisasi', 'pricelist', 'domain', 'notifikasi', 'keamanan', 'diagnostik', 'tentang', 'developer',
];

const OWNER_ONLY_TABS: SettingsTab[] = ['organisasi', 'pricelist', 'domain', 'developer'];
const ADMIN_ONLY_TABS: SettingsTab[] = ['diagnostik', 'developer'];

const TIMEZONES = [
  'Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'UTC',
];

const CURRENCIES = [
  { value: 'IDR', label: 'Rupiah (IDR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
];

const INDUSTRIES = [
  'Konstruksi', 'Manufaktur', 'IT & Software', 'Event', 'Jasa', 'Retail', 'Lainnya',
];

const BUSINESS_TYPES = [
  { value: 'construction', label: 'Konstruksi / Proyek' },
  { value: 'manufacturing', label: 'Manufaktur' },
  { value: 'it', label: 'IT & Software' },
  { value: 'service', label: 'Jasa' },
  { value: 'other', label: 'Lainnya' },
];

function roleLabel(role?: string) {
  const map: Record<string, string> = {
    owner: 'Owner', manager: 'Manager', worker: 'Karyawan', staff: 'Staff', admin: 'Admin',
  };
  return map[role || ''] || role || '—';
}

function planLabel(plan?: string | null): string {
  const map: Record<string, string> = {
    free: 'Gratis',
    starter: 'Estimator Standard',
    standard: 'Estimator Standard',
    estimator: 'Estimator Standard',
    estimator_pro: 'Estimator Pro',
    pro: 'Pro',
    pro_plus: 'Pro+',
    enterprise: 'Enterprise',
    monthly: 'Bulanan',
    lifetime: 'Lifetime',
  };
  return map[plan || ''] || plan || 'Gratis';
}

function roleBadgeClass(role?: string) {
  const map: Record<string, string> = {
    owner: 'bg-emerald-100 text-emerald-700',
    manager: 'bg-emerald-100 text-emerald-700',
    worker: 'bg-emerald-100 text-emerald-700',
  };
  return map[role || ''] || 'bg-slate-100 text-slate-600';
}

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user, tenant, logout, setUser, setTenant, setActiveTab, setFinanceVersionPreference, platformRole,
    uiViewMode, entitlementPreviewMode, syncStatus, isOnline, lastSynced, isDemoMode, projects,
  } = useAppStore();

  const demoActive = isDemoMode || tenant?.id === 'demo';
  const isOwner = user?.role === 'owner';
  const canEditOrg = isOwner;
  const canManageTeam = canAccessManagerFeatures(user?.role, platformRole, user?.email, uiViewMode);
  const showAdminLink = isPlatformAdmin(platformRole, user?.email);
  const entitlement = useEntitlement();
  const adminFullAccess = isAdminFullAccess(platformRole, user?.email, entitlementPreviewMode);
  const estimatorOnly = !adminFullAccess && isEstimatorOnlyPlan(entitlement);
  const hasEstimatorAccess = hasEstimatorLicenseAccess(entitlement, adminFullAccess);
  const resolvedPlanLabel = entitlement.isLoading
    ? planLabel(tenant?.plan)
    : entitlementPlanLabel(entitlement);

  const [tab, setTab] = useState<SettingsTab>('profil');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(user?.name || '');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [financeVersion, setFinanceVersionState] = useState<FinanceVersion>('v3');
  const [savingFinanceVersion, setSavingFinanceVersion] = useState(false);

  const [orgName, setOrgName] = useState(tenant?.name || '');
  const [industry, setIndustry] = useState('');
  const [timezone, setTimezone] = useState(tenant?.timezone || 'Asia/Jakarta');
  const [currency, setCurrency] = useState(tenant?.currency || 'IDR');
  const [businessType, setBusinessType] = useState(tenant?.business_type || 'construction');
  const [brandColor, setBrandColor] = useState('#059669');
  const [syncPdfBrand, setSyncPdfBrand] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(loadNotificationPrefs());
  const [notifSaved, setNotifSaved] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [projectsThisMonth, setProjectsThisMonth] = useState<number | null>(null);

  const currentPlan = planForOrg(tenant?.plan, pricingPlans);

  const selectTab = (id: SettingsTab) => {
    setTab(id);
    navigate(`/app?tab=settings&st=${id}`, { replace: true });
  };

  const isTabRestricted = useCallback((candidate: SettingsTab) => {
    if (OWNER_ONLY_TABS.includes(candidate) && !isOwner) return true;
    if (ADMIN_ONLY_TABS.includes(candidate) && !showAdminLink) return true;
    if (estimatorOnly && (candidate === 'koordinasi' || candidate === 'pricelist' || candidate === 'domain')) return true;
    if (candidate === 'koordinasi' && !canManageTeam) return true;
    if (candidate === 'estimator' && !entitlement.isLoading && !hasEstimatorAccess) return true;
    return false;
  }, [isOwner, showAdminLink, estimatorOnly, canManageTeam, entitlement.isLoading, hasEstimatorAccess]);

  useEffect(() => {
    const rawSt = searchParams.get('st') || searchParams.get('tab');
    let nextTab: SettingsTab | null = null;
    if (rawSt === 'telegram' || rawSt === 'bot') {
      nextTab = 'koordinasi';
    } else if (rawSt && VALID_SETTINGS_TABS.includes(rawSt as SettingsTab)) {
      nextTab = rawSt as SettingsTab;
    }
    if (nextTab) {
      setTab(isTabRestricted(nextTab) ? 'profil' : nextTab);
    }
  }, [searchParams, isTabRestricted]);

  useEffect(() => {
    if (isTabRestricted(tab)) {
      setTab('profil');
    }
  }, [tab, isTabRestricted]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (demoActive) {
      // Mode demo melewati query Supabase (tenant.id = 'demo' memicu UUID 22P02).
      setName(user.name || '');
      setPosition(user.position || '');
      setDepartment(user.department || '');
      setOrgName(tenant?.name || '');
      setTimezone(tenant?.timezone || 'Asia/Jakarta');
      setCurrency(tenant?.currency || 'IDR');
      setBusinessType(tenant?.business_type || 'construction');
      setProjectsThisMonth(projects.length);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      fetchNotificationPrefsFromSupabase(user.id).then(remotePrefs => {
        if (remotePrefs) setNotifPrefs(remotePrefs);
      });
      const profile = await loadProfileWithSettings(user.id);
      const settings = (profile?.settings || {}) as Record<string, string>;
      setName(profile?.name || user.name || '');
      setPosition(settings.position || user.position || '');
      setPhone(settings.phone || '');
      setDepartment(settings.department || user.department || '');
      const fv = await loadFinanceVersion(user.id);
      setFinanceVersionState(fv);

      if (tenant?.id && canEditOrg) {
        const org = await loadOrgDetails(tenant.id);
        const orgSettings = (org.settings || {}) as Record<string, string>;
        setOrgName(org.name);
        setIndustry(org.industry || '');
        setTimezone(org.timezone || 'Asia/Jakarta');
        setCurrency(orgSettings.currency || tenant.currency || 'IDR');
        setBusinessType(orgSettings.business_type || tenant.business_type || 'construction');
        setBrandColor(org.brand_color || '#059669');
      }

      const [plans, monthCount] = await Promise.all([
        loadPricingPlans(true),
        tenant?.id ? countProjectsCreatedThisMonth(tenant.id) : Promise.resolve(0),
      ]);
      setPricingPlans(plans);
      setProjectsThisMonth(monthCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.name, user?.position, user?.department, tenant?.id, tenant?.name, tenant?.timezone, canEditOrg, tenant?.currency, tenant?.business_type, demoActive, projects.length]);

  useEffect(() => { load(); }, [load]);

  const handleFinanceVersionChange = async (version: FinanceVersion) => {
    if (!user?.id || version === financeVersion) return;
    if (demoActive) {
      setFinanceVersionState(version);
      setFinanceVersionPreference(version);
      showToast('Preferensi keuangan diubah sementara (mode demo)', 'info');
      if (isSandboxFinance(version)) {
        navigate('/app/finance-v2');
      } else {
        navigate('/app?tab=finance');
        setActiveTab('finance');
      }
      return;
    }
    setSavingFinanceVersion(true);
    try {
      await setFinanceVersion(user.id, version);
      setFinanceVersionState(version);
      setFinanceVersionPreference(version);
      showToast(
        isSandboxFinance(version) ? 'Keuangan Bisnis (terbaru) aktif' : 'Keuangan klasik aktif',
        'success',
      );
      if (isSandboxFinance(version)) {
        navigate('/app/finance-v2');
      } else {
        navigate('/app?tab=finance');
        setActiveTab('finance');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan versi finance', 'error');
    } finally {
      setSavingFinanceVersion(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !name.trim()) return;
    if (demoActive) {
      setUser({
        ...user,
        name: name.trim(),
        position: position.trim() || undefined,
        department: department.trim() || undefined,
      });
      setEditingProfile(false);
      showToast('Profil diperbarui sementara (mode demo)', 'info');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfileName(user.id, name.trim());
      await updateProfileSettings(user.id, {
        position: position.trim(),
        phone: phone.trim(),
        department: department.trim(),
      });

      setUser({
        ...user,
        name: name.trim(),
        position: position.trim() || undefined,
        department: department.trim() || undefined,
      });
      setEditingProfile(false);
      showToast('Profil disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan profil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!tenant?.id || !canEditOrg || !user?.id) return;
    if (demoActive) {
      showToast('Pengaturan organisasi tidak dapat disimpan di mode demo', 'info');
      return;
    }
    setSavingOrg(true);
    try {
      const before = await loadOrgDetails(tenant.id);
      await updateOrgFields(tenant.id, {
        name: orgName.trim(),
        timezone,
        brand_color: brandColor,
        industry: industry || undefined,
      });
      await mergeOrgSettingsJson(tenant.id, {
        currency,
        business_type: businessType,
      });

      if (syncPdfBrand) {
        await syncPdfBrandFromOrg(tenant.id, brandColor);
      }

      const { recordReversibleAction } = await import('../services/undoService');
      const action = await recordReversibleAction({
        orgId: tenant.id,
        actorId: user.id,
        actionType: 'org_settings',
        entityType: 'planner_organizations',
        entityId: tenant.id,
        beforeState: {
          fields: {
            name: before.name,
            timezone: before.timezone,
            brand_color: before.brand_color,
            industry: before.industry,
          },
          settings: before.settings,
        },
        afterState: {
          fields: { name: orgName.trim(), timezone, brand_color: brandColor, industry },
          settings: { ...(before.settings as Record<string, unknown>), currency, business_type: businessType },
        },
      });

      setActiveOrgTimeZone(timezone);
      setTenant({
        ...tenant,
        name: orgName.trim(),
        timezone,
        currency,
        business_type: businessType,
        brandColor,
      });
      showToast('Pengaturan organisasi disimpan', 'success');
      useUiStore.getState().showUndoToast('Pengaturan organisasi disimpan', action.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan organisasi', 'error');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveNotif = async () => {
    if (demoActive) {
      await saveNotificationPrefs(notifPrefs);
      setNotifSaved(true);
      showToast('Preferensi notifikasi disimpan lokal (mode demo)', 'info');
      return;
    }
    await saveNotificationPrefs(notifPrefs, user?.id);
    setNotifSaved(true);
    showToast('Preferensi notifikasi disimpan ke Supabase Cloud', 'success');
  };

  const handleNotifChange = (key: keyof NotificationPrefs, value: boolean) => {
    setNotifPrefs(p => ({ ...p, [key]: value }));
    setNotifSaved(false);
  };

  const handleChangePassword = async () => {
    if (demoActive) {
      showToast('Ubah password tidak tersedia di mode demo', 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      showToast(validation.errors[0], 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw new Error(error.message);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password berhasil diubah', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengubah password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLogoutAll = async () => {
    if (!demoActive) {
      await signOutGlobal();
    }
    await logout();
    navigate('/login');
  };

  const goToHr = () => {
    setActiveTab('hr');
    navigate('/app?tab=hr');
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User; show: boolean }[] = [
    { id: 'profil', label: 'Profil', icon: User, show: true },
    { id: 'estimator', label: 'Estimator', icon: FileSpreadsheet, show: hasEstimatorAccess },
    { id: 'akun', label: 'Akun & AI', icon: Sparkles, show: true },
    { id: 'koordinasi', label: 'Koordinasi AI & Bot Telegram', icon: Bot, show: canManageTeam && !estimatorOnly },
    { id: 'organisasi', label: 'Organisasi', icon: Building2, show: canEditOrg },
    { id: 'pricelist', label: 'Pricelist', icon: CreditCard, show: canEditOrg && !estimatorOnly },
    { id: 'domain', label: 'Custom Domain', icon: Globe, show: canEditOrg && !estimatorOnly },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, show: true },
    { id: 'keamanan', label: 'Keamanan', icon: Shield, show: true },
    { id: 'diagnostik', label: 'Trace & Error', icon: Bug, show: showAdminLink },
    { id: 'developer', label: 'Developer', icon: FlaskConical, show: showAdminLink },
    { id: 'tentang', label: 'Tentang', icon: Info, show: true },
  ];

  if (loading && !name) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#059669]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7F5] pb-24 md:pb-12 text-[#0F172A]">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-[#0F172A]">Pengaturan</h1>
            <p className="text-xs sm:text-sm text-[#5B6B7A]">Kelola profil, organisasi, dan preferensi akun.</p>
            {showAdminLink && (
              <div className="flex items-center gap-3 mt-1.5">
                <Link to="/admin" className="text-xs font-bold text-[#059669] hover:underline">
                  Buka Super Admin →
                </Link>
                <Link to="/app/uji-agen" className="text-xs font-bold text-[#059669] hover:underline">
                  Uji agen →
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-start">
            <button type="button" onClick={handleLogout} className="min-h-11 px-3.5 py-2 flex items-center gap-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors">
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
            <button type="button" onClick={load} className="min-h-11 min-w-11 flex items-center justify-center border border-[#E5EAE8] bg-white rounded-xl hover:bg-slate-50 shadow-sm transition-colors" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 text-[#5B6B7A] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Role', value: roleLabel(user?.role), sub: user?.email },
            { label: 'Organisasi', value: tenant?.name || '—', sub: tenant?.slug },
            {
              label: 'Paket',
              value: resolvedPlanLabel,
              sub: estimatorOnly
                ? 'Aktif seumur hidup'
                : currentPlan.projects_per_month != null && projectsThisMonth != null
                ? `${projectsThisMonth}/${currentPlan.projects_per_month} proyek bulan ini`
                : `${projects.length} proyek`,
            },
            { label: 'Status', value: isOnline ? 'Online' : 'Offline', sub: syncStatus },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-[#E5EAE8] p-4 shadow-sm">
              <div className="text-xs text-[#5B6B7A]">{kpi.label}</div>
              <div className="font-black text-[#0F172A] truncate">{kpi.value}</div>
              <div className="text-xs text-[#5B6B7A] truncate">{kpi.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap border transition-all ${
                tab === t.id
                  ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                  : 'bg-white text-[#5B6B7A] border-[#E5EAE8] hover:bg-slate-50'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

      {tab === 'profil' && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-black shrink-0">
                {name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-black text-xl text-slate-900">{name || '—'}</div>
                <div className="text-sm text-slate-500">{user?.email}</div>
                <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadgeClass(user?.role)}`}>
                  {roleLabel(user?.role)}
                </span>
              </div>
            </div>
            {!editingProfile ? (
              <button type="button" onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            ) : (
              <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-50">
                {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Simpan
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama Lengkap" icon={User} htmlFor={editingProfile ? 'settings-profile-name' : undefined}>
              {editingProfile ? (
                <input
                  id="settings-profile-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              ) : (
                <span className="text-sm font-medium text-slate-800">{name || '—'}</span>
              )}
            </Field>
            <Field label="Email" icon={Globe}>
              <span className="text-sm font-medium text-slate-800">{user?.email || '—'}</span>
              <p className="text-xs text-slate-600 mt-0.5">Email tidak dapat diubah di sini.</p>
            </Field>
            <Field label="Jabatan / Posisi" htmlFor={editingProfile ? 'settings-profile-position' : undefined}>
              {editingProfile ? (
                <input
                  id="settings-profile-position"
                  name="position"
                  autoComplete="organization-title"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Site Manager"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              ) : (
                <span className="text-sm font-medium text-slate-800">{position || '—'}</span>
              )}
            </Field>
            <Field label="Departemen" htmlFor={editingProfile ? 'settings-profile-department' : undefined}>
              {editingProfile ? (
                <input
                  id="settings-profile-department"
                  name="department"
                  autoComplete="off"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="Operasional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              ) : (
                <span className="text-sm font-medium text-slate-800">{department || '—'}</span>
              )}
            </Field>
            <Field label="Telepon" htmlFor={editingProfile ? 'settings-profile-phone' : undefined}>
              {editingProfile ? (
                <input
                  id="settings-profile-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+62..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              ) : (
                <span className="text-sm font-medium text-slate-800">{phone || '—'}</span>
              )}
            </Field>
            <Field label="Organisasi">
              <span className="text-sm font-medium text-slate-800">{tenant?.name || '—'}</span>
            </Field>
          </div>

          {editingProfile && (
            <button type="button" onClick={() => { setEditingProfile(false); load(); }} className="text-sm text-slate-500 hover:text-slate-700">
              Batal
            </button>
          )}

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800">Versi Finance</h3>
            </div>
            <p className="text-sm text-slate-500">
              Keuangan Bisnis (v3): neraca organisasi 8 tab dari mockup terbaru. Klasik (v1): ringkasan per proyek.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {(['v1', 'v3'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  disabled={savingFinanceVersion}
                  onClick={() => handleFinanceVersionChange(v)}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-colors ${
                    (v === 'v3' ? isSandboxFinance(financeVersion) : financeVersion === 'v1')
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{v === 'v1' ? 'Keuangan Klasik (v1)' : 'Keuangan Bisnis (v3)'}</div>
                  <div className="text-xs font-normal mt-0.5 opacity-80">
                    {v === 'v1' ? 'Dashboard transaksi proyek' : 'Hero kas, Neraca Bisnis, 8 tab'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!demoActive && tenant?.id && isSandboxFinance(financeVersion) && (
            <FinanceIntegrationPanel orgId={tenant.id} userId={user?.id} />
          )}
        </div>
      )}

      {tab === 'estimator' && hasEstimatorAccess && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          {demoActive ? (
            <p className="text-sm text-[#5B6B7A]">Pengaturan Estimator & PDF tidak tersedia di mode demo.</p>
          ) : (
            <EstimatorSettingsPanel />
          )}
        </div>
      )}

      {tab === 'akun' && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          {demoActive ? (
            <p className="text-sm text-[#5B6B7A]">Pengaturan integrasi akun tidak tersedia di mode demo.</p>
          ) : (
            <UserAccountPanel />
          )}
        </div>
      )}

      {tab === 'koordinasi' && canManageTeam && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          {demoActive ? (
            <p className="text-sm text-[#5B6B7A]">Koordinasi AI & Bot Telegram tidak tersedia di mode demo.</p>
          ) : (
            <FieldCoordinationPanel />
          )}
        </div>
      )}

      {tab === 'organisasi' && canEditOrg && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-800">Profil Organisasi</h3>
            <p className="text-sm text-slate-500">
              Identitas perusahaan Anda. Warna brand diterapkan ke PDF customer, menu aktif, dan portal karyawan — tanpa mengubah logo Froyek.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="settings-org-name" className="text-xs font-semibold text-slate-600 mb-1 block">Nama Perusahaan</label>
              <input id="settings-org-name" name="orgName" autoComplete="organization" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label htmlFor="settings-org-industry" className="text-xs font-semibold text-slate-600 mb-1 block">Industri</label>
              <select id="settings-org-industry" name="industry" value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                <option value="">Pilih industri</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="settings-org-business-type" className="text-xs font-semibold text-slate-600 mb-1 block">Tipe Bisnis</label>
              <select id="settings-org-business-type" name="businessType" value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="settings-org-timezone" className="text-xs font-semibold text-slate-600 mb-1 block">Zona Waktu</label>
              <select id="settings-org-timezone" name="timezone" value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="settings-org-currency" className="text-xs font-semibold text-slate-600 mb-1 block">Mata Uang Default</label>
              <select id="settings-org-currency" name="currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-org-brand-color-hex" className="text-xs font-semibold text-slate-600 mb-1 block">Warna Brand Organisasi</label>
              <div className="flex items-center gap-3">
                <input id="settings-org-brand-color-picker" name="brandColorPicker" aria-label="Pilih warna brand organisasi" type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <input id="settings-org-brand-color-hex" name="brandColor" autoComplete="off" spellCheck={false} value={brandColor} onChange={e => setBrandColor(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono" />
              </div>
            </div>
          </div>

          <BrandIdentityPanel
            brandColor={brandColor}
            syncPdf={syncPdfBrand}
            onSyncPdfChange={setSyncPdfBrand}
          />

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800">Paket langganan</h4>
              <p className="text-sm text-slate-500">
                {estimatorOnly ? (
                  <>{resolvedPlanLabel} · Aktif seumur hidup</>
                ) : (
                  <>
                    {resolvedPlanLabel} · {formatPlanPriceIdr(currentPlan.price_monthly_idr)}/bulan
                    {currentPlan.projects_per_month != null && projectsThisMonth != null && (
                      <> · {projectsThisMonth}/{currentPlan.projects_per_month} proyek bulan ini</>
                    )}
                  </>
                )}
              </p>
            </div>
            {!estimatorOnly && (
              <button
                type="button"
                onClick={() => selectTab('pricelist')}
                className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
              >
                Lihat pricelist &amp; upgrade
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={handleSaveOrg} disabled={savingOrg} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan Organisasi
            </button>
            {!estimatorOnly && (
              <button type="button" onClick={goToHr} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
                <Users className="w-4 h-4" /> HR &amp; Karyawan
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {!estimatorOnly && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
              Kelola anggota, undangan, dan akses join di halaman <button type="button" onClick={goToHr} className="text-emerald-600 font-semibold">HR &amp; Karyawan</button>.
            </div>
          )}
        </div>
      )}

      {tab === 'pricelist' && canEditOrg && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          <UpgradePlansPanel
            orgPlanType={tenant?.plan}
            pricingPlans={pricingPlans}
            projectsThisMonth={projectsThisMonth}
          />
        </div>
      )}

      {tab === 'domain' && canEditOrg && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          {demoActive ? (
            <p className="text-sm text-[#5B6B7A]">Custom Domain tidak tersedia di mode demo.</p>
          ) : (
            <CustomDomainPanel onUpgrade={() => selectTab('pricelist')} />
          )}
        </div>
      )}

      {tab === 'notifikasi' && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-bold text-slate-800">Preferensi Notifikasi</h3>
            <p className="text-sm text-slate-500">Atur jenis notifikasi yang ingin kamu terima.</p>
          </div>

          <div className="space-y-1">
            <NotifGroup title="Email">
              {[
                { key: 'email_invitation' as const, label: 'Undangan & welcome email' },
                { key: 'email_role_change' as const, label: 'Perubahan role & akses' },
              ].map(item => (
                <ToggleRow key={item.key} label={item.label} checked={notifPrefs[item.key]} onChange={v => handleNotifChange(item.key, v)} />
              ))}
            </NotifGroup>
            <NotifGroup title="In-App">
              {[
                { key: 'inapp_join_request' as const, label: 'Permintaan join tim' },
                { key: 'inapp_project' as const, label: 'Proyek & task update' },
                { key: 'inapp_hr' as const, label: 'HR & absensi' },
                { key: 'inapp_finance' as const, label: 'Keuangan & budget alert' },
              ].map(item => (
                <ToggleRow key={item.key} label={item.label} checked={notifPrefs[item.key]} onChange={v => handleNotifChange(item.key, v)} />
              ))}
            </NotifGroup>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSaveNotif} disabled={notifSaved} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              Simpan Preferensi
            </button>
            {!notifSaved && <span className="text-xs text-amber-600">Ada perubahan belum disimpan</span>}
          </div>
          <p className="text-xs text-slate-600">Disimpan lokal per perangkat. Sinkron ke cloud — coming soon.</p>
        </div>
      )}

      {tab === 'keamanan' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800">Ubah Password</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-new-password" className="text-xs font-semibold text-slate-600 mb-1 block">Password Baru</label>
                <input id="settings-new-password" name="newPassword" autoComplete="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 karakter" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div>
                <label htmlFor="settings-confirm-password" className="text-xs font-semibold text-slate-600 mb-1 block">Konfirmasi Password</label>
                <input id="settings-confirm-password" name="confirmPassword" autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              </div>
            </div>
            <p className="text-xs text-slate-600">Minimal 8 karakter, huruf besar, angka, dan simbol.</p>
            <button type="button" onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>

          {!demoActive && tenant?.id && <TelegramLinkPanel orgId={tenant.id} isOwner={isOwner} />}

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl border border-rose-200 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar dari perangkat ini
          </button>
          <button onClick={handleLogoutAll} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-600 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors">
            Keluar dari semua perangkat
          </button>
        </div>
      )}

      {tab === 'diagnostik' && showAdminLink && (
        demoActive ? (
          <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm text-sm text-[#5B6B7A]">
            Diagnostik sinkronisasi server tidak tersedia di mode demo.
          </div>
        ) : (
          <ErrorTraceDiagnosticsPanel />
        )
      )}

      {tab === 'developer' && showAdminLink && user?.id && (
        <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm">
          {demoActive ? (
            <p className="text-sm text-[#5B6B7A]">Panel developer tidak tersedia di mode demo.</p>
          ) : (
            <MigrationDeveloperPanel userId={user.id} />
          )}
        </div>
      )}

      {tab === 'tentang' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800">Tentang Aplikasi</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <AboutRow label="Aplikasi" value="Froyek" />
              <AboutRow label="Versi" value="0.1.0 MVP" />
              <AboutRow label="Mode" value={isDemoMode ? 'Demo' : 'Production'} />
              <AboutRow label="Paket" value={resolvedPlanLabel} />
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-[#E5EAE8] p-5 sm:p-6 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800">Status Sinkronisasi</h3>
            <div className="flex items-center gap-3 text-sm">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-slate-600" />}
              <span className="font-medium capitalize">{syncStatus}</span>
              {lastSynced && (
                <span className="text-slate-600">
                  · Terakhir sync {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-sm text-emerald-800">
            <p className="font-semibold mb-1">Butuh bantuan?</p>
            <p className="text-emerald-700">
              Hubungi admin organisasi Anda atau email ke{' '}
              <a href="mailto:support@froyek.com" className="font-semibold underline">support@froyek.com</a>.
            </p>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function Field({ label, icon: Icon, htmlFor, children }: { label: string; icon?: typeof User; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-600" />}
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600">{label}</label>
        ) : (
          <div className="text-xs font-semibold text-slate-600">{label}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function NotifGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 cursor-pointer">
      <span className="text-sm text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
    </label>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-50">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
