import { useState } from 'react';
import { mockHousekeepingTasks } from '../data/mockData';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { formatDateTime } from '../utils/format';
import { ClipboardList, Plus, CheckCircle, Clock, Brush } from 'lucide-react';
import type { HousekeepingStatus } from '../types';
import { cn } from '../utils/cn';

type Task = typeof mockHousekeepingTasks[0];

const statusConfig: Record<HousekeepingStatus, { label: string; badge: 'warning' | 'info' | 'success' | 'gray'; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Menunggu', badge: 'warning', icon: <Clock className="h-4 w-4" />, color: 'border-l-amber-400' },
  in_progress: { label: 'Sedang Dikerjakan', badge: 'info', icon: <Brush className="h-4 w-4" />, color: 'border-l-sky-400' },
  done: { label: 'Selesai', badge: 'success', icon: <CheckCircle className="h-4 w-4" />, color: 'border-l-emerald-400' },
  verified: { label: 'Terverifikasi', badge: 'gray', icon: <CheckCircle className="h-4 w-4" />, color: 'border-l-slate-400' },
};

const typeLabel: Record<Task['type'], string> = {
  checkout_cleaning: '🧹 Bersih Setelah Checkout',
  daily_cleaning: '🌅 Kebersihan Harian',
  maintenance: '🔧 Perawatan/Perbaikan',
  inspection: '🔍 Inspeksi Kamar',
};

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState(mockHousekeepingTasks);
  const [filter, setFilter] = useState<HousekeepingStatus | 'all'>('all');
  const [selected, setSelected] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const updateStatus = (taskId: string, status: HousekeepingStatus) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status, completedAt: status === 'done' ? new Date().toISOString() : t.completedAt }
        : t
    ));
    if (selected?.id === taskId) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const stats = [
    { label: 'Menunggu', count: tasks.filter(t => t.status === 'pending').length, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Dikerjakan', count: tasks.filter(t => t.status === 'in_progress').length, color: 'text-sky-500', bg: 'bg-sky-50' },
    { label: 'Selesai', count: tasks.filter(t => t.status === 'done').length, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Housekeeping</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen kebersihan dan perawatan</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>
          Tambah Tugas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className={cn('rounded-2xl border border-slate-100 shadow-sm p-4 text-center', s.bg)}>
            <div className={cn('text-2xl font-bold', s.color)}>{s.count}</div>
            <div className="text-xs text-slate-600 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'in_progress', 'done', 'verified'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
              filter === status
                ? 'bg-sky-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {status === 'all' ? 'Semua' : statusConfig[status].label}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <ClipboardList className="h-12 w-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada tugas ditemukan</p>
          </div>
        ) : (
          filtered.map(task => {
            const cfg = statusConfig[task.status];
            return (
              <button
                key={task.id}
                onClick={() => { setSelected(task); setShowModal(true); }}
                className={cn(
                  'w-full bg-white rounded-2xl border-l-4 border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-all active:scale-[0.99]',
                  cfg.color
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    {
                      'bg-amber-100 text-amber-600': task.status === 'pending',
                      'bg-sky-100 text-sky-600': task.status === 'in_progress',
                      'bg-emerald-100 text-emerald-600': task.status === 'done',
                      'bg-slate-100 text-slate-500': task.status === 'verified',
                    }
                  )}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-800">Kamar {task.roomId.replace('room-', '')}</p>
                      <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{typeLabel[task.type]}</p>
                    {task.assignedUser && (
                      <p className="text-xs text-slate-400 mt-1">
                        👤 {task.assignedUser.name}
                      </p>
                    )}
                    {task.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">📝 {task.notes}</p>
                    )}
                    <p className="text-xs text-slate-300 mt-1">
                      ⏰ {formatDateTime(task.scheduledAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Task detail modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Detail Tugas"
        size="md"
        footer={selected && selected.status !== 'verified' && (
          <div className="flex gap-2">
            {selected.status === 'pending' && (
              <Button
                className="flex-1"
                icon={<Brush className="h-4 w-4" />}
                onClick={() => updateStatus(selected.id, 'in_progress')}
              >
                Mulai Kerjakan
              </Button>
            )}
            {selected.status === 'in_progress' && (
              <Button
                className="flex-1"
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() => updateStatus(selected.id, 'done')}
              >
                Tandai Selesai
              </Button>
            )}
            {selected.status === 'done' && (
              <Button
                variant="secondary"
                className="flex-1"
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() => updateStatus(selected.id, 'verified')}
              >
                Verifikasi
              </Button>
            )}
          </div>
        )}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                {
                  'bg-amber-100 text-amber-600': selected.status === 'pending',
                  'bg-sky-100 text-sky-600': selected.status === 'in_progress',
                  'bg-emerald-100 text-emerald-600': selected.status === 'done',
                  'bg-slate-100 text-slate-500': selected.status === 'verified',
                }
              )}>
                {statusConfig[selected.status].icon}
              </div>
              <div>
                <p className="font-bold text-slate-800">Kamar {selected.roomId.replace('room-', '')}</p>
                <Badge variant={statusConfig[selected.status].badge}>{statusConfig[selected.status].label}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Jenis Tugas</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{typeLabel[selected.type]}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Dijadwalkan</p>
                <p className="text-sm font-medium text-slate-700 mt-0.5">{formatDateTime(selected.scheduledAt)}</p>
              </div>
              {selected.assignedUser && (
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400">Ditugaskan ke</p>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{selected.assignedUser.name}</p>
                </div>
              )}
            </div>

            {selected.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Catatan</p>
                <p className="text-sm text-amber-600">{selected.notes}</p>
              </div>
            )}

            {selected.completedAt && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Selesai pada</p>
                <p className="text-sm text-emerald-600">{formatDateTime(selected.completedAt)}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
