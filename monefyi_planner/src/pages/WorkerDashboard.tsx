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
  recordAttendance, getUserTodayStatus, getOrgAttendance, formatAttendanceTime,
} from '../services/attendanceService';
import DemoBanner from '../components/DemoBanner';

export default function WorkerDashboard() {
  const { user, tenant, projects, activeTab, setActiveTab, setCommandModalOpen } = useAppStore();
  const showToast = useUiStore(s => s.showToast);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [status, setStatus] = useState({ checkedIn: false, checkInTime: undefined as string | undefined, checkOutTime: undefined as string | undefined });
  const [history, setHistory] = useState<ReturnType<typeof getOrgAttendance>>([]);

  const workerTab = (['home', 'attendance', 'payroll', 'todos'] as const).includes(
    activeTab as 'home' | 'attendance' | 'payroll' | 'todos',
  )
    ? (activeTab as 'home' | 'attendance' | 'payroll' | 'todos')
    : 'home';

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const refreshStatus = useCallback(() => {
    if (!user?.id || !tenant?.id) return;
    setStatus(getUserTodayStatus(user.id, tenant.id));
    setHistory(getOrgAttendance(tenant.id, 30).filter(r => r.user_id === user.id));
  }, [user?.id, tenant?.id]);

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
  const defaultProject = projects[0]?.name;

  const handleCheckIn = () => {
    if (!user?.id || !tenant?.id) return;
    recordAttendance({
      user_id: user.id,
      user_name: user.name || 'Karyawan',
      org_id: tenant.id,
      type: 'check_in',
      project_name: defaultProject,
    });
    refreshStatus();
    showToast('Check-in tercatat', 'success');
  };

  const handleCheckOut = () => {
    if (!user?.id || !tenant?.id) return;
    recordAttendance({
      user_id: user.id,
      user_name: user.name || 'Karyawan',
      org_id: tenant.id,
      type: 'check_out',
      project_name: defaultProject,
    });
    refreshStatus();
    showToast('Check-out tercatat', 'success');
  };

  const handleProgressChange = async (wi: WorkItem, pct: number) => {
    setUpdatingId(wi.id);
    try {
      await updateWorkItem(wi.id, { progress_pct: pct });
      setWorkItems(prev => prev.map(w => w.id === wi.id ? { ...w, progress_pct: pct } : w));
      showToast(`Progress ${wi.name}: ${pct}%`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal update', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBonRequest = () => {
    showToast('Fitur ajukan bon akan tersedia di versi berikutnya', 'info');
  };

  const daysPresent = new Set(history.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10))).size;

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <DemoBanner />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Halo,</div>
            <h1 className="text-2xl font-black text-slate-900">{user?.name?.split(' ')[0]} 👷</h1>
            <div className="text-xs text-slate-400 mt-0.5">{dateStr}</div>
          </div>
          <button type="button" onClick={() => { refreshStatus(); loadTasks(); }} className="p-2 border rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-1.5 text-xs font-semibold rounded-xl ${workerTab === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {workerTab === 'home' && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 text-white ${status.checkedIn ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : status.checkOutTime ? 'bg-gradient-to-br from-slate-500 to-slate-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'}`}>
            <div className="text-white/80 text-sm mb-1">Status Hari Ini</div>
            <div className="font-black text-xl">
              {status.checkedIn
                ? `✅ Check In ${status.checkInTime}`
                : status.checkOutTime
                  ? `🏁 Selesai ${status.checkOutTime}`
                  : '⏰ Belum Check In'}
            </div>
            {!status.checkedIn && !status.checkOutTime && (
              <button onClick={handleCheckIn} className="w-full mt-4 py-3.5 bg-white text-indigo-700 font-black rounded-xl">📍 CHECK IN</button>
            )}
            {status.checkedIn && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3 text-emerald-100 text-sm">
                  <MapPin className="w-4 h-4" /> {defaultProject || 'Lokasi proyek'}
                </div>
                <button onClick={handleCheckOut} className="w-full py-3 bg-white/20 border border-white/30 text-white font-bold rounded-xl">🏁 Check Out</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-indigo-600">{activeTasks.length}</div>
              <div className="text-xs text-slate-500">Task Aktif</div>
            </div>
            <div className="bg-white border rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-600">{daysPresent}</div>
              <div className="text-xs text-slate-500">Hari Hadir (30d)</div>
            </div>
          </div>

          <div>
            <h2 className="font-bold text-slate-800 mb-3">Pekerjaan Aktif</h2>
            {loading && activeTasks.length === 0 ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
            ) : activeTasks.length === 0 ? (
              <p className="text-sm text-slate-400 bg-white border rounded-xl p-4 text-center">Belum ada pekerjaan dari proyek. Owner/manager perlu menambahkan work items.</p>
            ) : activeTasks.slice(0, 5).map(wi => (
              <div key={wi.id} className="bg-white border rounded-2xl p-4 mb-3">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{wi.name}</div>
                    <div className="text-xs text-slate-400">{projectName(wi.project_id)}</div>
                  </div>
                  <span className="font-black text-indigo-600">{Number(wi.progress_pct) || 0}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Number(wi.progress_pct) || 0}
                  disabled={updatingId === wi.id}
                  onChange={e => handleProgressChange(wi, Number(e.target.value))}
                  className="w-full accent-indigo-600 mb-2"
                />
                <button onClick={() => { setCommandModalOpen(true); showToast(`Gunakan: update progress ${wi.name} 75%`, 'info'); }} className="w-full py-2 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Update via Monefyi Button
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {workerTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-slate-800">Riwayat Absensi</h3>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat. Check-in dari tab Home.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.slice(0, 30).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                    <div>
                      <div className="font-medium">{r.type === 'check_in' ? 'Check In' : 'Check Out'}</div>
                      <div className="text-xs text-slate-400">{formatAttendanceTime(r.timestamp)}</div>
                    </div>
                    <Clock className={`w-4 h-4 ${r.type === 'check_in' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400 text-center">Data absensi disimpan lokal (MVP). Modul HR penuh akan sinkron ke cloud.</p>
        </div>
      )}

      {workerTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-2xl p-5">
            <Wallet className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800 text-center">Payroll & Bon</h3>
            <p className="text-sm text-slate-600 text-center mt-2">Modul gaji belum terhubung database.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-lg font-black text-slate-300">—</div>
                <div className="text-xs text-slate-500">Gaji Bulan Ini</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-lg font-black text-slate-400">0</div>
                <div className="text-xs text-slate-500">Bon Pending</div>
              </div>
            </div>
            <button onClick={handleBonRequest} className="mt-4 w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-600 font-bold rounded-xl text-sm">
              Ajukan Bon / Pinjaman
            </button>
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
                    <div className="text-xs text-slate-400">{projectName(wi.project_id)} · deadline {wi.planned_end || '—'}</div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Number(wi.progress_pct) || 0}%` }} /></div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">{Number(wi.progress_pct) || 0}%</span>
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
