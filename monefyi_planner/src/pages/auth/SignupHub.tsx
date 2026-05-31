import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Hash, Search, ArrowRight, Link2 } from 'lucide-react';

export function SignupHubPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'owner' | 'join'>('owner');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">← Beranda</Link>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Daftar Gratis</h1>
          <p className="text-sm text-slate-500 mb-6">Pilih cara bergabung dengan Monefyi Planner</p>

          <div className="flex gap-2 mb-6">
            {(['owner', 'join'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t === 'owner' ? 'Buat Perusahaan' : 'Join Perusahaan'}
              </button>
            ))}
          </div>

          {tab === 'owner' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Daftar sebagai Owner dan buat workspace perusahaan baru.</p>
              <button
                type="button"
                onClick={() => navigate('/signup/owner')}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" /> Lanjut Daftar Owner <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/join')}
                className="w-full p-4 border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors"
              >
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-600" /> Saya punya link undangan
                </div>
                <p className="text-xs text-slate-500 mt-1">Klik link dari email atau WhatsApp</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/join-by-code')}
                className="w-full p-4 border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors"
              >
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-600" /> Saya punya kode (6 digit)
                </div>
                <p className="text-xs text-slate-500 mt-1">Contoh: MNF-749</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/find-company')}
                className="w-full p-4 border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors"
              >
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" /> Cari perusahaan saya
                </div>
                <p className="text-xs text-slate-500 mt-1">Kirim permintaan bergabung untuk disetujui Owner</p>
              </button>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Sudah punya akun? <Link to="/login" className="text-indigo-600 font-semibold">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
