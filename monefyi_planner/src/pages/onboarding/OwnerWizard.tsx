import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { completeOwnerOnboarding } from '../../services/onboardingService';
import { runBootstrap } from '../../hooks/useBootstrap';
import { getSession } from '../../services/authService';
import { showToast } from '../../store/uiStore';

type Step = 1 | 2 | 3 | 4;

export function OwnerOnboardingWizard() {
  const { tenant, setOnboardingCompleted, setHasMembership } = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [brandColor, setBrandColor] = useState('#059669');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = async (skipped = false) => {
    setLoading(true);
    setError('');
    try {
      const session = await getSession();
      if (!session) throw new Error('Sesi tidak ditemukan. Silakan masuk lagi.');

      let orgId = tenant?.id || useAppStore.getState().tenant?.id;
      if (!orgId) {
        await runBootstrap(session);
        orgId = useAppStore.getState().tenant?.id;
      }
      if (!orgId) {
        throw new Error('Organisasi belum ditemukan. Muat ulang halaman atau selesaikan pendaftaran owner.');
      }

      await completeOwnerOnboarding(orgId, {
        brand_color: brandColor,
        timezone,
      });

      setOnboardingCompleted(true);
      setHasMembership(true);

      try {
        await runBootstrap(session);
      } catch {
        /* keep local onboarding flag if refresh fails */
      }

      if (!useAppStore.getState().onboardingCompleted) {
        setOnboardingCompleted(true);
      }

      showToast(skipped ? 'Onboarding dilewati' : 'Workspace siap!', 'success');
      navigate('/app', { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-emerald-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">Setup workspace</h1>
            <p className="text-sm text-slate-500">Atur tampilan dasar {tenant?.name || 'perusahaan Anda'}</p>
            <label className="block text-sm font-medium">Warna brand</label>
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="w-full h-10 rounded-lg" />
            <label className="block text-sm font-medium">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm">
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-4">
            <h1 className="text-xl font-black">Buat project pertama?</h1>
            <p className="text-sm text-slate-500">Anda bisa membuat project nanti dari dashboard.</p>
            <p className="text-xs text-slate-600">Klik Lanjut di bawah — project bisa dibuat setelah masuk aplikasi.</p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <h1 className="text-xl font-black">Undang anggota pertama?</h1>
            <p className="text-sm text-slate-500">Buka halaman Tim setelah setup untuk mengundang.</p>
            <p className="text-xs text-slate-600">Klik Lanjut di bawah — undangan bisa dikirim setelah masuk aplikasi.</p>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-black">Tour singkat</h1>
            <ul className="text-sm text-slate-600 text-left space-y-2">
              <li>• Dashboard — ringkasan proyek & AI insights</li>
              <li>• Projects — RAP, timeline, biaya</li>
              <li>• Monefyi Button — perintah suara/teks</li>
            </ul>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 mt-4">{error}</p>
        )}

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={() => finish(true)} disabled={loading} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-500 disabled:opacity-50">
            <SkipForward className="w-4 h-4" /> Lewati
          </button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep((step + 1) as Step)} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl">Lanjut</button>
          ) : (
            <button type="button" onClick={() => finish(false)} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Mulai menggunakan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
