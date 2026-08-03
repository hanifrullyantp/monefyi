import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { formatCurrency, formatShortDate, generateBookingCode, generateId, calculateNights } from '../utils/format';
import { openWhatsAppMessage, buildBookingConfirmationMessage } from '../utils/whatsapp';
import type { BookingStatus, PaymentStatus, Booking } from '../types';
import { cn } from '../utils/cn';
import {
  Plus, Search, CalendarDays, User, BedDouble,
  XCircle, ChevronRight, LogIn, LogOut, Phone, Star, 
  ArrowRight, ArrowLeft, MessageCircle
} from 'lucide-react';

const statusConfig: Record<BookingStatus, { label: string; badge: 'warning' | 'info' | 'success' | 'gray' | 'danger' | 'purple' }> = {
  pending: { label: 'Menunggu', badge: 'warning' },
  confirmed: { label: 'Dikonfirmasi', badge: 'info' },
  checked_in: { label: 'Check-in', badge: 'success' },
  checked_out: { label: 'Check-out', badge: 'gray' },
  cancelled: { label: 'Dibatalkan', badge: 'danger' },
  no_show: { label: 'Tidak Hadir', badge: 'purple' },
};

const paymentConfig: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Belum Bayar', color: 'text-red-500' },
  partial: { label: 'Sebagian', color: 'text-amber-500' },
  paid: { label: 'Lunas', color: 'text-emerald-500' },
  refunded: { label: 'Dikembalikan', color: 'text-violet-500' },
};

const tabs: { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'checked_in', label: 'Check-in' },
  { value: 'confirmed', label: 'Konfirmasi' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'checked_out', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
];

interface NewBookingForm {
  guestName: string;
  guestPhone: string;
  guestIdNumber: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  notes: string;
  paymentMethod: string;
  discount: number;
}

export default function BookingsPage() {
  const location = useLocation();
  const { bookings, rooms, roomTypes, guests, addBooking, updateBooking, addGuest, checkInBooking } = useAppStore();
  const [tab, setTab] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memberFound, setMemberFound] = useState(false);
  const [isFirstStay, setIsFirstStay] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const state = location.state as { openNew?: boolean; roomId?: string } | null;
    if (state?.openNew) {
      setShowNew(true);
      if (state.roomId) {
        setForm((prev) => ({ ...prev, roomId: state.roomId }));
        setStep(2);
      }
    }
  }, [location.state]);

  const [form, setForm] = useState<NewBookingForm>({
    guestName: '', guestPhone: '', guestIdNumber: '', roomId: '',
    checkIn: '', checkOut: '', adults: '2', children: '0', notes: '', paymentMethod: 'cash',
    discount: 0
  });

  const handlePhoneChange = (phone: string) => {
    setForm({ ...form, guestPhone: phone });
    const existing = guests.find(g => g.phone === phone);
    if (existing) {
      setForm(prev => ({
        ...prev,
        guestName: existing.name,
        guestIdNumber: existing.idNumber,
        guestPhone: phone
      }));
      setMemberFound(true);
      setIsFirstStay(existing.totalStays === 0);
      if (existing.totalStays === 0) {
        setForm(prev => ({ ...prev, discount: 50000 }));
      }
    } else {
      setMemberFound(false);
      setIsFirstStay(phone.length > 8);
      if (phone.length > 8) {
        setForm(prev => ({ ...prev, discount: 25000 }));
      }
    }
  };

  const filtered = bookings.filter(b => {
    const matchTab = tab === 'all' || b.status === tab;
    const matchSearch = !search || b.guest?.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.room?.number.includes(search);
    return matchTab && matchSearch;
  });

  const availableRooms = rooms.filter(r => r.status === 'available');

  const calculateTotal = () => {
    if (!form.roomId || !form.checkIn || !form.checkOut) return 0;
    const room = rooms.find(r => r.id === form.roomId);
    const rt = room?.roomType || roomTypes.find(t => t.id === room?.roomTypeId);
    const nights = calculateNights(form.checkIn, form.checkOut);
    if (!rt || nights <= 0) return 0;
    const subtotal = rt.basePrice * nights;
    const withTax = subtotal * 1.15;
    return Math.max(0, withTax - form.discount);
  };

  const handleCreateBooking = async () => {
    if (!form.guestName || !form.roomId || !form.checkIn || !form.checkOut) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));

    let guestId = '';
    const existing = guests.find(g => g.phone === form.guestPhone);
    
    if (existing) {
      guestId = existing.id;
    } else {
      guestId = generateId();
      addGuest({
        id: guestId, tenantId: 'tenant-1',
        name: form.guestName, phone: form.guestPhone,
        idType: 'ktp' as const, idNumber: form.guestIdNumber,
        nationality: 'Indonesia', isBlacklisted: false, totalStays: 0,
        createdAt: new Date().toISOString(),
      });
    }

    const room = rooms.find(r => r.id === form.roomId);
    const total = calculateTotal();
    const nights = calculateNights(form.checkIn, form.checkOut);

    const booking: Booking = {
      id: generateId(),
      tenantId: 'tenant-1',
      bookingCode: generateBookingCode(),
      guestId,
      guest: existing || { name: form.guestName, phone: form.guestPhone } as any,
      roomId: form.roomId,
      room: room || undefined,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      nights,
      adults: parseInt(form.adults),
      children: parseInt(form.children),
      status: 'confirmed',
      paymentStatus: 'unpaid',
      totalAmount: total,
      paidAmount: 0,
      notes: form.notes,
      source: 'manual',
      createdBy: 'user-3',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addBooking(booking);
    setShowNew(false);
    setStep(1);
    setLoading(false);
    setForm({ guestName: '', guestPhone: '', guestIdNumber: '', roomId: '', checkIn: '', checkOut: '', adults: '2', children: '0', notes: '', paymentMethod: 'cash', discount: 0 });

    if (form.guestPhone) {
      openWhatsAppMessage(
        form.guestPhone,
        buildBookingConfirmationMessage(form.guestName, booking.bookingCode, form.checkIn, room?.number || '')
      );
    }
  };

  const handleCheckIn = (booking: Booking) => {
    checkInBooking(booking.id, booking.roomId);
    if (selected?.id === booking.id) {
      setSelected({ ...booking, status: 'checked_in' });
    }
  };

  const handleCheckOut = (booking: Booking) => {
    updateBooking(booking.id, { status: 'checked_out' });
    if (selected?.id === booking.id) setSelected({ ...booking, status: 'checked_out' });
  };

  const handleCancel = (booking: Booking) => {
    updateBooking(booking.id, { status: 'cancelled' });
    setShowDetail(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Manajemen Booking</h1>
          <p className="text-sm text-slate-500 mt-0.5">{bookings.length} total booking</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowNew(true)}>
          Booking Baru
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama tamu, kode booking, nomor kamar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
              tab === t.value
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {t.label}
            {t.value !== 'all' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({bookings.filter(b => b.status === t.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <CalendarDays className="h-12 w-12 mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">Tidak ada booking ditemukan</p>
          </div>
        ) : (
          filtered.map(booking => (
            <button
              key={booking.id}
              onClick={() => { setSelected(booking); setShowDetail(true); }}
              className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{booking.guest?.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-slate-800 truncate">{booking.guest?.name}</p>
                    <Badge variant={statusConfig[booking.status].badge}>{statusConfig[booking.status].label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-3 w-3" />
                      Kamar {booking.room?.number}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {formatShortDate(booking.checkIn)} → {formatShortDate(booking.checkOut)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{booking.bookingCode}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-semibold', paymentConfig[booking.paymentStatus].color)}>
                        {paymentConfig[booking.paymentStatus].label}
                      </span>
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}
      </div>

      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Detail Booking" size="md">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{selected.guest?.name.charAt(0)}</span>
              </div>
              <div>
                <p className="font-bold text-slate-800">{selected.guest?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusConfig[selected.status].badge}>{statusConfig[selected.status].label}</Badge>
                  <span className="text-xs text-slate-400">{selected.bookingCode}</span>
                </div>
              </div>
            </div>
            {/* ... detail info remains same or similar ... */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Kamar</p>
                <p className="font-semibold text-slate-700 mt-0.5">Kamar {selected.room?.number}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Tamu</p>
                <p className="font-semibold text-slate-700 mt-0.5">{selected.adults} dewasa, {selected.children} anak</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Check-in / Check-out</p>
                <p className="font-semibold text-slate-700 mt-0.5">{formatShortDate(selected.checkIn)} → {formatShortDate(selected.checkOut)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-semibold text-emerald-700 mt-0.5">{formatCurrency(selected.totalAmount)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {['confirmed', 'pending'].includes(selected.status) && (
                <Button size="sm" icon={<LogIn className="h-4 w-4" />} onClick={() => handleCheckIn(selected)}>Check-in</Button>
              )}
              {selected.status === 'checked_in' && (
                <Button size="sm" variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={() => handleCheckOut(selected)}>Check-out</Button>
              )}
              {!['cancelled', 'checked_out'].includes(selected.status) && (
                <Button size="sm" variant="outline" icon={<XCircle className="h-4 w-4" />} onClick={() => handleCancel(selected)}>Batalkan</Button>
              )}
              {selected.guest?.phone && (
                <Button size="sm" variant="outline" icon={<MessageCircle className="h-4 w-4" />} onClick={() => openWhatsAppMessage(selected.guest!.phone, `Halo ${selected.guest?.name}, terkait booking ${selected.bookingCode}.`)}>WhatsApp</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* New Booking Modal with Steps */}
      <Modal
        isOpen={showNew}
        onClose={() => { setShowNew(false); setStep(1); }}
        title="Reservasi Baru"
        size="lg"
        footer={
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl h-12">
                <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
              </Button>
            )}
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                disabled={step === 1 ? !form.guestPhone : !form.roomId}
                className="flex-1 rounded-2xl h-12"
              >
                Lanjut <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateBooking}
                loading={loading}
                className="flex-1 rounded-2xl h-12 bg-emerald-600 shadow-emerald-200 shadow-lg"
              >
                Konfirmasi & Simpan
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2 mb-8 px-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                step >= s ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-slate-100 text-slate-400"
              )}>
                {s}
              </div>
              <div className={cn("h-1 flex-1 rounded-full", step > s ? "bg-emerald-600" : "bg-slate-100")} />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">Siapa yang akan menginap?</h4>
                <p className="text-xs text-slate-400 font-medium">Cari data tamu dengan nomor WhatsApp/HP</p>
              </div>

              <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50">
                <Input
                  label="Nomor WhatsApp / HP"
                  placeholder="0812..."
                  value={form.guestPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  required
                  leftIcon={<Phone className="h-4 w-4" />}
                  className="text-lg font-black"
                />
              </div>

              {form.guestPhone.length > 8 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Lengkap</h5>
                    {memberFound ? (
                      <Badge variant="success" className="rounded-lg">Member Aktif</Badge>
                    ) : (
                      <Badge variant="info" className="rounded-lg text-blue-600 bg-blue-50">Tamu Baru</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nama Lengkap"
                      placeholder="Masukkan nama..."
                      value={form.guestName}
                      onChange={e => setForm({ ...form, guestName: e.target.value })}
                      required
                    />
                    <Input
                      label="Nomor Identitas (KTP/NIK)"
                      placeholder="3271..."
                      value={form.guestIdNumber}
                      onChange={e => setForm({ ...form, guestIdNumber: e.target.value })}
                    />
                  </div>

                  {isFirstStay && (
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                          <Star className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-amber-800 uppercase tracking-widest">🎁 Promo Member Baru</p>
                          <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">Berikan potongan <b>Rp50.000</b> jika tamu mendaftar dengan data lengkap sekarang.</p>
                          <div className="mt-4 flex gap-2">
                            <button 
                              onClick={() => setForm({...form, discount: 50000})}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                                form.discount > 0 ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-white border border-amber-200 text-amber-600"
                              )}
                            >
                              Gunakan Potongan
                            </button>
                            <button 
                              onClick={() => setForm({...form, discount: 0})}
                              className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border",
                                form.discount === 0 ? "bg-slate-200 border-slate-300 text-slate-600" : "bg-white border border-slate-200 text-slate-400"
                              )}
                            >
                              Normal
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">Pilih Kamar & Durasi</h4>
                <p className="text-xs text-slate-400 font-medium">Tentukan kamar dan tanggal menginap</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tanggal Check-in"
                  type="date"
                  value={form.checkIn}
                  onChange={e => setForm({ ...form, checkIn: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                <Input
                  label="Tanggal Check-out"
                  type="date"
                  value={form.checkOut}
                  onChange={e => setForm({ ...form, checkOut: e.target.value })}
                  min={form.checkIn || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="space-y-4">
                <Select
                  label="Pilih Kamar yang Tersedia"
                  value={form.roomId}
                  onChange={e => setForm({ ...form, roomId: e.target.value })}
                  options={[
                    { value: '', label: '-- Pilih Kamar --' },
                    ...availableRooms.map(r => ({
                      value: r.id,
                      label: `Kamar ${r.number} - ${r.roomType?.name || ''}`,
                    })),
                  ]}
                  required
                />

                {form.roomId && (() => {
                  const room = rooms.find(r => r.id === form.roomId);
                  const rt = room?.roomType || roomTypes.find(t => t.id === room?.roomTypeId);
                  return rt ? (
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-10 -mt-10" />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Tipe Kamar</p>
                          <h5 className="text-xl font-black">{rt.name}</h5>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Harga/Malam</p>
                          <p className="text-xl font-black">{formatCurrency(rt.basePrice)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        {rt.facilities.map(f => (
                          <span key={f} className="text-[9px] font-bold bg-white/10 px-2 py-1 rounded-lg uppercase tracking-wider">{f}</span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Jumlah Dewasa"
                  type="number"
                  min="1"
                  value={form.adults}
                  onChange={e => setForm({ ...form, adults: e.target.value })}
                />
                <Input
                  label="Jumlah Anak"
                  type="number"
                  min="0"
                  value={form.children}
                  onChange={e => setForm({ ...form, children: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 text-center">
                <h4 className="text-lg font-black text-slate-800">Konfirmasi Tagihan</h4>
                <p className="text-xs text-slate-400 font-medium">Periksa kembali detail pemesanan</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Tamu</span>
                  <span className="text-slate-800 font-black">{form.guestName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Kamar</span>
                  <span className="text-slate-800 font-black">Kamar {rooms.find(r => r.id === form.roomId)?.number}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Durasi</span>
                  <span className="text-slate-800 font-black">{calculateNights(form.checkIn, form.checkOut)} Malam</span>
                </div>
                
                <div className="h-px bg-slate-200 border-dashed border-t-2 my-2" />
                
                {form.discount > 0 && (
                  <div className="flex justify-between text-xs text-amber-600 font-bold">
                    <span className="uppercase tracking-widest">Potongan Promo</span>
                    <span>- {formatCurrency(form.discount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Tagihan</span>
                  <span className="text-2xl font-black text-emerald-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Kirim via WhatsApp</p>
                  <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">Invoice dan link survei pendaftaran member akan dikirim otomatis ke nomor tamu setelah konfirmasi.</p>
                </div>
              </div>

              <Input
                label="Catatan Internal"
                placeholder="Misal: Tamu VIP, Minta handuk tambahan..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
