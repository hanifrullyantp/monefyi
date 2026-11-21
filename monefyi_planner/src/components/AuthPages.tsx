import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye, EyeOff, ArrowLeft, ArrowRight, Mail, Lock, CheckCircle, AlertCircle,
} from 'lucide-react';
import { authUserMessage } from '../lib/authMessages';
import { config } from '../lib/config';
import { isValidEmail, validatePassword } from '../lib/validators';
import { runBootstrap } from '../hooks/useBootstrap';
import PasswordField, { isPasswordReady } from './auth/PasswordField';
import ResetPasswordPanel, { finishPasswordReset } from './auth/ResetPasswordPanel';
import {
  signInWithPassword,
  signUpWithPassword,
  resetPasswordForEmail,
  onAuthStateChange,
} from '../services/authService';
import {
  hasPasswordRecoveryIntent,
  markPasswordRecoveryIntent,
  readPasswordRecoveryError,
} from '../lib/passwordRecoveryIntent';
import { setActiveOrgTimeZone } from '../lib/adapters';
import {
  useAppStore,
  type Notification,
  type Project,
  type Tenant,
  type Todo,
  type Transaction,
  type User,
} from '../store/appStore';
import { EstimatorLogo } from './EstimatorLogo';
import { PlannerLogo } from './MonefyiLogo';
import { PLANNER_BRAND_NAME, PLANNER_TAGLINE } from '../lib/plannerBrand';
import { applyEstimatorDocumentBrand, isEstimatorBrandContext } from '../lib/estimatorBrand';
import { estimatorAppEntryPath } from '../lib/pwaBrand';
import { checkAndClearDeviceKickoutReason } from '../services/singleDeviceSessionService';

export function resolvePostLoginDestination(
  rawNext?: string | null,
  fromPath?: string | null,
  fallback = '/app',
): string {
  for (const candidate of [rawNext, fromPath]) {
    if (
      typeof candidate === 'string'
      && candidate.startsWith('/')
      && !candidate.startsWith('//')
      && !candidate.startsWith('/login')
    ) {
      return candidate;
    }
  }
  return fallback;
}

export function buildDemoSeedData(role: 'owner' | 'manager' | 'worker'): {
  user: User;
  tenant: Tenant;
  projects: Project[];
  notifications: Notification[];
  transactions: Transaction[];
  todos: Todo[];
} {
  const users: Record<'owner' | 'manager' | 'worker', User> = {
    owner: { id: 'demo-u-1', name: 'Budi Santoso', email: 'demo@local', role: 'owner', tenant_id: 'demo' },
    manager: { id: 'demo-u-2', name: 'Sari Dewi', email: 'demo@local', role: 'manager', tenant_id: 'demo' },
    worker: { id: 'demo-u-3', name: 'Ahmad Rizky', email: 'demo@local', role: 'worker', tenant_id: 'demo' },
  };
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const tenant: Tenant = {
    id: 'demo',
    name: 'CV Buana Konstruksi (Demo)',
    slug: 'demo',
    business_type: 'construction',
    plan: 'pro',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  };
  const projects: Project[] = [
    {
      id: 'demo-proj-1',
      tenant_id: 'demo',
      name: 'Renovasi Rumah Kemang',
      code: 'PRJ-DEMO-01',
      client_name: 'Ibu Rina Wijaya',
      location: 'Jakarta Selatan',
      type: 'construction',
      status: 'active',
      start_date: today,
      end_date: '2027-02-28',
      total_budget_planned: 185_000_000,
      contract_value: 245_000_000,
      currency: 'IDR',
      progress_percentage: 62,
      health_status: 'on_track',
      planned_progress: 60,
      spent_amount: 112_000_000,
      total_received: 150_000_000,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'demo-proj-2',
      tenant_id: 'demo',
      name: 'Interior Kitchen Set BSD',
      code: 'PRJ-DEMO-02',
      client_name: 'Pak Hendra',
      location: 'Tangerang Selatan',
      type: 'construction',
      status: 'active',
      start_date: today,
      end_date: '2027-01-31',
      total_budget_planned: 64_000_000,
      contract_value: 88_000_000,
      currency: 'IDR',
      progress_percentage: 38,
      health_status: 'at_risk',
      planned_progress: 52,
      spent_amount: 34_500_000,
      total_received: 44_000_000,
      created_at: now,
      updated_at: now,
    },
  ];
  const notifications: Notification[] = [
    {
      id: 'demo-notif-1',
      type: 'alert',
      title: 'Progress Interior BSD tertinggal',
      message: 'Realisasi 38% dibanding target rencana 52%. Periksa jadwal tim lapangan.',
      read: false,
      created_at: now,
      action_url: '/app?tab=projects',
      priority: 'high',
    },
    {
      id: 'demo-notif-2',
      type: 'update',
      title: 'Termin proyek Kemang diterima',
      message: 'Pembayaran termin ke-2 sebesar Rp 75.000.000 tercatat pada proyek demo.',
      read: false,
      created_at: now,
      action_url: '/app?tab=projects',
      priority: 'medium',
    },
  ];
  const transactions: Transaction[] = [
    {
      id: 'demo-tx-1',
      type: 'income',
      amount: 150_000_000,
      description: 'Termin 1 & 2 Renovasi Rumah Kemang',
      category: 'termin',
      account: 'Bank BCA Operasional',
      date: today,
      project_id: 'demo-proj-1',
      created_at: now,
    },
    {
      id: 'demo-tx-2',
      type: 'expense',
      amount: 18_500_000,
      description: 'Material semen & besi beton',
      category: 'material',
      account: 'Kas Proyek',
      date: today,
      project_id: 'demo-proj-1',
      created_at: now,
    },
  ];
  const todos: Todo[] = [
    {
      id: 'demo-todo-1',
      title: 'Cek pemasangan keramik lantai 2',
      priority: 'high',
      status: 'in_progress',
      due_date: today,
      assigned_to: users[role].id,
      project_id: 'demo-proj-1',
      created_at: now,
    },
    {
      id: 'demo-todo-2',
      title: 'Konfirmasi pengiriman HPL kitchen set',
      priority: 'medium',
      status: 'pending',
      due_date: today,
      assigned_to: users[role].id,
      project_id: 'demo-proj-2',
      created_at: now,
    },
  ];
  return { user: users[role], tenant, projects, notifications, transactions, todos };
}

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(
    () => hasPasswordRecoveryIntent() || Boolean(readPasswordRecoveryError()),
  );
  const [deviceKickoutNotice, setDeviceKickoutNotice] = useState(false);
  const navigate = useNavigate();

  const fromLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const fromPath = fromLocation?.pathname
    ? `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`
    : null;

  useEffect(() => {
    if (searchParams.get('reason') === 'other_device' || checkAndClearDeviceKickoutReason()) {
      setDeviceKickoutNotice(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const subscription = onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') return;
      markPasswordRecoveryIntent();
      setResetMode(true);
    });
    return () => subscription.unsubscribe();
  }, []);
  const {
    setUser, setTenant, setAuthenticated, setDemoMode, setAuthInitializing,
    setHasMembership, setOnboardingCompleted, setEmailVerified, setAuthError,
    setSyncStatus, setLastSynced, setProjects, setNotifications, setTransactions, setTodos,
    customDomainContext,
  } = useAppStore();
  const estimatorBrand = isEstimatorBrandContext();
  const loginTitle = customDomainContext?.org_name || (estimatorBrand ? 'Froyek Estimator' : PLANNER_BRAND_NAME);
  const loginSubtitle = customDomainContext
    ? 'Masuk ke workspace perusahaan Anda'
    : estimatorBrand
      ? 'Masuk ke dashboard Estimator'
      : PLANNER_TAGLINE;

  useEffect(() => {
    if (!estimatorBrand) return;
    applyEstimatorDocumentBrand(true);
    return () => applyEstimatorDocumentBrand(false);
  }, [estimatorBrand]);

  const handleDemoLogin = async (role: 'owner' | 'manager' | 'worker') => {
    if (!config.devDemoAuth) return;
    setLoading(true);
    const seed = buildDemoSeedData(role);
    setUser(seed.user);
    setActiveOrgTimeZone('Asia/Jakarta');
    setTenant(seed.tenant);
    setProjects(seed.projects);
    setNotifications(seed.notifications);
    setTransactions(seed.transactions);
    setTodos(seed.todos);
    setHasMembership(true);
    setOnboardingCompleted(true);
    setEmailVerified(true);
    setAuthError(null);
    setSyncStatus('synced');
    setLastSynced(new Date());
    setDemoMode(true);
    setAuthenticated(true);
    setAuthInitializing(false);
    setLoading(false);
    const dest = resolvePostLoginDestination(searchParams.get('next'), fromPath, '/app');
    navigate(dest, { replace: true });
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
        const defaultDest = estimatorBrand ? estimatorAppEntryPath() : '/app';
        const dest = resolvePostLoginDestination(searchParams.get('next'), fromPath, defaultDest);
        navigate(dest, { replace: true });
      } else {
        setError('Login berhasil tetapi sesi tidak tersedia. Verifikasi email terlebih dahulu.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdated = async () => {
    setAuthInitializing(true);
    try {
      await finishPasswordReset(navigate);
      setResetMode(false);
    } finally {
      setAuthInitializing(false);
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
          <div className="mb-8">
            {estimatorBrand ? (
              <div className="flex items-center gap-2">
                <EstimatorLogo className="w-10 h-10 rounded-xl object-contain" />
                <div>
                  <div className="font-black text-slate-900">{loginTitle}</div>
                  <div className="text-xs text-slate-500">{loginSubtitle}</div>
                </div>
              </div>
            ) : (
              <div>
                <PlannerLogo variant="lockup" />
                <div className="text-xs text-slate-500 mt-2">
                  {resetMode ? 'Buat password baru' : (customDomainContext ? loginTitle : loginSubtitle)}
                </div>
              </div>
            )}
          </div>
          {customDomainContext && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-4">
              Powered by Froyek
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

          {resetMode ? (
            <ResetPasswordPanel onUpdated={handlePasswordUpdated} />
          ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {deviceKickoutNotice && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-black text-amber-950 block mb-0.5">Sesi Berakhir (Login di Perangkat Lain)</span>
                  Akun ini baru saja digunakan untuk login di perangkat lain. Sistem hanya mengizinkan <strong>1 sesi perangkat aktif</strong> per akun. Silakan login kembali jika ingin menggunakan perangkat ini.
                </div>
              </div>
            )}
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
                Tautan reset dikirim. Buka email, lalu isi password baru di halaman yang terbuka.
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
          )}

          {!resetMode && (
          <>
          <p className="text-center text-sm text-slate-500 mt-4">
            <Link to="/join-by-code" className="text-emerald-600 font-semibold hover:underline">
              Punya undangan? Klik di sini
            </Link>
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            Belum punya akun?{' '}
            <Link to="/signup" className="text-emerald-600 font-semibold hover:underline">
              Daftar gratis
            </Link>
          </p>
          </>
          )}
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
