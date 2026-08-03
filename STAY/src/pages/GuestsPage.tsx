import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { formatDate, formatCurrency, generateId } from '../utils/format';
import { Search, Plus, User, Phone, CreditCard, MapPin, Star, AlertTriangle } from 'lucide-react';
import type { Guest } from '../types';
import { cn } from '../utils/cn';

export default function GuestsPage() {
  const { guests, bookings, addGuest, updateGuest } = useAppStore();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', idType: 'ktp', idNumber: '',
    address: '', nationality: 'Indonesia', notes: '',
  });

  const filtered = guests.filter(g =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search) ||
    g.idNumber.includes(search)
  );

  const getGuestBookings = (guestId: string) =>
    bookings.filter(b => b.guestId === guestId);

  const handleAdd = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const guest: Guest = {
      id: generateId(),
      tenantId: 'tenant-1',
      name: form.name,
      email: form.email || undefined,
      phone: form.phone,
      idType: form.idType as Guest['idType'],
      idNumber: form.idNumber,
      address: form.address || undefined,
      nationality: form.nationality,
      isBlacklisted: false,
      notes: form.notes || undefined,
      totalStays: 0,
      createdAt: new Date().toISOString(),
    };
    addGuest(guest);
    setShowNew(false);
    setLoading(false);
    setForm({ name: '', email: '', phone: '', idType: 'ktp', idNumber: '', address: '', nationality: 'Indonesia', notes: '' });
  };

  const toggleBlacklist = (guest: Guest) => {
    updateGuest(guest.id, { isBlacklisted: !guest.isBlacklisted });
    setSelected({ ...guest, isBlacklisted: !guest.isBlacklisted });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Data Tamu</h1>
          <p className="text-sm text-slate-500 mt-0.5">{guests.length} tamu terdaftar</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowNew(true)}>
          Tambah Tamu
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{guests.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Tamu</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{guests.filter(g => g.totalStays >= 3).length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Tamu Setia</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{guests.filter(g => g.isBlacklisted).length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Daftar Hitam</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama, no. HP, atau nomor identitas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Guest list */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <User className="h-12 w-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada tamu ditemukan</p>
          </div>
        ) : (
          filtered.map(guest => (
            <button
              key={guest.id}
              onClick={() => { setSelected(guest); setShowDetail(true); }}
              className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                  guest.isBlacklisted
                    ? 'bg-red-100 text-red-500'
                    : 'bg-gradient-to-br from-sky-400 to-sky-600'
                )}>
                  {guest.isBlacklisted
                    ? <AlertTriangle className="h-5 w-5" />
                    : <span className="text-white font-bold">{guest.name.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate">{guest.name}</p>
                    {guest.isBlacklisted && <Badge variant="danger">Blacklist</Badge>}
                    {guest.totalStays >= 5 && !guest.isBlacklisted && (
                      <Badge variant="warning">⭐ Setia</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {guest.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {guest.totalStays}x menginap
                    </span>
                    <span className="hidden sm:block">{guest.nationality}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex-shrink-0">
                  {guest.idType.toUpperCase()}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Guest Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Profil Tamu"
        size="md"
        footer={selected && (
          <div className="flex gap-2">
            <Button
              variant={selected.isBlacklisted ? 'secondary' : 'danger'}
              onClick={() => toggleBlacklist(selected)}
              className="flex-1"
            >
              {selected.isBlacklisted ? '✅ Hapus dari Blacklist' : '🚫 Masukkan Blacklist'}
            </Button>
          </div>
        )}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
                selected.isBlacklisted ? 'bg-red-100' : 'bg-gradient-to-br from-sky-400 to-sky-600'
              )}>
                {selected.isBlacklisted
                  ? <AlertTriangle className="h-7 w-7 text-red-500" />
                  : <span className="text-white font-bold text-xl">{selected.name.charAt(0)}</span>
                }
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{selected.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {selected.isBlacklisted && <Badge variant="danger">Blacklist</Badge>}
                  <span className="text-sm text-slate-400">{selected.totalStays}x menginap</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 flex items-center gap-1"><Phone className="h-3 w-3" /> Telepon</p>
                <p className="font-semibold text-slate-700 mt-0.5">{selected.phone}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 flex items-center gap-1"><CreditCard className="h-3 w-3" /> ID</p>
                <p className="font-semibold text-slate-700 mt-0.5 text-xs">{selected.idType.toUpperCase()}: {selected.idNumber}</p>
              </div>
              {selected.email && (
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{selected.email}</p>
                </div>
              )}
              {selected.address && (
                <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                  <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> Alamat</p>
                  <p className="font-semibold text-slate-700 mt-0.5">{selected.address}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Kewarganegaraan</p>
                <p className="font-semibold text-slate-700 mt-0.5">{selected.nationality}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Bergabung</p>
                <p className="font-semibold text-slate-700 mt-0.5">{formatDate(selected.createdAt)}</p>
              </div>
            </div>

            {/* Booking history */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Riwayat Menginap</p>
              <div className="space-y-2">
                {getGuestBookings(selected.id).map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Kamar {b.room?.number}</p>
                      <p className="text-xs text-slate-400">{formatDate(b.checkIn)} · {b.nights} malam</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{formatCurrency(b.totalAmount)}</p>
                      <Badge variant={b.status === 'checked_out' ? 'gray' : b.status === 'checked_in' ? 'success' : 'info'}>
                        {b.status === 'checked_out' ? 'Selesai' : b.status === 'checked_in' ? 'Aktif' : 'Confirmed'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {getGuestBookings(selected.id).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada riwayat menginap</p>
                )}
              </div>
            </div>

            {selected.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Catatan</p>
                <p className="text-sm text-amber-600">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Guest Modal */}
      <Modal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        title="Tambah Tamu Baru"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowNew(false)} className="flex-1">Batal</Button>
            <Button
              onClick={handleAdd}
              loading={loading}
              disabled={!form.name || !form.phone}
              className="flex-1"
            >
              Simpan Tamu
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nama Lengkap"
            placeholder="Masukkan nama lengkap"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="No. HP / WhatsApp"
            placeholder="081234567890"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            required
          />
          <Input
            label="Email (opsional)"
            type="email"
            placeholder="tamu@email.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Jenis ID"
              value={form.idType}
              onChange={e => setForm({ ...form, idType: e.target.value })}
              options={[
                { value: 'ktp', label: 'KTP' },
                { value: 'paspor', label: 'Paspor' },
                { value: 'sim', label: 'SIM' },
                { value: 'kitas', label: 'KITAS' },
              ]}
            />
            <Input
              label="Nomor ID"
              placeholder="Nomor identitas"
              value={form.idNumber}
              onChange={e => setForm({ ...form, idNumber: e.target.value })}
            />
          </div>
          <Input
            label="Kewarganegaraan"
            placeholder="Indonesia"
            value={form.nationality}
            onChange={e => setForm({ ...form, nationality: e.target.value })}
          />
          <Input
            label="Alamat (opsional)"
            placeholder="Alamat lengkap"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Catatan (opsional)"
            placeholder="Catatan khusus tentang tamu ini"
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
