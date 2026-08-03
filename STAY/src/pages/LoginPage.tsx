import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, Eye, EyeOff, ArrowRight, User } from 'lucide-react';

const demoAccounts = [
  { role: 'Owner', email: 'owner@stay.com', desc: 'Akses penuh semua fitur' },
  { role: 'Manager', email: 'manager@stay.com', desc: 'Manajemen operasional' },
  { role: 'Resepsionis', email: 'receptionist@stay.com', desc: 'Check-in & booking' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('owner@stay.com');
  const [password, setPassword] = useState('demo123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login gagal');
    }
  };

  const handleDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setError('');
    const result = await login(demoEmail, 'demo123');
    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center shadow-lg shadow-emerald-200 mb-4">
            <Home className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">stay.monefyi.com</h1>
          <p className="text-slate-500 text-sm mt-1">Platform Manajemen Penginapan Modern</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 p-7">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Selamat Datang! 👋</h2>
          <p className="text-sm text-slate-500 mb-6">Masuk ke akun Anda untuk mulai mengelola penginapan</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                placeholder="email@contoh.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-60 shadow-lg shadow-emerald-200"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                <>Masuk <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-xs text-slate-400 text-center mb-3">— Akun Demo (klik untuk login langsung) —</p>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleDemo(acc.email)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{acc.role}</p>
                    <p className="text-xs text-slate-400">{acc.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2024 stay.monefyi.com · Versi 1.0.0 MVP
        </p>
      </div>
    </div>
  );
}
