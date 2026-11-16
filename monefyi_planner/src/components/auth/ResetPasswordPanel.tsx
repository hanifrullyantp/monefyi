import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import PasswordField, { isPasswordReady } from './PasswordField';
import { PlannerLogo } from '../MonefyiLogo';
import { authUserMessage } from '../../lib/authMessages';
import { isEstimatorBrandContext } from '../../lib/estimatorBrand';
import { estimatorAppEntryPath } from '../../lib/pwaBrand';
import { runBootstrap } from '../../hooks/useBootstrap';
import {
  clearPasswordRecoveryIntent,
  readPasswordRecoveryError,
} from '../../lib/passwordRecoveryIntent';
import {
  getSessionSafe,
  onAuthStateChange,
  resetPasswordForEmail,
  updatePassword,
} from '../../services/authService';
import { useAppStore } from '../../store/appStore';

/** Saves the new password, then opens the app with the recovery session. */
export async function finishPasswordReset(navigate: (path: string, opts?: { replace?: boolean }) => void): Promise<void> {
  const { session } = await getSessionSafe();
  if (session) await runBootstrap(session);
  clearPasswordRecoveryIntent();
  const dest = isEstimatorBrandContext() ? estimatorAppEntryPath() : '/app';
  navigate(dest, { replace: true });
}

interface ResetPasswordPanelProps {
  onUpdated: () => Promise<void>;
}

/**
 * Form shown after the user opens a Supabase recovery link.
 * The link creates a session, but does not change the password by itself.
 */
export default function ResetPasswordPanel({ onUpdated }: ResetPasswordPanelProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(() => readPasswordRecoveryError() || '');

  useEffect(() => {
    let cancelled = false;
    const subscription = onAuthStateChange((_event, session) => {
      if (!cancelled && session) setHasSession(true);
    });
    void getSessionSafe().then(({ session }) => {
      if (cancelled) return;
      setHasSession(!!session);
      setReady(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isPasswordReady(password)) {
      setError('Password belum memenuhi syarat.');
      return;
    }
    if (password !== confirm) {
      setError('Ulangan password tidak sama.');
      return;
    }
    setLoading(true);
    try {
      const { session } = await getSessionSafe();
      if (!session) {
        setHasSession(false);
        setError('Sesi tautan tidak ditemukan. Minta tautan baru di bawah.');
        return;
      }
      const { error: updateErr } = await updatePassword(password);
      if (updateErr) throw updateErr;
      try {
        await onUpdated();
      } catch {
        setError('Password sudah disimpan. Masuk lagi dengan password baru.');
      }
    } catch (err) {
      setError(authUserMessage(err instanceof Error ? err : new Error('Gagal menyimpan password')));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSent(false);
    if (!email.trim()) {
      setError('Masukkan email terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const { error: resetErr } = await resetPasswordForEmail(email);
      if (resetErr) throw resetErr;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim tautan baru');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <p className="text-sm text-slate-500">Menyiapkan form password…</p>;
  }

  if (!hasSession) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Tautan reset tidak membuka sesi. Minta tautan baru, lalu buka email di perangkat ini dan isi password baru.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="kamu@bisnis.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
            />
          </div>
        </div>
        {sent && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Tautan baru dikirim. Buka email, lalu isi password di halaman yang terbuka.
          </p>
        )}
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
        )}
        <button
          type="button"
          onClick={() => { void handleResend(); }}
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-60"
        >
          {loading ? 'Mengirim…' : 'Kirim tautan baru'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-sm text-slate-600">
        Tautan reset sudah terbuka. Isi password baru di bawah. Password lama tidak dipakai lagi setelah ini disimpan.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="new-password">Password baru</label>
        <PasswordField
          id="new-password"
          value={password}
          onChange={setPassword}
          placeholder="Password baru"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirm-password">Ulangi password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Ulangi password baru"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm"
        />
      </div>
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !isPasswordReady(password)}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-60"
      >
        {loading ? 'Menyimpan…' : 'Simpan password baru'}
      </button>
    </form>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const setAuthInitializing = useAppStore(s => s.setAuthInitializing);

  const handleUpdated = async () => {
    setAuthInitializing(true);
    try {
      await finishPasswordReset(navigate);
    } finally {
      setAuthInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          onClick={() => clearPasswordRecoveryIntent()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke login
        </Link>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <PlannerLogo variant="lockup" />
          <p className="text-xs text-slate-500 mt-2 mb-6">Buat password baru</p>
          <ResetPasswordPanel onUpdated={handleUpdated} />
        </div>
      </div>
    </div>
  );
}
