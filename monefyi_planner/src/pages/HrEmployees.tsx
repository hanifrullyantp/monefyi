import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Loader2, RefreshCw, Clock, Wallet, Briefcase,
  CheckCircle2, XCircle, AlertCircle, Search, UserCheck,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { listMembers, changeMemberRole, removeMember, transferOwnership, updateOrgAccessSettings } from '../services/memberService';
import { listJoinRequests, approveJoinRequest, rejectJoinRequest } from '../services/joinRequestService';
import { listAuditLogs, exportAuditCsv } from '../services/auditService';
import { loadWorkerLogsForOrg } from '../services/dailyLogService';
import { loadWorkItemsForOrg } from '../services/workItemService';
import {
  groupTodayByUser, getOrgAttendance, formatAttendanceTime,
} from '../services/attendanceService';
import InviteMemberModal from '../components/team/InviteMemberModal';
import DemoBanner from '../components/DemoBanner';
import { showToast } from '../store/uiStore';
import type { OrgMember, JoinRequest, AuditLogEntry } from '../types/onboarding';
import type { DailyLog } from '../services/dailyLogService';

type HrTab = 'overview' | 'karyawan' | 'absensi' | 'payroll' | 'requests' | 'audit' | 'access';
type RoleFilter = 'all' | 'worker' | 'manager' | 'owner';

function lastSeenLabel(iso?: string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 300000) return 'Online';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m lalu`;
  return `${Math.floor(mins / 60)}j lalu`;
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    owner: 'bg-violet-100 text-violet-700',
    manager: 'bg-indigo-100 text-indigo-700',
    worker: 'bg-emerald-100 text-emerald-700',
  };
  return map[role] || 'bg-slate-100 text-slate-600';
}

export default function HrEmployees() {
  const { tenant, user, projects } = useAppStore();
  const [tab, setTab] = useState<HrTab>('overview');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [workerLogs, setWorkerLogs] = useState<DailyLog[]>([]);
  const [workItemCount, setWorkItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [access, setAccess] = useState({
    allow_join_request: true,
    allow_email_domain_signup: false,
    allowed_email_domains: '',
    default_role_for_domain: 'worker',
    is_public_discoverable: false,
  });

  const isOwner = user?.role === 'owner';
  const canInvite = isOwner || user?.role === 'manager';

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [m, r, a, logs, items] = await Promise.all([
        listMembers(tenant.id),
        canInvite ? listJoinRequests(tenant.id) : Promise.resolve([]),
        isOwner ? listAuditLogs(tenant.id) : Promise.resolve([]),
        loadWorkerLogsForOrg(tenant.id, 30),
        loadWorkItemsForOrg(tenant.id),
      ]);
      setMembers(m);
      setRequests(r);
      setAudit(a);
      setWorkerLogs(logs);
      setWorkItemCount(items.length);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, canInvite, isOwner]);

  useEffect(() => { load(); }, [load]);

  const workers = members.filter(m => m.role === 'worker');
  const managers = members.filter(m => m.role === 'manager');
  const todayAttendance = tenant?.id ? groupTodayByUser(tenant.id) : new Map();
  const checkedInToday = [...todayAttendance.values()].filter(v => v.status === 'in').length;
  const recentAttendance = tenant?.id ? getOrgAttendance(tenant.id, 7) : [];

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search || m.profile?.name?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [members, search, roleFilter]);

  const projectNameMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name])),
    [projects],
  );

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await changeMemberRole(memberId, role as 'manager' | 'worker');
      showToast('Role diperbarui', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Hapus anggota ini?')) return;
    try {
      await removeMember(memberId);
      showToast('Anggota dihapus', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    }
  };

  const tabs: { id: HrTab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Ringkasan', show: true },
    { id: 'karyawan', label: 'Karyawan', show: true },
    { id: 'absensi', label: 'Absensi', show: true },
    { id: 'payroll', label: 'Payroll', show: true },
    { id: 'requests', label: 'Join Requests', show: canInvite },
    { id: 'audit', label: 'Audit Log', show: isOwner },
    { id: 'access', label: 'Akses', show: isOwner },
  ];

  if (loading && !members.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" /> HR & Karyawan
          </h1>
          <p className="text-sm text-slate-500">{tenant?.name} · {members.length} anggota · {workers.length} karyawan lapangan</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canInvite && (
            <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">
              <UserPlus className="w-4 h-4" /> Undang Karyawan
            </button>
          )}
        </div>
      </div>

      <DemoBanner />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-600 border border-slate-100'}`}
          >
            {t.label}
            {t.id === 'requests' && requests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs">{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Anggota', value: members.length, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Karyawan', value: workers.length, icon: Briefcase, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Manager', value: managers.length, icon: UserCheck, color: 'text-violet-600 bg-violet-50' },
              { label: 'Check-in Hari Ini', value: checkedInToday, icon: Clock, color: 'text-amber-600 bg-amber-50' },
              { label: 'Work Items Aktif', value: workItemCount, icon: CheckCircle2, color: 'text-sky-600 bg-sky-50' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${kpi.color}`}>
                  <kpi.icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-500">{kpi.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Absensi Hari Ini
              </h3>
              {todayAttendance.size === 0 ? (
                <p className="text-sm text-slate-400">Belum ada check-in hari ini. Karyawan dapat check-in dari aplikasi mobile.</p>
              ) : (
                <div className="space-y-2">
                  {[...todayAttendance.entries()].slice(0, 6).map(([uid, info]) => (
                    <div key={uid} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                      <span className="font-medium">{info.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${info.status === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {info.status === 'in' ? `Masuk ${info.checkIn}` : info.checkOut ? `Keluar ${info.checkOut}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" /> Laporan Harian Proyek
              </h3>
              {workerLogs.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada log pekerja di proyek. Catat di daily log proyek.</p>
              ) : (
                <div className="space-y-2">
                  {workerLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="text-sm py-2 border-b border-slate-50 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-medium">{projectNameMap[log.project_id] || 'Proyek'}</span>
                        <span className="text-xs text-slate-400">{log.date}</span>
                      </div>
                      <div className="text-xs text-slate-500">{log.workers_present} pekerja · {log.work_description?.slice(0, 60) || '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {requests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4" />
                {requests.length} permintaan join menunggu persetujuan
              </div>
              <button type="button" onClick={() => setTab('requests')} className="text-sm font-bold text-amber-700">Review →</button>
            </div>
          )}
        </div>
      )}

      {tab === 'karyawan' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama..." className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as RoleFilter)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="all">Semua role</option>
              <option value="worker">Karyawan</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(m => {
              const att = todayAttendance.get(m.user_id);
              return (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-100 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                      {(m.profile?.name || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{m.profile?.name || '—'}</div>
                      <div className="text-xs text-slate-400 truncate">{m.position || m.department || '—'}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleBadge(m.role)}`}>{m.role}</span>
                        {att?.status === 'in' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">On site</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
                    <span>Last seen: {lastSeenLabel(m.last_active_at)}</span>
                    <div className="flex gap-2">
                      {isOwner && m.role !== 'owner' && m.user_id !== user?.id && (
                        <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)} className="text-xs border rounded-lg px-1.5 py-0.5">
                          <option value="manager">Manager</option>
                          <option value="worker">Worker</option>
                        </select>
                      )}
                      {m.role !== 'owner' && m.user_id !== user?.id && (isOwner || (user?.role === 'manager' && m.role === 'worker')) && (
                        <button type="button" onClick={() => handleRemove(m.id)} className="text-rose-600 font-semibold">Hapus</button>
                      )}
                      {isOwner && m.role === 'manager' && (
                        <button type="button" onClick={() => transferOwnership(tenant!.id, m.id).then(() => { showToast('Ownership transferred', 'success'); load(); })} className="text-indigo-600 font-semibold">Transfer</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada karyawan.</p>
              {canInvite && (
                <button type="button" onClick={() => setInviteOpen(true)} className="mt-3 text-indigo-600 font-semibold text-sm">
                  Undang karyawan pertama →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'absensi' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Check-in/out dari karyawan (MVP lokal per browser). Laporan proyek dari daily log database.</p>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 font-bold text-slate-800">Riwayat Check-in (7 hari)</div>
            {recentAttendance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada data absensi.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentAttendance.slice(0, 20).map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{r.user_name}</div>
                      <div className="text-xs text-slate-400">{formatAttendanceTime(r.timestamp)}{r.project_name ? ` · ${r.project_name}` : ''}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.type === 'check_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {r.type === 'check_in' ? 'Check In' : 'Check Out'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 font-bold text-slate-800">Kehadiran dari Daily Log Proyek</div>
            {workerLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Belum ada log pekerja.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Proyek</th>
                    <th className="p-3">Pekerja</th>
                    <th className="p-3 hidden md:table-cell">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {workerLogs.map(log => (
                    <tr key={log.id} className="border-t border-slate-50">
                      <td className="p-3">{log.date}</td>
                      <td className="p-3">{projectNameMap[log.project_id] || '—'}</td>
                      <td className="p-3 font-semibold">{log.workers_present}</td>
                      <td className="p-3 hidden md:table-cell text-slate-500 truncate max-w-xs">{log.work_description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <DemoBanner />
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'Gaji Bulan Ini', value: '—', sub: 'Modul payroll belum aktif' },
              { label: 'Bon Pending', value: '0', sub: 'Tidak ada pengajuan' },
              { label: 'THR / Bonus', value: '—', sub: 'Coming soon' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl border border-slate-100 p-5">
                <Wallet className="w-5 h-5 text-indigo-400 mb-2" />
                <div className="text-2xl font-black text-slate-300">{item.value}</div>
                <div className="font-semibold text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400 mt-1">{item.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700">Modul Payroll & Bon</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Fitur gaji, slip, dan pengajuan bon akan terhubung ke database di versi berikutnya.
              Saat ini karyawan dapat melihat tab Payroll di dashboard mereka.
            </p>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{r.profile?.name || r.user_id}</div>
                {r.message && <p className="text-sm text-slate-500">{r.message}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={async () => { await approveJoinRequest(r.id); showToast('Disetujui', 'success'); load(); }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button type="button" onClick={async () => { await rejectJoinRequest(r.id, 'Ditolak owner'); showToast('Ditolak', 'info'); load(); }} className="px-3 py-1.5 border rounded-lg text-xs flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-slate-500">Tidak ada permintaan pending.</p>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-3">
          <button type="button" onClick={() => { const csv = exportAuditCsv(audit); const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit.csv'; a.click(); }} className="text-sm text-indigo-600 font-semibold">Export CSV</button>
          {audit.map(l => (
            <div key={l.id} className="bg-white p-3 rounded-xl border border-slate-100 text-sm">
              <div className="font-mono text-xs text-slate-400">{l.created_at}</div>
              <div className="font-semibold">{l.action}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'access' && isOwner && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 max-w-lg">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={access.allow_join_request} onChange={e => setAccess({ ...access, allow_join_request: e.target.checked })} />
            Izinkan request join
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={access.is_public_discoverable} onChange={e => setAccess({ ...access, is_public_discoverable: e.target.checked })} />
            Tampilkan di public directory
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={access.allow_email_domain_signup} onChange={e => setAccess({ ...access, allow_email_domain_signup: e.target.checked })} />
            Auto-join by email domain
          </label>
          {access.allow_email_domain_signup && (
            <>
              <input value={access.allowed_email_domains} onChange={e => setAccess({ ...access, allowed_email_domains: e.target.value })} placeholder="domain.com, perusahaan.co.id" className="w-full px-4 py-2 rounded-xl border text-sm" />
              <select value={access.default_role_for_domain} onChange={e => setAccess({ ...access, default_role_for_domain: e.target.value })} className="w-full px-4 py-2 rounded-xl border text-sm">
                <option value="worker">Default: Worker</option>
                <option value="manager">Default: Manager</option>
              </select>
            </>
          )}
          <button
            type="button"
            onClick={async () => {
              await updateOrgAccessSettings(tenant!.id, {
                ...access,
                allowed_email_domains: access.allowed_email_domains.split(',').map(d => d.trim()).filter(Boolean),
              });
              showToast('Pengaturan disimpan', 'success');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
          >
            Simpan
          </button>
        </div>
      )}

      {inviteOpen && tenant && user && (
        <InviteMemberModal orgId={tenant.id} actorRole={user.role} onClose={() => setInviteOpen(false)} onCreated={load} />
      )}
    </div>
  );
}
