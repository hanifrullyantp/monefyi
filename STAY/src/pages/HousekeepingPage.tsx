import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { formatDateTime } from '../utils/format';
import { ClipboardList, Plus, CheckCircle, Clock, Brush } from 'lucide-react';
import type { HousekeepingStatus, HousekeepingTask } from '../types';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const statusConfig: Record<HousekeepingStatus, { label: string; badge: 'warning' | 'info' | 'success' | 'gray'; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Menunggu', badge: 'warning', icon: <Clock className="h-4 w-4" />, color: 'border-l-amber-400' },
  in_progress: { label: 'Sedang Dikerjakan', badge: 'info', icon: <Brush className="h-4 w-4" />, color: 'border-l-sky-400' },
  done: { label: 'Selesai', badge: 'success', icon: <CheckCircle className="h-4 w-4" />, color: 'border-l-emerald-400' },
  verified: { label: 'Terverifikasi', badge: 'gray', icon: <CheckCircle className="h-4 w-4" />, color: 'border-l-slate-400' },
};

const typeLabel: Record<HousekeepingTask['type'], string> = {
  checkout_cleaning: '🧹 Bersih Setelah Checkout',
  daily_cleaning: '🌅 Kebersihan Harian',
  maintenance: '🔧 Perawatan/Perbaikan',
  inspection: '🔍 Inspeksi Kamar',
};

export default function HousekeepingPage() {
  const { housekeepingTasks, rooms, users, updateHousekeepingTask, addHousekeepingTask } = useAppStore();
  const { tenant, user } = useAuthStore();
  const [filter, setFilter] = useState<HousekeepingStatus | 'all'>('all');
  const [selected, setSelected] = useState<HousekeepingTask | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    roomId: rooms[0]?.id || '',
    type: 'daily_cleaning' as HousekeepingTask['type'],
    notes: '',
    assignedTo: user?.id || '',
  });

  const filtered = filter === 'all' ? housekeepingTasks : housekeepingTasks.filter(t => t.status === filter);

  const updateStatus = (taskId: string, status: HousekeepingStatus) => {
    updateHousekeepingTask(taskId, {
      status,
      completedAt: status === 'done' ? new Date().toISOString() : undefined,
    });
    if (selected?.id === taskId) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const handleAddTask = () => {
    if (!newTask.roomId || !tenant) return;
    addHousekeepingTask({
      tenantId: tenant.id,
      roomId: newTask.roomId,
      assignedTo: newTask.assignedTo || undefined,
      status: 'pending',
      type: newTask.type,
      notes: newTask.notes,
      scheduledAt: new Date().toISOString(),
    });
    setShowAddModal(false);
    setNewTask({ roomId: rooms[0]?.id || '', type: 'daily_cleaning', notes: '', assignedTo: user?.id || '' });
  };

  const stats = [
    { label: 'Menunggu', count: housekeepingTasks.filter(t => t.status === 'pending').length, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Dikerjakan', count: housekeepingTasks.filter(t => t.status === 'in_progress').length, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Selesai', count: housekeepingTasks.filter(t => t.status === 'done').length, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Housekeeping</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen kebersihan dan perawatan</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
          Tambah Tugas
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={cn('rounded-2xl border border-slate-100 shadow-sm p-4 text-center', s.bg)}>
            <div className={cn('text-2xl font-bold', s.color)}>{s.count}</div>
            <div className="text-xs text-slate-600 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'in_progress', 'done', 'verified'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
              filter === status
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {status === 'all' ? 'Semua' : statusConfig[status].label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map(task => {
          const room = rooms.find(r => r.id === task.roomId);
          const cfg = statusConfig[task.status];
          return (
            <button
              key={task.id}
              onClick={() => { setSelected(task); setShowModal(true); }}
              className={cn('w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left border-l-4', cfg.color)}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">Kamar {room?.number || task.roomId}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{typeLabel[task.type]}</p>
                </div>
                <Badge variant={cfg.badge}>{cfg.label}</Badge>
              </div>
              {task.notes && <p className="text-xs text-slate-500 mt-2">{task.notes}</p>}
              <p className="text-[10px] text-slate-400 mt-2">{formatDateTime(task.scheduledAt)}</p>
            </button>
          );
        })}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Detail Tugas" size="sm">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{typeLabel[selected.type]}</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(statusConfig) as [HousekeepingStatus, typeof statusConfig[HousekeepingStatus]][]).map(([st, c]) => (
                <button
                  key={st}
                  onClick={() => updateStatus(selected.id, st)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
                    selected.status === st ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200'
                  )}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Tugas Housekeeping" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Kamar</label>
            <select
              value={newTask.roomId}
              onChange={(e) => setNewTask({ ...newTask, roomId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>Kamar {r.number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Tipe Tugas</label>
            <select
              value={newTask.type}
              onChange={(e) => setNewTask({ ...newTask, type: e.target.value as HousekeepingTask['type'] })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {Object.entries(typeLabel).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Staff</label>
            <select
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Catatan"
            value={newTask.notes}
            onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
            placeholder="Instruksi khusus..."
          />
          <Button className="w-full" onClick={handleAddTask}>Buat Tugas</Button>
        </div>
      </Modal>
    </div>
  );
}
