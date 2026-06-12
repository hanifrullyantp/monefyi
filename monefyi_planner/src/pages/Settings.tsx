import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Globe, LogOut, Edit3, Check, Building2, Bell, Shield,
  Info, RefreshCw, Loader2, ChevronRight, Lock, Users, Wifi, WifiOff, Sparkles, Wallet,
  Calculator,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { showToast, useUiStore } from '../store/uiStore';
import { updateProfileName, loadProfileWithSettings, updateProfileSettings } from '../services/profileService';
import { loadOrgDetails, updateOrgFields, mergeOrgSettingsJson } from '../services/orgService';
import { signOutGlobal, updatePassword } from '../services/authService';
import { validatePassword } from '../lib/validators';
import {
  loadNotificationPrefs, saveNotificationPrefs, type NotificationPrefs,
} from '../services/settingsPrefsService';
import UserAccountPanel from '../components/account/UserAccountPanel';
import BrandIdentityPanel from '../components/branding/BrandIdentityPanel';
import { syncPdfBrandFromOrg } from '../services/pdfSettingsService';
import { isPlatformAdmin } from '../services/adminService';
import { Link } from 'react-router-dom';
import { loadFinanceVersion, setFinanceVersion } from '../lib/financeVersion';
import type { FinanceVersion } from '../types/financeV2';
import PricelistPage from './estimator/PricelistPage';
import { formatPlanPriceIdr, planForOrg, type PricingPlan } from '../lib/pricingPlans';
import { countProjectsCreatedThisMonth, loadPricingPlans } from '../services/pricingPlanService';

type SettingsTab = 'profil' | 'akun' | 'organisasi' | 'pricelist' | 'notifikasi' | 'keamanan' | 'tentang';

const VALID_SETTINGS_TABS: SettingsTab[] = [
  'profil', 'akun', 'organisasi', 'pricelist', 'notifikasi', 'keamanan', 'tentang',
];

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
    syncStatus, isOnline, lastSynced, isDemoMode, projects,
  } = useAppStore();

  const isOwner = user?.role === 'owner';
  const canEditOrg = isOwner;
  const showAdminLink = isPlatformAdmin(platformRole, user?.email);

  const [tab, setTab] = useState<SettingsTab>('profil');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(user?.name || '');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [financeVersion, setFinanceVersionState] = useState<FinanceVersion>('v1');
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

  useEffect(() => {
    const st = searchParams.get('st');
    if (st && VALID_SETTINGS_TABS.includes(st as SettingsTab)) {
      setTab(st as SettingsTab);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
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
  }, [user?.id, user?.name, user?.position, user?.department, tenant?.id, canEditOrg, tenant?.currency, tenant?.business_type]);

  useEffect(() => { load(); }, [load]);

  const handleFinanceVersionChange = async (version: FinanceVersion) => {
    if (!user?.id || version === financeVersion) return;
    setSavingFinanceVersion(true);
    try {
      await setFinanceVersion(user.id, version);
      setFinanceVersionState(version);
      setFinanceVersionPreference(version);
      showToast(
        version === 'v2' ? 'Finance V2 aktif — menu Keuangan membuka neraca baru' : 'Finance V1 aktif',
        'success',
      );
      if (version === 'v2') {
        navigate('/app/finance-v2');
      } else {
        navigate('/app');
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
    setSavingProfile(true);
    try {
      const { error: nameErr } = await updateProfileName(user.id, name.trim());
      if (nameErr) throw new Error(nameErr.message);

      const { error: settingsErr } = await updateProfileSettings(user.id, {
        position: position.trim(),
        phone: phone.trim(),
        department: department.trim(),
      });
      if (settingsErr) throw new Error(settingsErr.message);

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

  const handleSaveNotif = () => {
    saveNotificationPrefs(notifPrefs);
    setNotifSaved(true);
    showToast('Preferensi notifikasi disimpan', 'success');
  };

  const handleNotifChange = (key: keyof NotificationPrefs, value: boolean) => {
    setNotifPrefs(p => ({ ...p, [key]: value }));
    setNotifSaved(false);
  };

  const handleChangePassword = async () => {
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
    await signOutGlobal();
    await logout();
    navigate('/login');
  };

  const goToHr = () => {
    setActiveTab('hr');
    navigate('/app?tab=hr');
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof User; show: boolean }[] = [
    { id: 'profil', label: 'Profil', icon: User, show: true },
    { id: 'akun', label: 'Akun & AI', icon: Sparkles, show: true },
    { id: 'organisasi', label: 'Organisasi', icon: Building2, show: canEditOrg },
    { id: 'pricelist', label: 'Pricelist', icon: Calculator, show: canEditOrg },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, show: true },
    { id: 'keamanan', label: 'Keamanan', icon: Shield, show: true },
    { id: 'tentang', label: 'Tentang', icon: Info, show: true },
  ];

  if (loading && !name) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Pengaturan</h1>
          <p className="text-sm text-slate-500">Kelola profil, organisasi, dan preferensi akun.</p>
          {showAdminLink && (
            <Link to="/admin" className="inline-flex mt-2 text-sm font-semibold text-emerald-600 hover:underline">
              Buka Super Admin →
            </Link>
          )}
        </div>
        <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 self-start" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Role', value: roleLabel(user?.role), sub: user?.email },
          { label: 'Organisasi', value: tenant?.name || '—', sub: tenant?.slug },
          {
            label: 'Paket',
            value: currentPlan.label,
            sub: currentPlan.projects_per_month != null && projectsThisMonth != null
              ? `${projectsThisMonth}/${currentPlan.projects_per_month} proyek bulan ini`
              : `${projects.length} proyek`,
          },
          { label: 'Status', value: isOnline ? 'Online' : 'Offline', sub: syncStatus },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className="font-black text-slate-900 truncate">{kpi.value}</div>
            <div className="text-xs text-slate-400 truncate">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600 border border-slate-100'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profil' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
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
            <Field label="Nama Lengkap" icon={User}>
              {editingProfile ? (
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{name || '—'}</span>
              )}
            </Field>
            <Field label="Email" icon={Globe}>
              <span className="text-sm font-medium text-slate-800">{user?.email || '—'}</span>
              <p className="text-xs text-slate-400 mt-0.5">Email tidak dapat diubah di sini.</p>
            </Field>
            <Field label="Jabatan / Posisi">
              {editingProfile ? (
                <input value={position} onChange={e => setPosition(e.target.value)} placeholder="Site Manager" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{position || '—'}</span>
              )}
            </Field>
            <Field label="Departemen">
              {editingProfile ? (
                <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Operasional" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{department || '—'}</span>
              )}
            </Field>
            <Field label="Telepon">
              {editingProfile ? (
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
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
              V1: keuangan proyek (pemasukan & biaya). V2: neraca double-entry terpisah dengan chart of accounts.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {(['v1', 'v2'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  disabled={savingFinanceVersion}
                  onClick={() => handleFinanceVersionChange(v)}
                  className={`flex-1 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-colors ${
                    financeVersion === v
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{v === 'v1' ? 'Finance V1' : 'Finance V2'}</div>
                  <div className="text-xs font-normal mt-0.5 opacity-80">
                    {v === 'v1' ? 'Tab Keuangan klasik' : 'Neraca & jurnal terpisah'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'akun' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <UserAccountPanel />
        </div>
      )}

      {tab === 'organisasi' && canEditOrg && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <div>
            <h3 className="font-bold text-slate-800">Profil Organisasi</h3>
            <p className="text-sm text-slate-500">
              Identitas perusahaan Anda. Warna brand diterapkan ke PDF customer, menu aktif, dan portal karyawan — tanpa mengubah logo Monefyi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Nama Perusahaan</label>
              <input value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Industri</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                <option value="">Pilih industri</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Tipe Bisnis</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {BUSINESS_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Zona Waktu</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Mata Uang Default</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Warna Brand Organisasi</label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono" />
              </div>
            </div>
          </div>

          <BrandIdentityPanel
            brandColor={brandColor}
            syncPdf={syncPdfBrand}
            onSyncPdfChange={setSyncPdfBrand}
          />

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="font-bold text-slate-800">Paket langganan</h4>
              <p className="text-sm text-slate-500">
                Paket aktif: <span className="font-semibold text-emerald-700">{currentPlan.label}</span>
                {' · '}
                {formatPlanPriceIdr(currentPlan.price_monthly_idr)}/bulan
                {currentPlan.projects_per_month != null && projectsThisMonth != null && (
                  <> · Kuota bulan ini: {projectsThisMonth}/{currentPlan.projects_per_month} proyek baru</>
                )}
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {pricingPlans.map(p => {
                const active = p.slug === currentPlan.slug;
                return (
                  <div
                    key={p.slug}
                    className={`rounded-xl border p-4 ${active ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="font-bold text-slate-900">{p.label}</div>
                    <div className="text-lg font-black text-emerald-700 mt-1">
                      {formatPlanPriceIdr(p.price_monthly_idr)}
                      {p.price_monthly_idr > 0 && <span className="text-xs font-normal text-slate-500">/bulan</span>}
                    </div>
                    {p.projects_per_month != null ? (
                      <div className="text-xs text-slate-600 mt-1">{p.projects_per_month} proyek/bulan</div>
                    ) : (
                      <div className="text-xs text-slate-600 mt-1">Proyek tanpa batas</div>
                    )}
                    <ul className="mt-2 space-y-0.5">
                      {p.features.slice(0, 3).map(f => (
                        <li key={f} className="text-xs text-slate-500">· {f}</li>
                      ))}
                    </ul>
                    {active && (
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Paket Anda
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">
              Untuk upgrade paket, hubungi tim Monefyi. Harga dapat diatur oleh Super Admin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={handleSaveOrg} disabled={savingOrg} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {savingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan Organisasi
            </button>
            <button type="button" onClick={goToHr} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50">
              <Users className="w-4 h-4" /> HR & Karyawan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Kelola anggota, undangan, dan akses join di halaman <button type="button" onClick={goToHr} className="text-emerald-600 font-semibold">HR & Karyawan</button>.
          </div>
        </div>
      )}

      {tab === 'pricelist' && canEditOrg && (
        <PricelistPage embedded />
      )}

      {tab === 'notifikasi' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
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
          <p className="text-xs text-slate-400">Disimpan lokal per perangkat. Sinkron ke cloud — coming soon.</p>
        </div>
      )}

      {tab === 'keamanan' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-800">Ubah Password</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Password Baru</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 karakter" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Konfirmasi Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
              </div>
            </div>
            <p className="text-xs text-slate-400">Minimal 8 karakter, huruf besar, angka, dan simbol.</p>
            <button type="button" onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl border border-rose-200 transition-colors">
            <LogOut className="w-4 h-4" /> Keluar dari perangkat ini
          </button>
          <button onClick={handleLogoutAll} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-slate-600 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors">
            Keluar dari semua perangkat
          </button>
        </div>
      )}

      {tab === 'tentang' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Tentang Aplikasi</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <AboutRow label="Aplikasi" value="Monefyi Planner" />
              <AboutRow label="Versi" value="0.1.0 MVP" />
              <AboutRow label="Mode" value={isDemoMode ? 'Demo' : 'Production'} />
              <AboutRow label="Paket" value={planLabel(tenant?.plan)} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <h3 className="font-bold text-slate-800">Status Sinkronisasi</h3>
            <div className="flex items-center gap-3 text-sm">
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
              <span className="font-medium capitalize">{syncStatus}</span>
              {lastSynced && (
                <span className="text-slate-400">
                  · Terakhir sync {lastSynced.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-sm text-emerald-800">
            <p className="font-semibold mb-1">Butuh bantuan?</p>
            <p className="text-emerald-700">Hubungi admin organisasi atau kunjungi dokumentasi onboarding di repo proyek.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof User; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <div className="text-xs font-semibold text-slate-500">{label}</div>
      </div>
      {children}
    </div>
  );
}

function NotifGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{title}</div>
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
