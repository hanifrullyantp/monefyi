import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function GuestSurveyPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Data diri Anda telah tersimpan. Kami telah mengirimkan <b>Voucher Diskon 10%</b> ke WhatsApp Anda untuk kunjungan berikutnya!
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
          <p className="text-sm text-slate-400 mt-2 font-bold uppercase tracking-widest">Booking ID: {bookingId}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-4">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Identitas Resmi
            </h3>
            
            <Input label="Nomor KTP (16 Digit)" placeholder="3271..." required maxLength={16} />
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Foto KTP</label>
              <div className="h-40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer group">
                <Camera className="h-8 w-8 text-slate-300 group-hover:text-emerald-500 mb-2" />
                <p className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-600">Klik untuk Ambil Foto</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Tanggal Lahir" type="date" required />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Jenis Kelamin</label>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none">
                  <option>Laki-laki</option>
                  <option>Perempuan</option>
                </select>
              </div>
            </div>

            <Input label="Alamat Lengkap" placeholder="Jl. Raya..." required />
            <Input label="Pekerjaan" placeholder="Pegawai Swasta..." />
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 mt-4 flex items-center justify-center gap-3">
            SIMPAN & DAPATKAN DISKON <ArrowRight className="h-5 w-5" />
          </Button>
          
          <p className="text-[9px] text-center text-slate-400 leading-relaxed italic">
            Data Anda akan dienkripsi dengan standar keamanan tinggi dan hanya digunakan untuk keperluan verifikasi tamu sesuai peraturan perundangan.
          </p>
        </form>
      </div>
    </div>
  );
}
