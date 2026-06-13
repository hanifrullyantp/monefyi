import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Globe, Loader2, RefreshCw, Shield } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { hasPlanCapability } from '../../lib/pricingPlans';
import {
  cnameTarget,
  loadOrgCustomDomains,
  registerCustomDomain,
  verifyCustomDomain,
  type CustomDomainRow,
} from '../../services/customDomainService';

type Props = {
  onUpgrade?: () => void;
};

export default function CustomDomainPanel({ onUpgrade }: Props) {
  const { tenant } = useAppStore();
  const canUse = hasPlanCapability(tenant?.plan, 'customDomain');
  const [rows, setRows] = useState<CustomDomainRow[]>([]);
  const [hostname, setHostname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant?.id || !canUse) return;
    setLoading(true);
    try {
      setRows(await loadOrgCustomDomains(tenant.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat domain', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, canUse]);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (!tenant?.id || !hostname.trim()) return;
    setSaving(true);
    try {
      await registerCustomDomain(tenant.id, hostname);
      setHostname('');
      showToast('Domain terdaftar — selesaikan DNS lalu verifikasi', 'success');
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mendaftarkan domain', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const result = await verifyCustomDomain(id);
      showToast(
        result.status === 'verified' ? 'Domain terverifikasi!' : 'TXT record belum ditemukan',
        result.status === 'verified' ? 'success' : 'error',
      );
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Verifikasi gagal', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => showToast('Disalin', 'success'));
  };

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
        <Shield className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="font-bold text-slate-900">Custom Domain — Pro+</h3>
        <p className="text-sm text-slate-600">
          Gunakan domain perusahaan Anda (mis. planner.perusahaan.com) dengan branding login kustom.
        </p>
        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
          >
            Lihat Pricelist & Upgrade
          </button>
        )}
      </div>
    );
  }

  if (loading && !rows.length) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const active = rows[0];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Globe className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Custom Domain</h3>
          <p className="text-sm text-slate-500">
            Arahkan subdomain perusahaan ke Monefyi Planner. Rekomendasi: <code className="bg-slate-100 px-1 rounded">planner.domainanda.com</code>
          </p>
        </div>
        <button type="button" onClick={load} className="ml-auto p-2 rounded-lg hover:bg-slate-100" aria-label="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!active && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={hostname}
            onChange={e => setHostname(e.target.value)}
            placeholder="planner.perusahaan.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
          />
          <button
            type="button"
            disabled={saving || !hostname.trim()}
            onClick={handleRegister}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Daftarkan'}
          </button>
        </div>
      )}

      {active && (
        <div className="rounded-xl border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-bold text-slate-900">{active.hostname}</div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                active.status === 'verified' ? 'bg-emerald-100 text-emerald-700'
                  : active.status === 'failed' ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                {active.status}
              </span>
            </div>
            {active.status !== 'verified' && (
              <button
                type="button"
                disabled={verifyingId === active.id}
                onClick={() => handleVerify(active.id)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
              >
                {verifyingId === active.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verifikasi DNS'}
              </button>
            )}
            {active.status === 'verified' && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700 font-semibold">
                <Check className="w-4 h-4" /> Aktif
              </span>
            )}
          </div>

          {active.status !== 'verified' && (
            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-500 mb-1">TXT (verifikasi)</div>
                <div className="font-mono text-xs break-all">
                  _monefyi-verify.{active.hostname}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-white border px-2 py-1 rounded flex-1 break-all">{active.verification_token}</code>
                  <button type="button" onClick={() => copy(active.verification_token)} className="p-1.5 hover:bg-slate-200 rounded">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-500 mb-1">CNAME</div>
                <p className="text-xs text-slate-600">
                  Host <strong>planner</strong> (atau subdomain yang dipilih) → <code>{cnameTarget()}</code>
                </p>
                <button type="button" onClick={() => copy(cnameTarget())} className="mt-1 text-xs text-emerald-600 font-semibold">
                  Salin target CNAME
                </button>
              </div>
            </div>
          )}

          {active.status === 'verified' && (
            <p className="text-xs text-slate-500">
              Tambahkan URL <strong>https://{active.hostname}</strong> ke Supabase Auth → Redirect URLs.
              SSL diaktifkan setelah domain ditambahkan di Vercel project.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
