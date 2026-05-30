import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, ArrowLeft, ArrowRight, Mail, Lock, User, Building2, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface AuthProps {
  onBack: () => void;
}

export function LoginPage({ onBack }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser, setTenant, setAuthenticated, setCurrentView } = useAppStore();

  const handleLogin = async (role: 'owner' | 'manager' | 'worker' = 'owner') => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const users = {
      owner: { id: 'u-1', name: 'Budi Santoso', email: 'budi@cvbuana.com', role: 'owner' as const, tenant_id: 'tenant-1', position: 'Owner', department: 'Management' },
      manager: { id: 'u-2', name: 'Sari Dewi', email: 'sari@cvbuana.com', role: 'manager' as const, tenant_id: 'tenant-1', position: 'Project Manager', department: 'Operations' },
      worker: { id: 'u-3', name: 'Ahmad Rizky', email: 'ahmad@cvbuana.com', role: 'worker' as const, tenant_id: 'tenant-1', position: 'Site Worker', department: 'Field' },
    };

    setUser(users[role]);
    setTenant({
      id: 'tenant-1',
      name: 'CV Buana Konstruksi',
      slug: 'cv-buana',
      business_type: 'construction',
      plan: 'pro',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
    });
    setAuthenticated(true);
    setCurrentView('dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900">Monefyi Planner</div>
              <div className="text-xs text-slate-500">Masuk ke akun kamu</div>
            </div>
          </div>

          {/* Demo login buttons */}
          <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs text-indigo-700 font-semibold mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Demo — Pilih role untuk langsung masuk:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'owner' as const, label: 'Owner', icon: '👔', desc: 'Full access' },
                { role: 'manager' as const, label: 'Manager', icon: '📋', desc: 'Project mgmt' },
                { role: 'worker' as const, label: 'Worker', icon: '👷', desc: 'Field view' },
              ].map(r => (
                <button
                  key={r.role}
                  onClick={() => handleLogin(r.role)}
                  className="flex flex-col items-center p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-500 hover:shadow-md transition-all group"
                >
                  <span className="text-xl mb-1">{r.icon}</span>
                  <span className="text-xs font-bold text-slate-800">{r.label}</span>
                  <span className="text-xs text-slate-400">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">atau masuk dengan email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="kamu@bisnis.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleLogin('owner')}
            disabled={loading}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Masuk...
              </>
            ) : (
              <>Masuk</>
            )}
          </button>

          <button className="w-full mt-3 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl transition-all hover:bg-slate-50 flex items-center justify-center gap-2 text-sm">
            <span className="text-base">G</span>
            Masuk dengan Google
          </button>
        </motion.div>
      </div>
    </div>
  );
}

type SignupStep = 1 | 2 | 3;

export function SignupPage({ onBack }: AuthProps) {
  const [step, setStep] = useState<SignupStep>(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    businessType: 'construction',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  });
  const { setUser, setTenant, setAuthenticated, setCurrentView } = useAppStore();

  const handleSignup = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setUser({
      id: 'u-new',
      name: form.name || 'Pengguna Baru',
      email: form.email,
      role: 'owner',
      tenant_id: 'tenant-new',
      position: 'Owner',
      department: 'Management',
    });
    setTenant({
      id: 'tenant-new',
      name: form.businessName || 'Bisnis Saya',
      slug: 'bisnis-saya',
      business_type: form.businessType,
      plan: 'free',
      currency: form.currency,
      timezone: form.timezone,
    });
    setAuthenticated(true);
    setCurrentView('dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl"
        >
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900">Buat Akun Gratis</div>
              <div className="text-xs text-slate-500">Step {step} dari 3</div>
            </div>
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">Info Akun</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama kamu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="kamu@bisnis.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 karakter"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="font-bold text-slate-800 mb-4">Info Bisnis</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Bisnis / Perusahaan</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={form.businessName}
                    onChange={e => setForm({ ...form, businessName: e.target.value })}
                    placeholder="CV / PT / Nama Usaha"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Bisnis</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'construction', label: 'Konstruksi', icon: '🏗️' },
                    { value: 'it', label: 'IT / Software', icon: '💻' },
                    { value: 'event', label: 'Event', icon: '🎪' },
                    { value: 'service', label: 'Jasa Lainnya', icon: '🔧' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, businessType: t.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${form.businessType === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <div className="text-xs font-medium text-slate-700 mt-1">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mata Uang</label>
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="IDR">IDR — Rupiah</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="MYR">MYR — Ringgit</option>
                </select>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-black text-xl text-slate-900">Siap untuk mulai! 🎉</h3>
              <p className="text-sm text-slate-500">
                Akun <strong>{form.businessName || 'Bisnis Saya'}</strong> sudah dibuat. Klik tombol di bawah untuk masuk ke dashboard.
              </p>
              <div className="bg-indigo-50 rounded-2xl p-4 text-left space-y-2">
                <p className="text-xs font-semibold text-indigo-700 mb-2">Yang bisa kamu lakukan sekarang:</p>
                {['Buat project pertama', 'Ajak tim bergabung', 'Coba Monefyi Button'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as SignupStep)}
                className="px-4 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep((step + 1) as SignupStep)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
              >
                Lanjut <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSignup}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Membuat akun...
                  </>
                ) : (
                  <>Masuk ke Dashboard <Sparkles className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
