import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, Mail } from 'lucide-react';
import { authUserMessage } from '../../lib/authMessages';
import { isValidEmail, validatePassword } from '../../lib/validators';
import { signInWithPassword, signUpWithPassword, resendSignupVerification, getSession } from '../../services/authService';
import { createOwnerOrg } from '../../services/onboardingService';
import { runBootstrap } from '../../hooks/useBootstrap';
import { config } from '../../lib/config';
import { ownerOrgParamsToForm, parseOwnerOrgParamsFromMetadata } from '../../lib/ownerSignup';
import { useAppStore } from '../../store/appStore';
import PasswordField, { isPasswordReady } from '../../components/auth/PasswordField';

type Step = 1 | 2 | 3 | 4;

function validateStep1(form: { name: string; email: string; password: string }): string | null {
  if (!form.name.trim()) return 'Nama lengkap wajib diisi';
  if (!form.email.trim()) return 'Email wajib diisi';
  if (!isValidEmail(form.email)) return 'Format email tidak valid';
  const pw = validatePassword(form.password);
  if (!pw.valid) return pw.errors.join('. ');
  return null;
}

function validateStep2(form: { businessName: string }): string | null {
  if (!form.businessName.trim()) return 'Nama perusahaan wajib diisi';
  return null;
}

export function OwnerSignupPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resume = searchParams.get('resume') === '1';
  const { hasMembership } = useAppStore();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    industry: 'construction',
    teamSize: '1-10',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  });

  const step1Ready =
    form.name.trim().length > 0
    && isValidEmail(form.email)
    && isPasswordReady(form.password);

  const step2Ready = form.businessName.trim().length > 0;

  useEffect(() => {
    if (!resume || hasMembership) return;
    void (async () => {
      const session = await getSession();
      if (!session?.user) return;
      const params = parseOwnerOrgParamsFromMetadata(
        session.user.user_metadata as Record<string, unknown>,
      );
      if (!params) return;
      setForm(prev => ({
        ...prev,
        ...ownerOrgParamsToForm(params),
        email: session.user.email || prev.email,
      }));
      setStep(3);
    })();
  }, [resume, hasMembership]);

  const createOrgPayload = () => ({
    org_name: form.businessName,
    industry: form.industry,
    team_size: form.teamSize,
    timezone: form.timezone,
    currency: form.currency,
    business_type: form.industry,
    name: form.name,
  });

  const finishOwnerSetup = async (session: NonNullable<Awaited<ReturnType<typeof getSession>>>) => {
    await createOwnerOrg(createOrgPayload());
    await runBootstrap(session);
    navigate('/onboarding/owner');
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1(form);
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2(form);
      if (err) {
        setError(err);
        return;
      }
      setStep(3);
    }
  };

  const handleSignup = async () => {
    const step1Err = validateStep1(form);
    if (step1Err) {
      setError(step1Err);
      setStep(1);
      return;
    }
    const step2Err = validateStep2(form);
    if (step2Err) {
      setError(step2Err);
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const existingSession = await getSession();
      if (existingSession?.user) {
        await finishOwnerSetup(existingSession);
        return;
      }

      const { data, error: signUpErr } = await signUpWithPassword(form.email, form.password, {
        name: form.name,
        signup_intent: 'create_org',
        org_name: form.businessName,
        industry: form.industry,
        team_size: form.teamSize,
        currency: form.currency,
        timezone: form.timezone,
      });

      if (signUpErr) {
        setError(authUserMessage(signUpErr));
        return;
      }

      if (!data.session && data.user && !config.skipEmailVerify) {
        setStep(4);
        return;
      }

      let session = data.session;
      if (!session) {
        const signIn = await signInWithPassword(form.email, form.password);
        if (signIn.error) throw signIn.error;
        session = signIn.data.session;
      }
      if (!session) throw new Error('Sesi tidak tersedia');

      await finishOwnerSetup(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMsg('');
    setError('');
    try {
      const { error: resendErr } = await resendSignupVerification(form.email);
      if (resendErr) throw resendErr;
      setResendMsg('Email verifikasi dikirim ulang. Cek inbox dan folder spam.');
    } catch (err) {
      setError(err instanceof Error ? authUserMessage(err) || err.message : 'Gagal kirim ulang email');
    } finally {
      setResendLoading(false);
    }
  };

  const canProceed = step === 1 ? step1Ready : step === 2 ? step2Ready : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/signup" className="text-slate-400 hover:text-white text-sm mb-8 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="flex gap-1 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= Math.min(step, 3) ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
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
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Info Perusahaan</h3>
              <input value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Nama perusahaan" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="construction">Konstruksi</option>
                <option value="service">Jasa</option>
                <option value="retail">Retail</option>
                <option value="other">Lainnya</option>
              </select>
              <select value={form.teamSize} onChange={e => setForm({ ...form, teamSize: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
                <option value="1-10">1–10 orang</option>
                <option value="11-50">11–50 orang</option>
                <option value="51-200">51–200 orang</option>
                <option value="200+">200+ orang</option>
              </select>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-black text-xl">{resume ? 'Lanjutkan setup perusahaan' : 'Siap buat perusahaan'}</h3>
              <p className="text-sm text-slate-500">
                Workspace <strong>{form.businessName}</strong> akan dibuat. Anda otomatis menjadi Owner.
              </p>
              {resume && (
                <p className="text-xs text-slate-400">Data perusahaan sudah diisi saat pendaftaran — tidak perlu cari perusahaan lagi.</p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <Mail className="w-12 h-12 text-indigo-500 mx-auto" />
              <h3 className="font-black text-xl">Verifikasi email</h3>
              <p className="text-sm text-slate-500">Kami mengirim link verifikasi ke <strong>{form.email}</strong>. Setelah verifikasi, masuk dan lanjutkan setup.</p>
              <p className="text-xs text-slate-400">Cek juga folder spam. Pengirim: <strong>noreply@monefyi.com</strong></p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="inline-block py-2 px-4 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-bold disabled:opacity-60"
              >
                {resendLoading ? 'Mengirim...' : 'Kirim ulang email verifikasi'}
              </button>
              {resendMsg && <p className="text-sm text-emerald-600">{resendMsg}</p>}
              <Link to="/login" className="inline-block py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-bold">Ke halaman masuk</Link>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 mt-4">{error}</p>}

          {step < 4 && (
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button type="button" onClick={() => { setError(''); setStep((step - 1) as Step); }} className="px-4 py-3 border border-slate-200 rounded-xl">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Lanjut <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              ) : (
                <button type="button" onClick={handleSignup} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-60">
                  {loading ? 'Membuat...' : 'Buat Perusahaan'}
                </button>
              )}
            </div>
          )}

          {step === 1 && !canProceed && (
            <p className="text-xs text-slate-400 text-center mt-3">Lengkapi semua field dan penuhi syarat password untuk melanjutkan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
