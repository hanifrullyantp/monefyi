import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAppStore } from '../store/appStore';
import { guestSurveySchema } from '../schemas/validation';

export default function GuestSurveyPage() {
  const { bookingId } = useParams();
  const { bookings, updateGuest } = useAppStore();
  const booking = bookings.find((b) => b.id === bookingId);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    idNumber: '',
    address: '',
    birthDate: '',
    occupation: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = guestSurveySchema.safeParse({
      idNumber: form.idNumber,
      address: form.address,
      birthDate: form.birthDate,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message || 'Data tidak valid');
      return;
    }

    if (booking?.guestId) {
      updateGuest(booking.guestId, {
        idNumber: form.idNumber,
        address: form.address,
        notes: `Survey completed. Pekerjaan: ${form.occupation}. Diskon 10%: STAY10-${booking.bookingCode}`,
      });
    }

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-8 text-center shadow-xl">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Terima Kasih!</h2>
          <p className="text-slate-500 text-sm mb-4 leading-relaxed">
            Data diri Anda telah tersimpan. Gunakan kode <strong>STAY10-{booking?.bookingCode}</strong> untuk diskon 10% pada kunjungan berikutnya.
          </p>
          <Button onClick={() => window.close()} className="w-full h-14 rounded-2xl">Selesai</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="max-w-md w-full space-y-8 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800">Lengkapi Data Diri</h1>
          <p className="text-sm text-slate-400 mt-2 font-bold uppercase tracking-widest">
            Booking: {booking?.bookingCode || bookingId}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
          {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Identitas Resmi
            </h3>

            <Input
              label="Nomor KTP (16 Digit)"
              placeholder="3271..."
              required
              maxLength={16}
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value.replace(/\D/g, '') })}
            />

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Foto KTP</label>
              <div className="h-40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50">
                <Camera className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">Opsional — MVP</p>
              </div>
            </div>

            <Input
              label="Tanggal Lahir"
              type="date"
              required
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
            <Input
              label="Alamat Lengkap"
              placeholder="Jl. Raya..."
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <Input
              label="Pekerjaan"
              placeholder="Pegawai Swasta..."
              value={form.occupation}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 mt-4 flex items-center justify-center gap-3">
            SIMPAN & DAPATKAN DISKON <ArrowRight className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
