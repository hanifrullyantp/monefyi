import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
        <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-2">Verifikasi email diperlukan</h1>
        <p className="text-sm text-slate-500 mb-6">
          Buka inbox Anda dan klik link verifikasi dari Supabase. Setelah itu masuk kembali ke aplikasi.
        </p>
        <Link to="/login" className="inline-block py-2.5 px-6 bg-emerald-600 text-white rounded-xl text-sm font-bold">
          Ke halaman masuk
        </Link>
      </div>
    </div>
  );
}
