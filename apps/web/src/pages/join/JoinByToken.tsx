import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { validatePassword } from '../../lib/validators';
import PasswordField, { isPasswordReady } from '../../components/auth/PasswordField';
import { authUserMessage } from '../../lib/authMessages';
import { signInWithPassword, signUpWithPassword } from '../../services/authService';
import { validateInvitation, acceptInvitation } from '../../services/onboardingService';
import { runBootstrap } from '../../hooks/useBootstrap';
import type { InvitationPreview } from '../../types/onboarding';
import { config } from '../../lib/config';

export function JoinByTokenPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token undangan tidak ditemukan');
      setLoading(false);
      return;
    }
    validateInvitation({ token })
      .then(data => {
        setPreview(data as unknown as InvitationPreview);
        if (data.email) setForm(f => ({ ...f, email: String(data.email) }));
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Gagal memuat undangan'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview?.valid) return;
    const pw = validatePassword(form.password);
    if (!isLogin && !pw.valid) {
      setError(pw.errors.join('. '));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (isLogin) {
        const { data, error: authErr } = await signInWithPassword(form.email, form.password);
        if (authErr) throw authErr;
        if (!data.session) throw new Error('Login gagal');
        await acceptInvitation({ token, name: form.name });
        await runBootstrap(data.session);
      } else {
        const { data, error: signUpErr } = await signUpWithPassword(form.email, form.password, {
          name: form.name,
          signup_intent: 'join_org',
        });
        if (signUpErr) throw signUpErr;
        let session = data.session;
        if (!session) {
          const signIn = await signInWithPassword(form.email, form.password);
          if (signIn.error) throw signIn.error;
          session = signIn.data.session;
        }
        if (!session) {
          if (!config.skipEmailVerify) {
            navigate('/verify-email');
            return;
          }
          throw new Error('Verifikasi email diperlukan');
        }
        await acceptInvitation({ token, name: form.name });
        await runBootstrap(session);
      }
      navigate('/onboarding/member');
    } catch (err) {
      setError(err instanceof Error ? authUserMessage(err) || err.message : 'Gagal bergabung');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!preview?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div>
            <h1 className="text-xl font-black text-slate-900 mb-2">Undangan Tidak Valid</h1>
            <p className="text-sm text-rose-600">{preview?.error || error || 'Undangan tidak valid atau sudah kedaluwarsa.'}</p>
            <p className="text-xs text-slate-600 mt-2">Anda tetap bisa bergabung dengan kode 6-digit atau mencari perusahaan Anda.</p>
          </div>
          <div className="space-y-2.5">
            <Link
              to="/join-by-code"
              className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Gabung Pakai Kode
            </Link>
            <Link
              to="/find-company"
              className="block w-full py-3 px-4 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-800 font-bold rounded-xl text-sm transition-colors"
            >
              Cari Perusahaan
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-sm">
            <Link to="/login" className="text-emerald-700 font-semibold hover:underline">Masuk</Link>
            <span className="text-slate-300">·</span>
            <Link to="/signup" className="text-emerald-700 font-semibold hover:underline">Daftar / Join lainnya</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: preview.brand_color || '#059669' }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-black text-xl text-slate-900">{preview.org_name}</h1>
          <p className="text-sm text-slate-600">Diundang sebagai <strong className="capitalize">{preview.role}</strong> oleh {preview.inviter_name}</p>
          {preview.personal_message && (
            <p className="text-sm bg-slate-50 p-3 rounded-xl mt-3 text-slate-600">{preview.personal_message}</p>
          )}
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <div>
            <label htmlFor="join-token-name" className="block text-sm font-medium text-slate-700 mb-1">Nama lengkap</label>
            <input
              id="join-token-name"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nama lengkap"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label htmlFor="join-token-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="join-token-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              required
              readOnly={!!preview.email}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm read-only:bg-slate-50"
            />
          </div>
          <div>
            <label htmlFor="join-token-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            {isLogin ? (
              <input
                id="join-token-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
              />
            ) : (
              <PasswordField
                id="join-token-password"
                name="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={password => setForm({ ...form, password })}
                placeholder="Password (min 8, huruf besar, angka, simbol)"
              />
            )}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim() || (!isLogin && !isPasswordReady(form.password)) || (isLogin && !form.password)}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memproses...' : 'Terima & Bergabung'}
          </button>
        </form>

        <button type="button" onClick={() => { setIsLogin(v => !v); setError(''); setForm(f => ({ ...f, password: '' })); }} className="w-full mt-3 text-sm text-emerald-700 font-semibold hover:underline">
          {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </div>
  );
}
