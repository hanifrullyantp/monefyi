import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Clock, CheckCircle, Circle, Wallet, TrendingUp,
  Calendar, RefreshCw, Loader2,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { loadWorkItemsForOrg, updateWorkItem } from '../services/workItemService';
import type { WorkItem } from '../services/workItemService';
import {
  recordAttendance,
  getUserTodayStatus,
  getUserAttendance,
  formatAttendanceTime,
  formatCurrency,
  resolveAttendanceLocation,
  getPartialDays,
  getMonthlySummary,
  type AttendanceRecord,
} from '../services/attendanceService';
import { loadOrgDetails } from '../services/orgService';
import { parseAttendanceSettings, type AttendanceSettings } from '../utils/attendanceSettings';
import { useAttendanceAutomation } from '../hooks/useAttendanceAutomation';
import {
  getUserPayrollForMonth,
  listBonRequests,
  createBonRequest,
} from '../services/payrollService';
import type { PayrollEntry, BonRequest } from '../services/payrollService';
import WorkerWorkTimer from '../components/worker/WorkerWorkTimer';

export default function WorkerDashboard() {
  const { user, tenant, projects, activeTab, setActiveTab, setCommandModalOpen } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [status, setStatus] = useState({
    checkedIn: false,
    checkInTime: undefined as string | undefined,
    checkOutTime: undefined as string | undefined,
    checkInAtIso: undefined as string | undefined,
    checkOutAtIso: undefined as string | undefined,
  });
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry | null>(null);
  const [bonRequests, setBonRequests] = useState<BonRequest[]>([]);
  const [bonAmount, setBonAmount] = useState('');
  const [bonReason, setBonReason] = useState('');
  const [bonSubmitting, setBonSubmitting] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null);
  const [partialDays, setPartialDays] = useState<ReturnType<typeof getPartialDays>>([]);
  const [monthDaysPresent, setMonthDaysPresent] = useState(0);

  const workerTab = (['home', 'attendance', 'payroll', 'todos'] as const).includes(
    activeTab as 'home' | 'attendance' | 'payroll' | 'todos',
  )
    ? (activeTab as 'home' | 'attendance' | 'payroll' | 'todos')
    : 'home';

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const refreshStatus = useCallback(async () => {
    if (!user?.id || !tenant?.id || tenant.id === 'demo') return;
    setAttendanceLoading(true);
    try {
      const [todayStatus, records, pay, bons, orgDetails] = await Promise.all([
        getUserTodayStatus(user.id, tenant.id),
        getUserAttendance(user.id, tenant.id, 31),
        getUserPayrollForMonth(tenant.id, user.id),
        listBonRequests(tenant.id),
        loadOrgDetails(tenant.id).catch(() => null),
      ]);
      const attSettings = parseAttendanceSettings(orgDetails?.settings as Record<string, unknown>);
      setAttendanceSettings(attSettings);
      setPartialDays(getPartialDays(records, attSettings.hours_per_day));
      const summary = await getMonthlySummary(user.id, tenant.id, attSettings.hours_per_day);
      setMonthDaysPresent(summary.daysPresent);
      setStatus(todayStatus);
      setHistory(records);
      setPayroll(pay);
      setBonRequests(bons.filter(b => b.user_id === user.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat absensi', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  }, [user?.id, tenant?.id, showToast]);

  const loadTasks = useCallback(async () => {
    if (!tenant?.id || tenant.id === 'demo') return;
    setLoading(true);
    try {
      const items = await loadWorkItemsForOrg(tenant.id);
      setWorkItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    refreshStatus();
    loadTasks();
  }, [refreshStatus, loadTasks]);

  const activeTasks = workItems.filter(wi => (Number(wi.progress_pct) || 0) < 100);
  const doneTasks = workItems.filter(wi => (Number(wi.progress_pct) || 0) >= 100);
  const projectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Proyek';
  const defaultProject = projects[0];
  const defaultProjectName = defaultProject?.name;

  const handleCheckIn = async () => {
    if (!user?.id || !tenant?.id) return;
    setAttendanceLoading(true);
    try {
      const settings = attendanceSettings || parseAttendanceSettings(null);
      const loc = await resolveAttendanceLocation(settings);
      if (loc.message && loc.isOffsite && settings.warn_offsite) {
        showToast(loc.message, 'info');
      } else if (loc.message && !loc.isOffsite) {
        showToast(loc.message, 'info');
      }
      await recordAttendance({
        user_id: user.id,
        user_name: user.name || 'Karyawan',
        org_id: tenant.id,
        type: 'check_in',
        project_id: defaultProject?.id,
        project_name: defaultProjectName,
        latitude: loc.position?.latitude,
        longitude: loc.position?.longitude,
        location_accuracy: loc.position?.accuracy,
        is_offsite: loc.isOffsite,
        source: loc.isOffsite ? 'manual' : (settings.geofence_enabled ? 'geofence' : 'manual'),
      });
      await refreshStatus();
      showToast(loc.isOffsite ? 'Check-in tercatat (luar lokasi)' : 'Check-in tercatat', loc.isOffsite ? 'info' : 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal check-in', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.id || !tenant?.id) return;
    setAttendanceLoading(true);
    try {
      const settings = attendanceSettings || parseAttendanceSettings(null);
      const loc = await resolveAttendanceLocation(settings);
      if (loc.isOffsite && settings.warn_offsite) {
        showToast('Check-out di luar lokasi kerja.', 'info');
      }
      await recordAttendance({
        user_id: user.id,
        user_name: user.name || 'Karyawan',
        org_id: tenant.id,
        type: 'check_out',
        project_id: defaultProject?.id,
        project_name: defaultProjectName,
        latitude: loc.position?.latitude,
        longitude: loc.position?.longitude,
        location_accuracy: loc.position?.accuracy,
        is_offsite: loc.isOffsite,
      });
      await refreshStatus();
      showToast('Check-out tercatat', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal check-out', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  };

  useAttendanceAutomation({
    enabled: !!tenant?.id && tenant.id !== 'demo',
    orgId: tenant?.id || '',
    userId: user?.id || '',
    userName: user?.name,
    settings: attendanceSettings || parseAttendanceSettings(null),
    checkedIn: status.checkedIn,
    projectId: defaultProject?.id,
    projectName: defaultProjectName,
    onStatusChange: refreshStatus,
    onNotify: (message, type) => showToast(message, type),
  });

  const handleProgressChange = async (wi: WorkItem, pct: number) => {
    setUpdatingId(wi.id);
    try {
      await updateWorkItem(wi.id, { progress_pct: pct });
      setWorkItems(prev => prev.map(w => (w.id === wi.id ? { ...w, progress_pct: pct } : w)));
      showToast(`Progress ${wi.name}: ${pct}%`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBonRequest = async () => {
    if (!user?.id || !tenant?.id) return;
    const amount = Number(bonAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      showToast('Masukkan nominal bon yang valid', 'error');
      return;
    }
    setBonSubmitting(true);
    try {
      await createBonRequest(tenant.id, user.id, amount, bonReason.trim() || undefined);
      setBonAmount('');
      setBonReason('');
      await refreshStatus();
      showToast('Pengajuan bon terkirim', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mengajukan bon', 'error');
    } finally {
      setBonSubmitting(false);
    }
  };

  const pendingBon = bonRequests.filter(b => b.status === 'pending').length;
  const hoursPerDay = attendanceSettings?.hours_per_day ?? 8;

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Halo,</div>
            <h1 className="text-2xl font-black text-slate-900">{user?.name?.split(' ')[0]} 👷</h1>
            <div className="text-xs text-slate-400 mt-0.5">{dateStr}</div>
          </div>
          <button
            type="button"
            onClick={() => { refreshStatus(); loadTasks(); }}
            className="p-2 border rounded-xl hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading || attendanceLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {[
          { id: 'home', label: '🏠 Home' },
          { id: 'attendance', label: '🕐 Absensi' },
          { id: 'payroll', label: '💵 Gaji' },
          { id: 'todos', label: '✅ Task' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl ${workerTab === tab.id ? 'bg-white text-org-dark shadow-sm' : 'text-slate-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {workerTab === 'home' && (
        <div className="space-y-4">
          <WorkerWorkTimer
            checkedIn={status.checkedIn}
            checkInAtIso={status.checkInAtIso}
            checkOutAtIso={status.checkOutAtIso}
            checkInTimeLabel={status.checkInTime}
            checkOutTimeLabel={status.checkOutTime}
            projectName={defaultProjectName}
            loading={attendanceLoading}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            shiftStart={tenant?.workHours?.start}
            shiftEnd={tenant?.workHours?.end}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-org-primary">{activeTasks.length}</div>
              <div className="text-xs text-slate-500">Task Aktif</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-org-primary">{monthDaysPresent}</div>
              <div className="text-xs text-slate-500">Hari Hadir (bulan ini)</div>
            </div>
          </div>

          {partialDays.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <div className="font-bold mb-1">Jam kerja kurang dari {hoursPerDay} jam</div>
              {partialDays.slice(0, 4).map(d => (
                <div key={d.date}>{d.date}: {d.hoursWorked}j{d.checkIn ? ` (${d.checkIn}` : ''}{d.checkOut ? `–${d.checkOut})` : d.checkIn ? ')' : ''}</div>
              ))}
            </div>
          )}

          {attendanceSettings?.auto_wifi_checkin && (
            <p className="text-[11px] text-slate-400 text-center">Auto absensi WiFi kantor aktif</p>
          )}

          <div>
            <h2 className="font-bold text-slate-800 mb-3">Pekerjaan Aktif</h2>
            {loading && activeTasks.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
            ) : activeTasks.length === 0 ? (
              <p className="text-sm text-slate-400 bg-white border rounded-xl p-4 text-center">
                Belum ada pekerjaan dari proyek. Owner/manager perlu menambahkan work items.
              </p>
            ) : (
              activeTasks.slice(0, 5).map(wi => (
                <div key={wi.id} className="bg-white border rounded-2xl p-4 mb-3">
                  <div className="flex justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{wi.name}</div>
                      <div className="text-xs text-slate-400">{projectName(wi.project_id)}</div>
                    </div>
                    <span className="font-black text-org-primary">{Number(wi.progress_pct) || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Number(wi.progress_pct) || 0}
                    disabled={updatingId === wi.id}
                    onChange={e => handleProgressChange(wi, Number(e.target.value))}
                    className="w-full accent-org mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCommandModalOpen(true);
                      showToast(`Gunakan: update progress ${wi.name} 75%`, 'info');
                    }}
                    className="w-full py-2 border border-org-soft text-org-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Update via Monefyi Button
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {workerTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-org-primary" />
              <h3 className="font-bold text-slate-800">Riwayat Absensi</h3>
            </div>
            {attendanceLoading && history.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat. Check-in dari tab Home.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(0, 30).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                    <div>
                      <div className="font-medium">{r.type === 'check_in' ? 'Check In' : 'Check Out'}</div>
                      <div className="text-xs text-slate-400">
                        {formatAttendanceTime(r.timestamp)}
                        {r.project_name ? ` · ${r.project_name}` : ''}
                      </div>
                    </div>
                    <Clock className={`w-4 h-4 ${r.type === 'check_in' ? 'text-org-primary' : 'text-slate-400'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {workerTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5">
            <Wallet className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-center">Payroll & Bon</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-lg font-black text-emerald-600">
                  {payroll ? formatCurrency(payroll.net_amount) : '—'}
                </div>
                <div className="text-xs text-slate-500">Gaji Bulan Ini</div>
                {payroll && (
                  <div className="text-[10px] text-slate-400 mt-1">
                    {payroll.days_present} hari hadir · {payroll.status}
                  </div>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-lg font-black text-amber-600">{pendingBon}</div>
                <div className="text-xs text-slate-500">Bon Pending</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                inputMode="numeric"
                value={bonAmount}
                onChange={e => setBonAmount(e.target.value)}
                placeholder="Nominal bon (Rp)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                type="text"
                value={bonReason}
                onChange={e => setBonReason(e.target.value)}
                placeholder="Alasan (opsional)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button
                type="button"
                onClick={handleBonRequest}
                disabled={bonSubmitting}
                className="w-full py-3 bg-org-primary text-org-on-primary font-bold rounded-xl text-sm disabled:opacity-60"
              >
                Ajukan Bon / Pinjaman
              </button>
            </div>

            {bonRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-500">Riwayat pengajuan</p>
                {bonRequests.slice(0, 5).map(b => (
                  <div key={b.id} className="flex justify-between text-xs">
                    <span>{formatCurrency(b.amount)}</span>
                    <span className="capitalize text-slate-500">{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {workerTab === 'todos' && (
        <div className="space-y-3">
          {activeTasks.length === 0 && doneTasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada task</p>
          ) : (
            <>
              {activeTasks.map(wi => (
                <div key={wi.id} className="bg-white border rounded-xl p-4 flex items-center gap-3">
                  <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{wi.name}</div>
                    <div className="text-xs text-slate-400">
                      {projectName(wi.project_id)} · deadline {wi.planned_end || '—'}
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Number(wi.progress_pct) || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">{Number(wi.progress_pct) || 0}%</span>
                </div>
              ))}
              {doneTasks.map(wi => (
                <div key={wi.id} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 opacity-80">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium line-through text-slate-500">{wi.name}</div>
                    <div className="text-xs text-emerald-600">Selesai</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
