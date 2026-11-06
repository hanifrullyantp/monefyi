import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Building2, Settings, LayoutDashboard, Loader2, RefreshCw,
  Plus, Trash2, Save, ArrowLeft, Search, Activity, AlertTriangle, Archive, RotateCcw,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import PricingPlansAdmin from '../components/admin/PricingPlansAdmin';
import AdminRefundsPanel from '../components/admin/AdminRefundsPanel';
import {
  loadArchivedProjects,
  restoreArchivedProject,
  type ArchivedProjectRow,
} from '../services/projectService';
import {
  fetchAdminUsers, updateAdminUser, fetchPlatformStats,
  updateAppConfig, listCompanyTypes, createCompanyType,
  updateCompanyType, deleteCompanyType,
  fetchAdminOrganizations, updateAdminOrgPlan,
  type AdminUserRow, type CompanyType, type AdminOrgRow,
} from '../services/adminService';
import { showToast } from '../store/uiStore';
import { fetchRuntimeTraces, type RuntimeTraceRow } from '../services/runtimeTracer';

type Tab = 'overview' | 'users' | 'organizations' | 'company-types' | 'platform' | 'monitoring' | 'archives' | 'pricing' | 'refunds';

export default function SuperAdmin() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [appConfig, setAppConfig] = useState<Record<string, unknown>>({});
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [plannerFilter, setPlannerFilter] = useState<'all' | 'planner' | 'non_planner'>('planner');
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [newType, setNewType] = useState({ slug: '', label: '' });
  const [platformSettings, setPlatformSettings] = useState({
    platform_gemini_daily_fallback: 10,
    default_ai_daily_limit: 20,
  });
  const [traces, setTraces] = useState<RuntimeTraceRow[]>([]);
  const [monitorFilter, setMonitorFilter] = useState<'all' | 'errors' | 'session'>('all');
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProjectRow[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrgRow[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [savingOrgId, setSavingOrgId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPlatformStats();
      setStats(res.stats as Record<string, unknown>);
      setAppConfig(res.app_config || {});
      const ps = (res.app_config as { platform_settings?: Record<string, number> })?.platform_settings || {};
      setPlatformSettings({
        platform_gemini_daily_fallback: Number(ps.platform_gemini_daily_fallback || 10),
        default_ai_daily_limit: Number(ps.default_ai_daily_limit || 20),
      });
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminUsers({ q: search, planner: plannerFilter });
      setUsers(res.items);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat user', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, plannerFilter]);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      setCompanyTypes(await listCompanyTypes(true));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchives = useCallback(async () => {
    setLoading(true);
    try {
      setArchivedProjects(await loadArchivedProjects());
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat arsip proyek', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      setOrganizations(await fetchAdminOrganizations());
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat organisasi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRestoreProject = async (row: ArchivedProjectRow) => {
    if (!window.confirm(`Pulihkan proyek "${row.name}"?`)) return;
    setRestoringId(row.id);
    try {
      await restoreArchivedProject(row.id);
      showToast('Proyek dipulihkan', 'success');
      await loadArchives();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memulihkan', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const loadMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchRuntimeTraces({ limit: 150, hours: 48 });
      setTraces(rows);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat traces', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'overview' || tab === 'platform') loadOverview();
    if (tab === 'users') loadUsers();
    if (tab === 'company-types') loadTypes();
    if (tab === 'monitoring') loadMonitoring();
    if (tab === 'archives') loadArchives();
    if (tab === 'organizations') loadOrganizations();
  }, [tab, loadOverview, loadUsers, loadTypes, loadMonitoring, loadArchives, loadOrganizations]);

  const openEditUser = (u: AdminUserRow) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      plan_type: u.plan_type,
      ai_daily_limit: u.ai_daily_limit ?? 20,
      profile_role: u.profile_role || 'user',
      status: 'active',
    });
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const { profile_role, ...rest } = editForm;
      await updateAdminUser(selectedUser.id, {
        ...rest,
        role: profile_role,
      });
      showToast('User diperbarui', 'success');
      setSelectedUser(null);
      loadUsers();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const savePlatform = async () => {
    setLoading(true);
    try {
      await updateAppConfig({
        platform_settings: platformSettings,
        checkout_monthly_url: appConfig.checkout_monthly_url,
        checkout_lifetime_url: appConfig.checkout_lifetime_url,
        affiliate_commission: appConfig.affiliate_commission,
        notif_threshold: appConfig.notif_threshold,
      });
      showToast('Pengaturan platform disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'users', label: 'Pengguna', icon: Users },
    { id: 'organizations', label: 'Organisasi', icon: Building2 },
    { id: 'pricing', label: 'Paket Harga', icon: CreditCard },
    { id: 'refunds', label: 'Refund', icon: ShieldCheck },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'archives', label: 'Arsip Proyek', icon: Archive },
    { id: 'company-types', label: 'Jenis Perusahaan', icon: Building2 },
    { id: 'platform', label: 'Platform', icon: Settings },
  ];

  const filteredTraces = traces.filter(t => {
    if (monitorFilter === 'errors') return t.severity === 'error' || t.severity === 'critical';
    if (monitorFilter === 'session') return t.event_type === 'session_expired';
    return true;
  });

  const errorCount = traces.filter(t => t.severity === 'error' || t.severity === 'critical').length;
  const sessionExpiredCount = traces.filter(t => t.event_type === 'session_expired').length;

  return (
    <div className="min-h-screen bg-[#F4F7F5] pb-24 text-[#0F172A]">
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app" className="p-2 hover:bg-white/10 rounded-lg min-h-11 min-w-11 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-black text-lg">Super Admin</h1>
            <p className="text-xs text-slate-300">Kelola pengguna, jenis perusahaan, dan platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { if (tab === 'users') loadUsers(); else if (tab === 'organizations') loadOrganizations(); else if (tab === 'company-types') loadTypes(); else if (tab === 'monitoring') loadMonitoring(); else if (tab === 'archives') loadArchives(); else loadOverview(); }} className="min-h-11 min-w-11 flex items-center justify-center hover:bg-white/10 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`min-h-11 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap border transition-all ${tab === t.id ? 'bg-[#059669] text-white border-[#059669] shadow-sm' : 'bg-white text-[#5B6B7A] border-[#E5EAE8] hover:bg-slate-50'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total User', value: stats.total_users },
              { label: 'Organisasi', value: stats.total_orgs },
              { label: 'Join Pending', value: stats.pending_join_requests },
              { label: 'Paket Lifetime', value: (stats.plan_breakdown as Record<string, number>)?.lifetime || 0 },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl p-5 border border-[#E5EAE8] shadow-sm">
                <div className="text-3xl font-black text-[#059669]">{String(k.value)}</div>
                <div className="text-xs text-[#5B6B7A] mt-1">{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-[20px] border border-[#E5EAE8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5EAE8] flex flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A99A6]" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers()}
                  placeholder="Cari email..." className="w-full h-11 pl-10 pr-4 rounded-xl border border-[#E5EAE8] bg-white text-sm text-[#0F172A] focus:border-[#059669] focus:outline-none" />
              </div>
              <select
                value={plannerFilter}
                onChange={e => setPlannerFilter(e.target.value as 'all' | 'planner' | 'non_planner')}
                className="h-11 px-3.5 rounded-xl border border-[#E5EAE8] text-sm bg-white text-[#0F172A] focus:border-[#059669] focus:outline-none"
              >
                <option value="planner">User Planner saja</option>
                <option value="all">Semua user</option>
                <option value="non_planner">Bukan user Planner</option>
              </select>
              <button type="button" onClick={loadUsers} className="min-h-11 px-5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">Cari</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F7F5] text-[#5B6B7A] text-left text-xs font-bold uppercase">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Planner</th>
                    <th className="p-3.5">Paket</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">AI limit</th>
                    <th className="p-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAE8] bg-white">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[#0F172A]">{u.name || '—'}</div>
                        <div className="text-xs text-[#5B6B7A]">{u.email}</div>
                      </td>
                      <td className="p-3.5">
                        {u.is_planner_user ? (
                          <div>
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#059669]">
                              User Planner
                            </span>
                            <div className="text-xs text-[#5B6B7A] mt-1 capitalize">
                              {u.planner_role || 'member'}
                              {u.planner_org_name ? ` · ${u.planner_org_name}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#5B6B7A]">
                            Bukan Planner
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 capitalize text-[#0F172A]">{u.plan_type}</td>
                      <td className="p-3.5 capitalize text-[#0F172A]">{u.plan_status}</td>
                      <td className="p-3.5 text-[#0F172A]">{u.profile_role || 'user'}</td>
                      <td className="p-3.5 text-[#0F172A]">{u.ai_daily_limit ?? '—'}</td>
                      <td className="p-3.5">
                        <button type="button" onClick={() => openEditUser(u)} className="min-h-10 min-w-10 px-3 py-1.5 text-[#059669] hover:bg-emerald-50 rounded-lg font-bold text-xs transition-colors">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'monitoring' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm">
                <div className="text-2xl font-black text-rose-600">{errorCount}</div>
                <div className="text-xs text-[#5B6B7A] mt-0.5">Error / critical (48j)</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm">
                <div className="text-2xl font-black text-amber-600">{sessionExpiredCount}</div>
                <div className="text-xs text-[#5B6B7A] mt-0.5">Auto-logout / sign-out</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm">
                <div className="text-2xl font-black text-[#059669]">{traces.length}</div>
                <div className="text-xs text-[#5B6B7A] mt-0.5">Total events</div>
              </div>
            </div>

            <div className="flex gap-2">
              {([
                { id: 'all' as const, label: 'Semua' },
                { id: 'errors' as const, label: 'Errors' },
                { id: 'session' as const, label: 'Auto-logout' },
              ]).map(f => (
                <button key={f.id} type="button" onClick={() => setMonitorFilter(f.id)}
                  className={`min-h-11 px-4 py-2 rounded-full text-xs font-bold border transition-all ${monitorFilter === f.id ? 'bg-[#059669] text-white border-[#059669] shadow-sm' : 'bg-white border-[#E5EAE8] text-[#5B6B7A] hover:bg-slate-50'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-[20px] border border-[#E5EAE8] shadow-sm overflow-hidden">
              {loading && !traces.length ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#059669]" /></div>
              ) : filteredTraces.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#5B6B7A]">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-[#8A99A6]" />
                  Belum ada runtime trace. Pastikan migrasi `runtime_traces` sudah dijalankan.
                </div>
              ) : (
                <div className="divide-y divide-[#E5EAE8] max-h-[520px] overflow-y-auto">
                  {filteredTraces.map(t => (
                    <div key={t.id} className="p-4 text-sm hover:bg-slate-50/60 transition-colors">
                      <div className="flex justify-between gap-2">
                        <span className={`font-bold capitalize ${t.severity === 'error' || t.severity === 'critical' ? 'text-rose-600' : 'text-[#0F172A]'}`}>
                          {t.event_type}
                        </span>
                        <span className="text-xs text-[#5B6B7A]">{new Date(t.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-xs text-[#5B6B7A] mt-1">{t.component} · {t.severity}</div>
                      {t.message && <div className="text-[#0F172A] mt-1">{t.message}</div>}
                      {t.event_type === 'session_expired' && t.metadata?.was_manual === false && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Auto logout</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'archives' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
              Proyek yang dihapus owner disimpan di arsip <strong>30 hari</strong>. Hanya Super Admin yang dapat memulihkan.
            </div>
            <div className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#059669]" /></div>
              ) : archivedProjects.length === 0 ? (
                <p className="text-center text-[#5B6B7A] py-16 text-sm">Tidak ada proyek di arsip</p>
              ) : (
                <div className="divide-y divide-[#E5EAE8]">
                  {archivedProjects.map(row => {
                    const purgeDate = row.archive_purge_at ? new Date(row.archive_purge_at) : null;
                    const daysLeft = purgeDate
                      ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / 86400000))
                      : null;
                    return (
                      <div key={row.id} className="p-4 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#0F172A]">{row.name}</div>
                          <div className="text-xs text-[#5B6B7A] mt-0.5">
                            {row.org_name || row.org_id}
                            {' · '}Diarsip: {new Date(row.deleted_at).toLocaleString('id-ID')}
                            {daysLeft != null && (
                              <span className={daysLeft <= 7 ? ' text-rose-600 font-semibold' : ''}>
                                {' · '}{daysLeft} hari tersisa
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={restoringId === row.id}
                          onClick={() => handleRestoreProject(row)}
                          className="inline-flex items-center gap-1.5 px-4 min-h-11 rounded-xl bg-[#059669] text-white text-xs font-bold disabled:opacity-50"
                        >
                          {restoringId === row.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Pulihkan
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'organizations' && (
          <div className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5EAE8]">
              <input
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                placeholder="Cari organisasi..."
                className="w-full max-w-md px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div className="divide-y divide-[#E5EAE8] max-h-[70vh] overflow-y-auto">
              {organizations
                .filter(o => !orgSearch.trim() || o.name.toLowerCase().includes(orgSearch.toLowerCase()) || o.slug.includes(orgSearch.toLowerCase()))
                .map(org => {
                  const domain = org.planner_org_custom_domains?.[0];
                  return (
                    <div key={org.id} className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <div className="font-semibold text-[#0F172A]">{org.name}</div>
                        <code className="text-xs text-[#5B6B7A]">{org.slug}</code>
                        {domain && (
                          <div className="text-xs text-[#5B6B7A] mt-1">
                            {domain.hostname} · {domain.status}
                          </div>
                        )}
                      </div>
                      <select
                        defaultValue={org.plan_type}
                        disabled={savingOrgId === org.id}
                        onChange={async e => {
                          setSavingOrgId(org.id);
                          try {
                            await updateAdminOrgPlan(org.id, e.target.value);
                            showToast('Paket organisasi diperbarui', 'success');
                            loadOrganizations();
                          } catch (err) {
                            showToast(err instanceof Error ? err.message : 'Gagal', 'error');
                          } finally {
                            setSavingOrgId(null);
                          }
                        }}
                        className="px-3 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] bg-white"
                      >
                        {['free', 'starter', 'pro', 'pro_plus', 'enterprise'].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tab === 'pricing' && (
          <PricingPlansAdmin />
        )}

        {tab === 'refunds' && (
          <AdminRefundsPanel />
        )}

        {tab === 'company-types' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E5EAE8] shadow-sm flex flex-wrap gap-2 items-end">
              <input value={newType.slug} onChange={e => setNewType({ ...newType, slug: e.target.value })} placeholder="slug (construction)" className="px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] flex-1 min-w-[120px]" />
              <input value={newType.label} onChange={e => setNewType({ ...newType, label: e.target.value })} placeholder="Label" className="px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] flex-1 min-w-[120px]" />
              <button type="button" onClick={async () => {
                try {
                  await createCompanyType({ slug: newType.slug, label: newType.label });
                  setNewType({ slug: '', label: '' });
                  loadTypes();
                  showToast('Ditambahkan', 'success');
                } catch (e) { showToast(e instanceof Error ? e.message : 'Gagal', 'error'); }
              }} className="px-4 min-h-11 bg-[#059669] text-white rounded-xl text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5EAE8] shadow-sm divide-y divide-[#E5EAE8]">
              {companyTypes.map(ct => (
                <div key={ct.id} className="p-4 flex flex-wrap items-center gap-3">
                  <input defaultValue={ct.label} onBlur={async e => {
                    try { await updateCompanyType(ct.id, { label: e.target.value }); loadTypes(); } catch { /* */ }
                  }} className="font-semibold text-[#0F172A] border-b border-transparent focus:border-[#059669] outline-none" />
                  <code className="text-xs bg-[#F4F7F5] border border-[#E5EAE8] text-[#5B6B7A] px-2 py-1 rounded-md">{ct.slug}</code>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ct.is_active ? 'bg-emerald-50 text-[#059669] border border-emerald-200' : 'bg-slate-100 text-[#5B6B7A]'}`}>
                    {ct.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button type="button" onClick={async () => {
                    await updateCompanyType(ct.id, { is_active: !ct.is_active });
                    loadTypes();
                  }} className="text-xs text-[#059669] font-medium ml-auto">Toggle aktif</button>
                  <button type="button" aria-label="Hapus jenis perusahaan" onClick={async () => {
                    if (!confirm('Hapus jenis ini?')) return;
                    await deleteCompanyType(ct.id);
                    loadTypes();
                  }} className="text-rose-600 p-2 min-h-11 min-w-11 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'platform' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E5EAE8] shadow-sm space-y-4 max-w-lg">
            <h3 className="font-bold text-[#0F172A]">Pengaturan AI & Billing</h3>
            <div>
              <label className="text-xs text-[#5B6B7A]">Kuota fallback Gemini platform / user / hari</label>
              <input type="number" value={platformSettings.platform_gemini_daily_fallback}
                onChange={e => setPlatformSettings({ ...platformSettings, platform_gemini_daily_fallback: Number(e.target.value) })}
                className="w-full mt-1 px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]" />
            </div>
            <div>
              <label className="text-xs text-[#5B6B7A]">Default AI daily limit (user tanpa key)</label>
              <input type="number" value={platformSettings.default_ai_daily_limit}
                onChange={e => setPlatformSettings({ ...platformSettings, default_ai_daily_limit: Number(e.target.value) })}
                className="w-full mt-1 px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]" />
            </div>
            <div>
              <label className="text-xs text-[#5B6B7A]">Checkout bulanan URL</label>
              <input value={String(appConfig.checkout_monthly_url || '')} onChange={e => setAppConfig({ ...appConfig, checkout_monthly_url: e.target.value })}
                className="w-full mt-1 px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]" />
            </div>
            <div>
              <label className="text-xs text-[#5B6B7A]">Checkout lifetime URL</label>
              <input value={String(appConfig.checkout_lifetime_url || '')} onChange={e => setAppConfig({ ...appConfig, checkout_lifetime_url: e.target.value })}
                className="w-full mt-1 px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]" />
            </div>
            <button type="button" onClick={savePlatform} disabled={loading} className="flex items-center gap-2 px-5 min-h-11 bg-[#059669] text-white rounded-xl text-sm font-bold">
              <Save className="w-4 h-4" /> Simpan
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 border border-[#E5EAE8] shadow-2xl">
            <h3 className="font-bold text-[#0F172A]">Edit: {selectedUser.email}</h3>
            <input value={String(editForm.name || '')} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nama" className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A]" />
            <select value={String(editForm.plan_type || 'none')} onChange={e => setEditForm({ ...editForm, plan_type: e.target.value })} className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] bg-white">
              <option value="none">none</option>
              <option value="monthly">monthly</option>
              <option value="lifetime">lifetime</option>
            </select>
            <input type="number" value={Number(editForm.ai_daily_limit || 0)} onChange={e => setEditForm({ ...editForm, ai_daily_limit: Number(e.target.value) })}
              placeholder="AI daily limit" className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A]" />
            <select value={String(editForm.profile_role || 'user')} onChange={e => setEditForm({ ...editForm, profile_role: e.target.value })} className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] bg-white">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <select value={String(editForm.status || 'active')} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A] bg-white">
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="pending">pending</option>
            </select>
            <input type="password" placeholder="Password baru (opsional)" onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
              className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm text-[#0F172A]" />
            <input placeholder="Gemini API key (kosongkan = tidak ubah)" onChange={e => setEditForm({ ...editForm, gemini_key: e.target.value })}
              className="w-full px-3.5 h-11 border border-[#E5EAE8] rounded-xl text-sm font-mono text-[#0F172A]" />
            <textarea placeholder="Catatan admin" onChange={e => setEditForm({ ...editForm, admin_notes: e.target.value })}
              className="w-full p-3 border border-[#E5EAE8] rounded-xl text-sm h-20 text-[#0F172A]" />
            <label className="flex items-center gap-2 text-sm text-[#0F172A]">
              <input type="checkbox" defaultChecked onChange={e => setEditForm({ ...editForm, email_notifications: e.target.checked })} />
              Email notif
            </label>
            <label className="flex items-center gap-2 text-sm text-[#0F172A]">
              <input type="checkbox" defaultChecked onChange={e => setEditForm({ ...editForm, push_notifications: e.target.checked })} />
              Push notif
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 min-h-11 border border-[#E5EAE8] rounded-xl text-[#5B6B7A] font-semibold text-sm">Batal</button>
              <button type="button" onClick={saveUser} className="flex-1 min-h-11 bg-[#059669] text-white rounded-xl font-bold text-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
