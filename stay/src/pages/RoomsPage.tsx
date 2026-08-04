import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { BedDouble, Plus, Filter, Wrench, Brush, Check, Ban, Eye } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import type { RoomStatus } from '../types';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const statusConfig: Record<RoomStatus, { label: string; badge: 'success' | 'info' | 'warning' | 'purple' | 'danger' | 'gray'; icon: React.ReactNode; color: string }> = {
  available: { label: 'Tersedia', badge: 'success', icon: <Check className="h-3.5 w-3.5" />, color: 'border-l-emerald-400' },
  occupied: { label: 'Terisi', badge: 'info', icon: <Eye className="h-3.5 w-3.5" />, color: 'border-l-sky-400' },
  maintenance: { label: 'Perawatan', badge: 'warning', icon: <Wrench className="h-3.5 w-3.5" />, color: 'border-l-amber-400' },
  cleaning: { label: 'Kebersihan', badge: 'purple', icon: <Brush className="h-3.5 w-3.5" />, color: 'border-l-violet-400' },
  blocked: { label: 'Diblokir', badge: 'danger', icon: <Ban className="h-3.5 w-3.5" />, color: 'border-l-red-400' },
};

const filterOptions: { value: RoomStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'available', label: 'Tersedia' },
  { value: 'occupied', label: 'Terisi' },
  { value: 'maintenance', label: 'Perawatan' },
  { value: 'cleaning', label: 'Kebersihan' },
  { value: 'blocked', label: 'Diblokir' },
];

export default function RoomsPage() {
  const { rooms, roomTypes, updateRoomStatus, addRoom } = useAppStore();
  const { tenant } = useAuthStore();
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [selected, setSelected] = useState<typeof rooms[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ number: '', floor: '1', roomTypeId: roomTypes[0]?.id || '' });

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);

  const grouped = filtered.reduce<Record<number, typeof rooms>>((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {});

  const handleStatusChange = (status: RoomStatus) => {
    if (!selected) return;
    updateRoomStatus(selected.id, status);
    setSelected({ ...selected, status });
  };

  const handleAddRoom = () => {
    if (!newRoom.number || !newRoom.roomTypeId || !tenant) return;
    addRoom({
      tenantId: tenant.id,
      roomTypeId: newRoom.roomTypeId,
      number: newRoom.number,
      floor: parseInt(newRoom.floor, 10) || 1,
      status: 'available',
      isActive: true,
    });
    setShowAddModal(false);
    setNewRoom({ number: '', floor: '1', roomTypeId: roomTypes[0]?.id || '' });
  };

  const stats = [
    { label: 'Tersedia', value: rooms.filter(r => r.status === 'available').length, color: 'text-emerald-600' },
    { label: 'Terisi', value: rooms.filter(r => r.status === 'occupied').length, color: 'text-emerald-700' },
    { label: 'Kebersihan', value: rooms.filter(r => r.status === 'cleaning').length, color: 'text-violet-500' },
    { label: 'Perawatan', value: rooms.filter(r => r.status === 'maintenance').length, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Kamar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rooms.length} kamar terdaftar</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} size="md" onClick={() => setShowAddModal(true)}>
          Tambah Kamar
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0 mt-2" />
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              filter === opt.value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Room grid by floor */}
      {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([floor, floorRooms]) => (
        <div key={floor}>
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              Lantai {floor}
            </div>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {floorRooms.map(room => {
              const cfg = statusConfig[room.status];
              const rt = roomTypes.find(t => t.id === room.roomTypeId);
              return (
                <button
                  key={room.id}
                  onClick={() => { setSelected(room); setShowModal(true); }}
                  className={cn(
                    'bg-white rounded-2xl border-l-4 border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-all active:scale-95',
                    cfg.color
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xl font-bold text-slate-800">{room.number}</span>
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <BedDouble className="h-3.5 w-3.5" />
                    <span className="text-xs">{rt?.name || 'Kamar'}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {rt ? formatCurrency(rt.basePrice) + '/mlm' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Room detail modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Kamar ${selected?.number}`}
        size="md"
      >
        {selected && (() => {
          const rt = roomTypes.find(t => t.id === selected.roomTypeId);
          const cfg = statusConfig[selected.status];
          return (
            <div className="space-y-5">
              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', {
                  'bg-emerald-100 text-emerald-600': selected.status === 'available',
                  'bg-sky-100 text-sky-600': selected.status === 'occupied',
                  'bg-amber-100 text-amber-600': selected.status === 'maintenance',
                  'bg-violet-100 text-violet-600': selected.status === 'cleaning',
                  'bg-red-100 text-red-500': selected.status === 'blocked',
                })}>
                  <BedDouble className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Kamar {selected.number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    <span className="text-xs text-slate-400">Lantai {selected.floor}</span>
                  </div>
                </div>
              </div>

              {/* Room type info */}
              {rt && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700">Informasi Kamar</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs">Tipe</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{rt.name}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs">Harga</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{formatCurrency(rt.basePrice)}/mlm</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs">Kapasitas</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{rt.capacity} tamu</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-slate-400 text-xs">Tipe Kasur</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{rt.bedType}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Fasilitas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rt.facilities.map(f => (
                        <span key={f} className="text-xs bg-sky-50 text-sky-600 px-2 py-1 rounded-lg border border-sky-100">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Change status */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Ubah Status Kamar</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(statusConfig) as [RoomStatus, typeof statusConfig[RoomStatus]][]).map(([st, c]) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all',
                        selected.status === st
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {c.icon}
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Kamar Baru" size="sm">
        <div className="space-y-4">
          <Input
            label="Nomor Kamar"
            value={newRoom.number}
            onChange={(e) => setNewRoom({ ...newRoom, number: e.target.value })}
            placeholder="misal: 106"
          />
          <Input
            label="Lantai"
            value={newRoom.floor}
            onChange={(e) => setNewRoom({ ...newRoom, floor: e.target.value })}
            placeholder="1"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Tipe Kamar</label>
            <select
              value={newRoom.roomTypeId}
              onChange={(e) => setNewRoom({ ...newRoom, roomTypeId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name} — {formatCurrency(rt.basePrice)}</option>
              ))}
            </select>
          </div>
          <Button className="w-full" onClick={handleAddRoom}>Simpan Kamar</Button>
        </div>
      </Modal>
    </div>
  );
}
