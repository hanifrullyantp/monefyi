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
        setPreview(data as InvitationPreview);
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!preview?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center border border-slate-100">
          <p className="text-rose-600 mb-4">{preview?.error || error || 'Undangan tidak valid'}</p>
          <Link to="/signup" className="text-indigo-600 font-semibold">Daftar / Join lainnya</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: preview.brand_color || '#6366f1' }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-black text-xl text-slate-900">{preview.org_name}</h1>
          <p className="text-sm text-slate-500">Diundang sebagai <strong className="capitalize">{preview.role}</strong> oleh {preview.inviter_name}</p>
          {preview.personal_message && (
            <p className="text-sm bg-slate-50 p-3 rounded-xl mt-3 text-slate-600">{preview.personal_message}</p>
          )}
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required readOnly={!!preview.email} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50" />
          {isLogin ? (
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
          ) : (
            <PasswordField
              value={form.password}
              onChange={password => setForm({ ...form, password })}
              placeholder="Password (min 8, huruf besar, angka, simbol)"
            />
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !form.name.trim() || !form.email.trim() || (!isLogin && !isPasswordReady(form.password)) || (isLogin && !form.password)}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memproses...' : 'Terima & Bergabung'}
          </button>
        </form>

        <button type="button" onClick={() => { setIsLogin(v => !v); setError(''); setForm(f => ({ ...f, password: '' })); }} className="w-full mt-3 text-sm text-indigo-600 font-semibold">
          {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </div>
  );
}
