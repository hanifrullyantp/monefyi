'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Lock, LogIn, Sparkles } from 'lucide-react';
import { useMonefyiAuth } from '@/components/monefyi/MonefyiAuthProvider';
import { LIFETIME_CHECKOUT_URL, LIFETIME_PRICE_DISPLAY } from '@/lib/bonus-config';
import { MONEFYI_APP_URL, MONEFYI_HOME_URL, MONEFYI_TRIAL_URL } from '@/lib/monefyi-config';

interface MonefyiLoginGateProps {
  appName: string;
  children: ReactNode;
}

export function MonefyiLoginGate({ appName, children }: MonefyiLoginGateProps) {
  const { status, signIn } = useMonefyiAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">Memverifikasi akun Monefyi…</p>
      </div>
    );
  }

  if (status === 'ready') {
    return <>{children}</>;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  const isNoProduct = status === 'no-product';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-xl font-black text-white">M</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
            by Monefyi
          </p>
          <h1 className="text-2xl font-bold text-white">{appName}</h1>
          <p className="text-sm text-slate-400 mt-2">
            Versi Lite · Login akun Monefyi wajib untuk mengakses aplikasi ini
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
          {isNoProduct ? (
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                Akun belum terdaftar di Monefyi
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Email Anda sudah login, tapi belum punya akses produk Monefyi.
                Daftar trial gratis atau ambil paket Lifetime untuk membuka semua
                bonus apps Lite.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={MONEFYI_TRIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 text-sm transition-colors"
                >
                  Mulai Trial Gratis
                </a>
                <a
                  href={LIFETIME_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl border border-slate-600 text-slate-200 font-semibold py-3 text-sm hover:border-emerald-500/50 transition-colors"
                >
                  Lifetime {LIFETIME_PRICE_DISPLAY}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Lock className="h-3.5 w-3.5" />
                Gunakan email &amp; password yang sama dengan app Monefyi
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="nama@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Masuk ke {appName}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-2">
            <a
              href={MONEFYI_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Buka app Monefyi utama →
            </a>
            <p className="text-[10px] text-slate-600">
              <a href={MONEFYI_HOME_URL} className="hover:text-slate-500">monefyi.com</a>
              {' · '}Bonus Lite untuk user Monefyi terdaftar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
