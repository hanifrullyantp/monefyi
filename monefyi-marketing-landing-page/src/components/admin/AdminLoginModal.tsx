import React, { useState } from 'react';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAdminAuthContext } from '../../context/AdminAuthContext';

export function AdminLoginModal(): React.ReactElement {
  const { loginOpen, closeLogin, signIn } = useAdminAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Login gagal. Coba lagi.');
      return;
    }

    setPassword('');
  };

  return (
    <Modal open={loginOpen} onClose={closeLogin} maxWidth="max-w-md" className="z-[10001]">
      <form onSubmit={handleSubmit} className="p-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
          <ShieldCheck size={28} />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Login Admin Landing</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Masuk dengan akun Monefyi admin untuk mengedit konten landing page.
        </p>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-amber-400"
                placeholder="hanif.rullyant@gmail.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Password</span>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-amber-400"
                placeholder="••••••••"
              />
            </div>
          </label>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Button type="submit" fullWidth size="lg" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Masuk & Edit Landing
          </Button>
          <button
            type="button"
            onClick={closeLogin}
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}
