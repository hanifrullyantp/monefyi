import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Sparkles, ArrowLeft, ArrowRight, Mail, Lock, User, Building2, CheckCircle,
} from 'lucide-react';
import { authUserMessage } from '../lib/authMessages';
import { config } from '../lib/config';
import { isValidEmail, validatePassword } from '../lib/validators';
import { runBootstrap } from '../hooks/useBootstrap';
import PasswordField, { isPasswordReady } from './auth/PasswordField';
import {
  signInWithPassword,
  signUpWithPassword,
  resetPasswordForEmail,
} from '../services/authService';
import { useAppStore } from '../store/appStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const { setUser, setTenant, setAuthenticated, setDemoMode, setAuthInitializing, customDomainContext } = useAppStore();
  const loginTitle = customDomainContext?.org_name || 'Monefyi Planner';
  const loginSubtitle = customDomainContext
    ? 'Masuk ke workspace perusahaan Anda'
    : 'Masuk ke akun kamu';

  const handleDemoLogin = async (role: 'owner' | 'manager' | 'worker') => {
    if (!config.devDemoAuth) return;
    setLoading(true);
    const users = {
      owner: { id: 'demo-u-1', name: 'Budi Santoso', email: 'demo@local', role: 'owner' as const, tenant_id: 'demo' },
      manager: { id: 'demo-u-2', name: 'Sari Dewi', email: 'demo@local', role: 'manager' as const, tenant_id: 'demo' },
      worker: { id: 'demo-u-3', name: 'Ahmad Rizky', email: 'demo@local', role: 'worker' as const, tenant_id: 'demo' },
    };
    setUser(users[role]);
    setTenant({
      id: 'demo',
      name: 'CV Buana Konstruksi (Demo)',
      slug: 'demo',
      business_type: 'construction',
      plan: 'pro',
      currency: 'IDR',
      timezone: 'Asia/Jakarta',
    });
    setDemoMode(true);
    setAuthenticated(true);
    setAuthInitializing(false);
    setLoading(false);
    navigate('/app');
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: authErr } = await signInWithPassword(email, password);
      if (authErr) {
        setError(authUserMessage(authErr));
        return;
      }
      if (data.session) {
        setAuthInitializing(true);
        try {
          await runBootstrap(data.session);
        } finally {
          setAuthInitializing(false);
        }
        navigate('/app');
      } else {
        setError('Login berhasil tetapi sesi tidak tersedia. Verifikasi email terlebih dahulu.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Masukkan email terlebih dahulu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: resetErr } = await resetPasswordForEmail(email);
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-slate-900">{loginTitle}</div>
              <div className="text-xs text-slate-500">{loginSubtitle}</div>
            </div>
          </div>
          {customDomainContext && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-4">
              Powered by Monefyi Planner
            </p>
          )}

          {config.devDemoAuth && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-xs text-emerald-700 font-semibold mb-3">Demo — Pilih role:</p>
              <div className="grid grid-cols-3 gap-2">
                {(['owner', 'manager', 'worker'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleDemoLogin(role)}
                    className="p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-500 text-xs font-bold capitalize"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="kamu@bisnis.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
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
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={handleForgotPassword} className="text-xs text-emerald-600 font-medium hover:underline">
                Lupa password?
              </button>
            </div>

            {resetSent && (
              <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                Link reset password dikirim ke email Anda.
              </p>
            )}

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            <Link to="/join" className="text-emerald-600 font-semibold hover:underline">
              Punya undangan? Klik di sini
            </Link>
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            Belum punya akun?{' '}
            <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">
              Daftar gratis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

type SignupStep = 1 | 2 | 3;

function validateSignupStep1(form: { name: string; email: string; password: string }): string | null {
  if (!form.name.trim()) return 'Nama lengkap wajib diisi';
  if (!form.email.trim()) return 'Email wajib diisi';
  if (!isValidEmail(form.email)) return 'Format email tidak valid';
  const pw = validatePassword(form.password);
  if (!pw.valid) return pw.errors.join('. ');
  return null;
}

function validateSignupStep2(form: { businessName: string }): string | null {
  if (!form.businessName.trim()) return 'Nama bisnis wajib diisi';
  return null;
}

export function SignupPage() {
  const [step, setStep] = useState<SignupStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    businessType: 'construction',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  });

  const step1Ready =
    form.name.trim().length > 0
    && isValidEmail(form.email)
    && isPasswordReady(form.password);

  const step2Ready = form.businessName.trim().length > 0;

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateSignupStep1(form);
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateSignupStep2(form);
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
    }
  };

  const handleSignup = async () => {
    const step1Err = validateSignupStep1(form);
    if (step1Err) {
      setError(step1Err);
      setStep(1);
      return;
    }
    const step2Err = validateSignupStep2(form);
    if (step2Err) {
      setError(step2Err);
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');
    try {
      let { data, error: signUpErr } = await signUpWithPassword(form.email, form.password, {
        name: form.name,
        org_name: form.businessName,
        business_type: form.businessType,
        currency: form.currency,
        timezone: form.timezone,
      });

      if (signUpErr) {
        const em = (signUpErr.message || '').toLowerCase();
        if (em.includes('registered') || em.includes('already')) {
          const signIn = await signInWithPassword(form.email, form.password);
          if (!signIn.error && signIn.data.session) {
            await runBootstrap(signIn.data.session);
            navigate('/app');
            return;
          }
        }
        setError(authUserMessage(signUpErr));
        return;
      }

      if (data?.session) {
        await runBootstrap(data.session);
        navigate('/app');
        return;
      }

      if (data?.user && !data.session) {
        const signIn = await signInWithPassword(form.email, form.password);
        if (!signIn.error && signIn.data.session) {
          await runBootstrap(signIn.data.session);
          navigate('/app');
          return;
        }
        setError(authUserMessage(signIn.error) + ' Coba masuk manual.');
        navigate('/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = step === 1 ? step1Ready : step === 2 ? step2Ready : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 mt-6">
              <h3 className="font-bold text-slate-800">Info Akun</h3>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className={`w-full px-4 py-3 rounded-xl border text-sm ${form.email && !isValidEmail(form.email) ? 'border-rose-300' : 'border-slate-200'}`} />
              {form.email && !isValidEmail(form.email) && (
                <p className="text-xs text-rose-600 -mt-2">Format email tidak valid</p>
              )}
              <PasswordField
                value={form.password}
                onChange={password => setForm({ ...form, password })}
                placeholder="Password (min 8, huruf besar, angka, simbol)"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 mt-6">
              <h3 className="font-bold text-slate-800">Info Bisnis</h3>
              <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Nama bisnis / perusahaan" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <select value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="construction">Konstruksi</option>
                <option value="service">Jasa</option>
                <option value="other">Lainnya</option>
              </select>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD</option>
              </select>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 mt-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-black text-xl">Siap mulai!</h3>
              <p className="text-sm text-slate-500">Organisasi <strong>{form.businessName}</strong> akan dibuat otomatis.</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button type="button" onClick={() => { setError(''); setStep((step - 1) as SignupStep); }} className="px-4 py-3 border border-slate-200 rounded-xl">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lanjut <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            ) : (
              <button type="button" onClick={handleSignup} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60">
                {loading ? 'Membuat akun...' : 'Masuk ke Dashboard'}
              </button>
            )}
          </div>

          {step === 1 && !canProceed && (
            <p className="text-xs text-slate-400 text-center mt-3">Lengkapi semua field dan penuhi syarat password untuk melanjutkan.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
