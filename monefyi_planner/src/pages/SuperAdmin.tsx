import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Building2, Settings, LayoutDashboard, Loader2, RefreshCw,
  Plus, Trash2, Save, ArrowLeft, Search, Pencil, Activity, AlertTriangle,
} from 'lucide-react';
import {
  fetchAdminUsers, updateAdminUser, fetchPlatformStats,
  updateAppConfig, listCompanyTypes, createCompanyType,
  updateCompanyType, deleteCompanyType,
  type AdminUserRow, type CompanyType,
} from '../services/adminService';
import { showToast } from '../store/uiStore';
import { fetchRuntimeTraces, type RuntimeTraceRow } from '../services/runtimeTracer';

type Tab = 'overview' | 'users' | 'company-types' | 'platform' | 'monitoring';

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
  }, [tab, loadOverview, loadUsers, loadTypes, loadMonitoring]);

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
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
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
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app" className="p-2 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="font-black text-lg">Super Admin</h1>
            <p className="text-xs text-slate-400">Kelola pengguna, jenis perusahaan, dan platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/?edit=1"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
          >
            <Pencil className="w-4 h-4" />
            Edit landing
          </Link>
          <button type="button" onClick={() => { if (tab === 'users') loadUsers(); else if (tab === 'company-types') loadTypes(); else if (tab === 'monitoring') loadMonitoring(); else loadOverview(); }} className="p-2 hover:bg-white/10 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'}`}>
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
              <div key={k.label} className="bg-white rounded-2xl p-5 border border-slate-100">
                <div className="text-3xl font-black text-emerald-600">{String(k.value)}</div>
                <div className="text-sm text-slate-500">{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers()}
                  placeholder="Cari email..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm" />
              </div>
              <select
                value={plannerFilter}
                onChange={e => setPlannerFilter(e.target.value as 'all' | 'planner' | 'non_planner')}
                className="px-3 py-2.5 rounded-xl border text-sm bg-white"
              >
                <option value="planner">User Planner saja</option>
                <option value="all">Semua user</option>
                <option value="non_planner">Bukan user Planner</option>
              </select>
              <button type="button" onClick={loadUsers} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">Cari</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Planner</th>
                    <th className="p-3">Paket</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">AI limit</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold">{u.name || '—'}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-3">
                        {u.is_planner_user ? (
                          <div>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              User Planner
                            </span>
                            <div className="text-xs text-slate-500 mt-1 capitalize">
                              {u.planner_role || 'member'}
                              {u.planner_org_name ? ` · ${u.planner_org_name}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                            Bukan Planner
                          </span>
                        )}
                      </td>
                      <td className="p-3 capitalize">{u.plan_type}</td>
                      <td className="p-3 capitalize">{u.plan_status}</td>
                      <td className="p-3">{u.profile_role || 'user'}</td>
                      <td className="p-3">{u.ai_daily_limit ?? '—'}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => openEditUser(u)} className="text-emerald-600 font-semibold text-xs">Edit</button>
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
              <div className="bg-white rounded-2xl p-4 border">
                <div className="text-2xl font-black text-rose-600">{errorCount}</div>
                <div className="text-xs text-slate-500">Error / critical (48j)</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border">
                <div className="text-2xl font-black text-amber-600">{sessionExpiredCount}</div>
                <div className="text-xs text-slate-500">Auto-logout / sign-out</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border">
                <div className="text-2xl font-black text-emerald-600">{traces.length}</div>
                <div className="text-xs text-slate-500">Total events</div>
              </div>
            </div>

            <div className="flex gap-2">
              {([
                { id: 'all' as const, label: 'Semua' },
                { id: 'errors' as const, label: 'Errors' },
                { id: 'session' as const, label: 'Auto-logout' },
              ]).map(f => (
                <button key={f.id} type="button" onClick={() => setMonitorFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${monitorFilter === f.id ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border overflow-hidden">
              {loading && !traces.length ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
              ) : filteredTraces.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Belum ada runtime trace. Pastikan migrasi `runtime_traces` sudah dijalankan.
                </div>
              ) : (
                <div className="divide-y max-h-[520px] overflow-y-auto">
                  {filteredTraces.map(t => (
                    <div key={t.id} className="p-4 text-sm hover:bg-slate-50">
                      <div className="flex justify-between gap-2">
                        <span className={`font-bold capitalize ${t.severity === 'error' || t.severity === 'critical' ? 'text-rose-700' : 'text-slate-700'}`}>
                          {t.event_type}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{t.component} · {t.severity}</div>
                      {t.message && <div className="text-slate-600 mt-1">{t.message}</div>}
                      {t.event_type === 'session_expired' && t.metadata?.was_manual === false && (
                        <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Auto logout</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'company-types' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border flex flex-wrap gap-2 items-end">
              <input value={newType.slug} onChange={e => setNewType({ ...newType, slug: e.target.value })} placeholder="slug (construction)" className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[120px]" />
              <input value={newType.label} onChange={e => setNewType({ ...newType, label: e.target.value })} placeholder="Label" className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[120px]" />
              <button type="button" onClick={async () => {
                try {
                  await createCompanyType({ slug: newType.slug, label: newType.label });
                  setNewType({ slug: '', label: '' });
                  loadTypes();
                  showToast('Ditambahkan', 'success');
                } catch (e) { showToast(e instanceof Error ? e.message : 'Gagal', 'error'); }
              }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1">
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
            <div className="bg-white rounded-2xl border divide-y">
              {companyTypes.map(ct => (
                <div key={ct.id} className="p-4 flex flex-wrap items-center gap-3">
                  <input defaultValue={ct.label} onBlur={async e => {
                    try { await updateCompanyType(ct.id, { label: e.target.value }); loadTypes(); } catch { /* */ }
                  }} className="font-semibold border-b border-transparent focus:border-emerald-300 outline-none" />
                  <code className="text-xs bg-slate-100 px-2 py-1 rounded">{ct.slug}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ct.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {ct.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button type="button" onClick={async () => {
                    await updateCompanyType(ct.id, { is_active: !ct.is_active });
                    loadTypes();
                  }} className="text-xs text-emerald-600 ml-auto">Toggle aktif</button>
                  <button type="button" onClick={async () => {
                    if (!confirm('Hapus jenis ini?')) return;
                    await deleteCompanyType(ct.id);
                    loadTypes();
                  }} className="text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'platform' && (
          <div className="bg-white rounded-2xl p-6 border space-y-4 max-w-lg">
            <h3 className="font-bold">Pengaturan AI & Billing</h3>
            <div>
              <label className="text-xs text-slate-500">Kuota fallback Gemini platform / user / hari</label>
              <input type="number" value={platformSettings.platform_gemini_daily_fallback}
                onChange={e => setPlatformSettings({ ...platformSettings, platform_gemini_daily_fallback: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Default AI daily limit (user tanpa key)</label>
              <input type="number" value={platformSettings.default_ai_daily_limit}
                onChange={e => setPlatformSettings({ ...platformSettings, default_ai_daily_limit: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Checkout bulanan URL</label>
              <input value={String(appConfig.checkout_monthly_url || '')} onChange={e => setAppConfig({ ...appConfig, checkout_monthly_url: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Checkout lifetime URL</label>
              <input value={String(appConfig.checkout_lifetime_url || '')} onChange={e => setAppConfig({ ...appConfig, checkout_lifetime_url: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" />
            </div>
            <button type="button" onClick={savePlatform} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold">
              <Save className="w-4 h-4" /> Simpan
            </button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold">Edit: {selectedUser.email}</h3>
            <input value={String(editForm.name || '')} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nama" className="w-full px-3 py-2 border rounded-xl text-sm" />
            <select value={String(editForm.plan_type || 'none')} onChange={e => setEditForm({ ...editForm, plan_type: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm">
              <option value="none">none</option>
              <option value="monthly">monthly</option>
              <option value="lifetime">lifetime</option>
            </select>
            <input type="number" value={Number(editForm.ai_daily_limit || 0)} onChange={e => setEditForm({ ...editForm, ai_daily_limit: Number(e.target.value) })}
              placeholder="AI daily limit" className="w-full px-3 py-2 border rounded-xl text-sm" />
            <select value={String(editForm.profile_role || 'user')} onChange={e => setEditForm({ ...editForm, profile_role: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <select value={String(editForm.status || 'active')} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm">
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="pending">pending</option>
            </select>
            <input type="password" placeholder="Password baru (opsional)" onChange={e => setEditForm({ ...editForm, new_password: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm" />
            <input placeholder="Gemini API key (kosongkan = tidak ubah)" onChange={e => setEditForm({ ...editForm, gemini_key: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm font-mono" />
            <textarea placeholder="Catatan admin" onChange={e => setEditForm({ ...editForm, admin_notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm h-20" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked onChange={e => setEditForm({ ...editForm, email_notifications: e.target.checked })} />
              Email notif
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked onChange={e => setEditForm({ ...editForm, push_notifications: e.target.checked })} />
              Push notif
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 py-2 border rounded-xl">Batal</button>
              <button type="button" onClick={saveUser} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
