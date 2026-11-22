import { useState, useEffect, useCallback } from 'react';
import { Key, Loader2, RefreshCw, Shield, CreditCard, Bell } from 'lucide-react';
import { getUserAccount, updateUserAccount, type UserAccountInfo } from '../../services/adminService';
import { updatePassword } from '../../services/authService';
import { validatePassword } from '../../lib/validators';
import { showToast } from '../../store/uiStore';
import AIProviderPanel from './AIProviderPanel';

export default function UserAccountPanel() {
  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUserAccount();
      setAccount(res.account);
      setName(res.account.name || '');
      setPhone(res.account.phone || '');
      setEmailNotif(res.account.email_notifications);
      setPushNotif(res.account.push_notifications);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat akun', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserAccount({
        name: name.trim(),
        phone: phone.trim(),
        email_notifications: emailNotif,
        push_notifications: pushNotif,
        ...(geminiKey.trim() ? { gemini_key: geminiKey.trim() } : {}),
      });
      setGeminiKey('');
      showToast('Profil akun disimpan', 'success');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('Password tidak cocok', 'error');
      return;
    }
    const v = validatePassword(newPassword);
    if (!v.valid) {
      showToast(v.errors[0], 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password diubah', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal ubah password', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !account) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  if (!account) return <p className="text-sm text-slate-500">Data akun tidak tersedia.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Akun & Langganan</h3>
          <p className="text-sm text-slate-500">Statistik, API key Gemini, dan preferensi.</p>
        </div>
        <button type="button" onClick={load} aria-label="Muat ulang data akun" className="p-2 border rounded-xl hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Paket', value: account.plan_type, icon: CreditCard },
          { label: 'AI hari ini', value: `${account.ai_used_today}/${account.ai_daily_limit}`, icon: Shield },
          { label: 'Fallback platform', value: `${account.platform_fallback_used}/${account.platform_fallback_limit}`, icon: Key },
          { label: 'Organisasi aktif', value: String(account.active_orgs), icon: Bell },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <k.icon className="w-4 h-4 text-emerald-500 mb-2" />
            <div className="text-lg font-black text-slate-900">{k.value}</div>
            <div className="text-xs text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Gemini:</strong> {account.has_gemini_key
          ? `Menggunakan API key Anda (${account.gemini_key_hint})`
          : account.gemini_source === 'platform'
            ? 'Menggunakan key platform (kuota terbatas per hari)'
            : 'Belum ada key — tambahkan di bawah atau hubungi admin'}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="user-account-name" className="text-xs font-semibold text-slate-600">Nama</label>
          <input
            id="user-account-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          />
        </div>
        <div>
          <label htmlFor="user-account-phone" className="text-xs font-semibold text-slate-600">Telepon</label>
          <input
            id="user-account-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="user-gemini-key" className="text-xs font-semibold text-slate-600">Gemini API Key (opsional)</label>
          <input
            id="user-gemini-key"
            name="geminiApiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder={account.has_gemini_key ? 'Kosongkan jika tidak ingin mengubah' : 'AIza...'}
            className="w-full mt-1 px-3 py-2 rounded-xl border text-sm font-mono"
          />
          <p className="text-xs text-slate-600 mt-1">
            Key Gemini akun ini dipakai untuk parsing perintah AI di server (tanpa key, sistem memakai kuota platform harian). Untuk memilih provider BYOK lain atau mengatur model &amp; batas auto-eksekusi, buka panel <strong>Pengaturan Lanjutan AI (BYOK Provider)</strong> di bawah.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label htmlFor="user-email-notif" className="flex items-center gap-2">
          <input id="user-email-notif" name="emailNotifications" type="checkbox" checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} />
          Notifikasi email
        </label>
        <label htmlFor="user-push-notif" className="flex items-center gap-2">
          <input id="user-push-notif" name="pushNotifications" type="checkbox" checked={pushNotif} onChange={e => setPushNotif(e.target.checked)} />
          Push / in-app
        </label>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
        Simpan Profil Akun
      </button>

      <details className="group border-t pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 flex items-center justify-between list-none">
          <span>Pengaturan Lanjutan AI (BYOK Provider)</span>
          <span className="text-xs font-semibold text-emerald-700 group-open:hidden">Buka ▾</span>
          <span className="text-xs font-semibold text-slate-600 hidden group-open:inline">Tutup ▴</span>
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-600">
            Konfigurasi BYOK (Bring Your Own Key) tersinkron ke akun Anda dan dipakai langsung saat menjalankan AI Manager di workspace.
          </p>
          <AIProviderPanel />
        </div>
      </details>

      <div className="border-t pt-6 space-y-3">
        <h4 className="font-semibold text-slate-800">Ubah Password</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="user-new-password" className="block text-xs font-semibold text-slate-600 mb-1">Password baru</label>
            <input
              id="user-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Password baru"
              className="w-full px-3 py-2 rounded-xl border text-sm"
            />
          </div>
          <div>
            <label htmlFor="user-confirm-password" className="block text-xs font-semibold text-slate-600 mb-1">Konfirmasi password</label>
            <input
              id="user-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi"
              className="w-full px-3 py-2 rounded-xl border text-sm"
            />
          </div>
        </div>
        <button type="button" onClick={handlePassword} disabled={saving || !newPassword} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold">
          Update Password
        </button>
      </div>

      <div className="text-xs text-slate-600 space-y-1">
        <p>Email: {account.email} {account.email_verified ? '✓ terverifikasi' : '(belum verifikasi)'}</p>
        <p>Status akun: {account.status}</p>
        {account.plan_expires_at && <p>Berakhir: {new Date(account.plan_expires_at).toLocaleDateString('id-ID')}</p>}
      </div>
    </div>
  );
}
