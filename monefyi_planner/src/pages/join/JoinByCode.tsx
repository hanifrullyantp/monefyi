import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { formatInviteCode, validatePassword } from '../../lib/validators';
import { authUserMessage } from '../../lib/authMessages';
import { signInWithPassword, signUpWithPassword } from '../../services/authService';
import { validateInvitation, acceptInvitation } from '../../services/onboardingService';
import { runBootstrap } from '../../hooks/useBootstrap';
import type { InvitationPreview } from '../../types/onboarding';
import { config } from '../../lib/config';

export function JoinByCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [step, setStep] = useState<'code' | 'form'>('code');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const checkCode = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await validateInvitation({ code: formatInviteCode(code) });
      if (!data.valid) throw new Error(String(data.error || 'Kode tidak valid'));
      setPreview(data as InvitationPreview);
      setStep('form');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = validatePassword(form.password);
    if (!pw.valid) {
      setError(pw.errors.join('. '));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: signUpErr } = await signUpWithPassword(form.email, form.password, {
        name: form.name,
        signup_intent: 'join_org',
      });
      if (signUpErr) {
        const signIn = await signInWithPassword(form.email, form.password);
        if (signIn.error) throw signUpErr;
        if (!signIn.data.session) throw new Error('Login gagal');
        await acceptInvitation({ code: formatInviteCode(code), name: form.name });
        await runBootstrap(signIn.data.session);
        navigate('/onboarding/member');
        return;
      }
      let session = data.session;
      if (!session) {
        const signIn = await signInWithPassword(form.email, form.password);
        session = signIn.data.session;
      }
      if (!session && !config.skipEmailVerify) {
        navigate('/verify-email');
        return;
      }
      if (!session) throw new Error('Verifikasi email diperlukan');
      await acceptInvitation({ code: formatInviteCode(code), name: form.name });
      await runBootstrap(session);
      navigate('/onboarding/member');
    } catch (err) {
      setError(err instanceof Error ? authUserMessage(err) || err.message : 'Gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <Link to="/signup" className="text-sm text-slate-500 mb-4 inline-block">← Kembali</Link>

        {step === 'code' ? (
          <>
            <h1 className="font-black text-xl mb-2">Masukkan kode undangan</h1>
            <p className="text-sm text-slate-500 mb-4">Format: XXX-NNN</p>
            <input
              value={code}
              onChange={e => setCode(formatInviteCode(e.target.value))}
              placeholder="MNF-749"
              maxLength={7}
              className="w-full px-4 py-4 rounded-xl border border-slate-200 text-center text-2xl font-black tracking-widest"
            />
            {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
            <button type="button" onClick={checkCode} disabled={loading || code.length < 5} className="w-full mt-4 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-60">
              {loading ? 'Memeriksa...' : 'Lanjut'}
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <Building2 className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
              <h2 className="font-bold">{preview?.org_name}</h2>
              <p className="text-sm text-slate-500 capitalize">Role: {preview?.role}</p>
            </div>
            <form onSubmit={handleJoin} className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">Bergabung</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
