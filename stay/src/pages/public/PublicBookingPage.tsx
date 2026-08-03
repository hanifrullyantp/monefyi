import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { formatCurrency } from '../../utils/format';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { xenditService } from '../../services/xenditService';
import { generateBookingCode, calculateNights } from '../../utils/format';
import { generateId } from '../../utils/id';

export default function PublicBookingPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { roomTypes, rooms, addGuest, addBooking, tenant } = useAppStore();

  const [step, setStep] = useState(1);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guest, setGuest] = useState({ name: '', phone: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState<'virtual_account' | 'qris' | 'ewallet'>('qris');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;
  const total = roomType ? roomType.basePrice * nights : 0;
  const availableRoom = rooms.find((r) => r.roomTypeId === roomTypeId && r.status === 'available');

  const handleBook = async () => {
    if (!roomType || !availableRoom || !guest.name || !guest.phone) return;
    setLoading(true);

    const guestId = generateId('guest');
    addGuest({
      id: guestId,
      tenantId: tenant.id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      idType: 'ktp',
      idNumber: '',
      nationality: 'Indonesia',
      isBlacklisted: false,
      totalStays: 0,
      createdAt: new Date().toISOString(),
    });

    const bookingId = generateId('bk');
    const booking = {
      id: bookingId,
      tenantId: tenant.id,
      bookingCode: generateBookingCode(),
      guestId,
      roomId: availableRoom.id,
      checkIn,
      checkOut,
      nights,
      adults: 2,
      children: 0,
      status: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      totalAmount: total,
      paidAmount: 0,
      source: 'online' as const,
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addBooking(booking);

    try {
      const result = await xenditService.createChannelPayment(
        { ...booking, guest: { ...guest, id: guestId, tenantId: tenant.id, idType: 'ktp' as const, idNumber: '', nationality: 'Indonesia', isBlacklisted: false, totalStays: 0, createdAt: new Date().toISOString() } },
        total,
        paymentMethod
      );
      setPaymentUrl(result.paymentUrl);
      setStep(4);
    } catch {
      setPaymentUrl(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-800">{tenant.name}</h1>
          <p className="text-sm text-slate-500">Booking Online · {tenantSlug}</p>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold">Pilih Kamar</h2>
            {roomTypes.filter((rt) => rt.isActive).map((rt) => (
              <button
                key={rt.id}
                type="button"
                onClick={() => { setRoomTypeId(rt.id); setStep(2); }}
                className="w-full text-left p-4 border rounded-xl hover:border-emerald-500 transition-all"
              >
                <p className="font-bold">{rt.name}</p>
                <p className="text-emerald-600 font-black">{formatCurrency(rt.basePrice)}/malam</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold">{roomType?.name}</h2>
            <Input label="Check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <Input label="Check-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            {nights > 0 && <p className="text-center font-bold">{nights} malam · {formatCurrency(total)}</p>}
            <Button className="w-full" disabled={!checkIn || !checkOut || nights <= 0} onClick={() => setStep(3)}>Lanjut</Button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold">Data Tamu</h2>
            <Input label="Nama" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
            <Input label="Telepon" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
            <Input label="Email" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
            <div>
              <label className="text-sm font-medium">Metode Bayar</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className="w-full mt-1 px-4 py-2.5 rounded-xl border">
                <option value="qris">QRIS</option>
                <option value="virtual_account">Virtual Account</option>
                <option value="ewallet">E-Wallet</option>
              </select>
            </div>
            <Button className="w-full" loading={loading} onClick={handleBook}>Booking & Bayar</Button>
          </div>
        )}

        {step === 4 && paymentUrl && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-4">
            <h2 className="font-bold text-emerald-700">Booking Berhasil!</h2>
            <p className="text-sm">Silakan selesaikan pembayaran:</p>
            <a href={paymentUrl} target="_blank" rel="noreferrer" className="block text-violet-600 break-all text-sm">{paymentUrl}</a>
            <Button className="w-full" onClick={() => window.open(paymentUrl, '_blank')}>Buka Pembayaran</Button>
          </div>
        )}
      </div>
    </div>
  );
}
