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
  const { tenant, setOnboardingCompleted } = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [loading, setLoading] = useState(false);

  const finish = async (skipped = false) => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      await completeOwnerOnboarding(tenant.id, {
        brand_color: brandColor,
        timezone,
      });
      setOnboardingCompleted(true);
      const session = await getSession();
      if (session) await runBootstrap(session);
      showToast(skipped ? 'Onboarding dilewati' : 'Workspace siap!', 'success');
      navigate('/app');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-xl font-black">Setup workspace</h1>
            <p className="text-sm text-slate-500">Atur tampilan dasar {tenant?.name}</p>
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
            <button type="button" onClick={() => navigate('/app?tab=projects')} className="text-indigo-600 font-semibold text-sm">Buat project sekarang →</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <h1 className="text-xl font-black">Undang anggota pertama?</h1>
            <p className="text-sm text-slate-500">Buka halaman Tim setelah setup untuk mengundang.</p>
            <button type="button" onClick={() => navigate('/app?tab=hr')} className="text-indigo-600 font-semibold text-sm">Ke halaman HR & Karyawan →</button>
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

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={() => finish(true)} disabled={loading} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-500">
            <SkipForward className="w-4 h-4" /> Lewati
          </button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep((step + 1) as Step)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">Lanjut</button>
          ) : (
            <button type="button" onClick={() => finish(false)} disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl">
              {loading ? 'Menyimpan...' : 'Mulai menggunakan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
