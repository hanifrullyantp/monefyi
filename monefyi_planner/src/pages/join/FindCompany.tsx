import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Building2 } from 'lucide-react';
import { searchCompanies, createJoinRequest } from '../../services/joinRequestService';
import { signInWithPassword, signUpWithPassword } from '../../services/authService';
import { validatePassword } from '../../lib/validators';
import PasswordField, { isPasswordReady } from '../../components/auth/PasswordField';
import { runBootstrap } from '../../hooks/useBootstrap';
import type { CompanySearchResult } from '../../types/onboarding';

export function FindCompanyPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'auth' | 'done'>('search');

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const companies = await searchCompanies(q);
      setResults(companies);
    } catch {
      setResults([]);
    }
  }, []);

  const handleSelect = (company: CompanySearchResult) => {
    setSelected(company);
    setStep('auth');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const pw = validatePassword(form.password);
    if (!pw.valid) {
      setError(pw.errors.join('. '));
      return;
    }
    setLoading(true);
    setError('');
    try {
      let session = null;
      const signUp = await signUpWithPassword(form.email, form.password, { name: form.name, signup_intent: 'join_request' });
      if (signUp.error) {
        const signIn = await signInWithPassword(form.email, form.password);
        if (signIn.error) throw signUp.error;
        session = signIn.data.session;
      } else {
        session = signUp.data.session;
        if (!session) {
          const signIn = await signInWithPassword(form.email, form.password);
          session = signIn.data.session;
        }
      }
      if (!session) throw new Error('Login/daftar gagal');
      await createJoinRequest(selected.id, message);
      await runBootstrap(session);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
        <Link to="/signup" className="text-sm text-slate-500 mb-4 inline-block">← Kembali</Link>

        {step === 'search' && (
          <>
            <h1 className="font-black text-xl mb-4">Cari perusahaan</h1>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  doSearch(e.target.value);
                }}
                placeholder="Nama perusahaan..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-full p-3 border border-slate-100 rounded-xl text-left hover:border-emerald-200 flex items-center gap-3"
                >
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.industry} · {c.team_size}</div>
                  </div>
                </button>
              ))}
              {query.length >= 2 && results.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Tidak ditemukan</p>
              )}
            </div>
          </>
        )}

        {step === 'auth' && selected && (
          <>
            <h2 className="font-bold mb-1">Request join: {selected.name}</h2>
            <p className="text-sm text-slate-500 mb-4">Owner akan review permintaan Anda</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Pesan (opsional)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm mb-3 h-20"
            />
            <form onSubmit={handleSubmit} className="space-y-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nama" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <PasswordField
                value={form.password}
                onChange={password => setForm({ ...form, password })}
                placeholder="Password (min 8, huruf besar, angka, simbol)"
              />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button type="submit" disabled={loading || !form.name.trim() || !form.email.trim() || !isPasswordReady(form.password)} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">Kirim permintaan</button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <h2 className="font-black text-xl mb-2">Permintaan terkirim!</h2>
            <p className="text-sm text-slate-500 mb-4">Owner akan memberi tahu setelah approve.</p>
            <button type="button" onClick={() => navigate('/app')} className="py-2 px-6 bg-emerald-600 text-white rounded-xl text-sm font-bold">Ke dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}
