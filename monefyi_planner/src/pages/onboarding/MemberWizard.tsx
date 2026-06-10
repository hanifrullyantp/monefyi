import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { completeMemberOnboarding } from '../../services/onboardingService';
import { runBootstrap } from '../../hooks/useBootstrap';
import { getSession } from '../../services/authService';
import { showToast } from '../../store/uiStore';

type Step = 1 | 2 | 3;

export function MemberOnboardingWizard() {
  const { user, tenant, setOnboardingCompleted } = useAppStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    position: '',
    department: '',
    phone: '',
    bio: '',
  });

  const finish = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await completeMemberOnboarding(user.id, profile);
      setOnboardingCompleted(true);
      const session = await getSession();
      if (session) await runBootstrap(session);
      showToast('Selamat datang!', 'success');
      navigate('/app');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <h1 className="text-lg font-black text-emerald-600 mb-1">Selamat datang di {tenant?.name}</h1>
        <p className="text-sm text-slate-500 mb-6">Lengkapi profil Anda (opsional)</p>

        {step === 1 && (
          <div className="space-y-3">
            <input value={profile.position} onChange={e => setProfile({ ...profile, position: e.target.value })} placeholder="Posisi / jabatan" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
            <input value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} placeholder="Departemen" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
            <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="No. HP" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-sm text-slate-600">
            <p><strong>Dashboard</strong> — lihat proyek yang ditugaskan</p>
            <p><strong>Projects</strong> — update progress & task</p>
            <p><strong>Worker view</strong> — absensi & work items</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-medium">Checklist memulai:</p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>☐ Lengkapi profil</li>
              <li>☐ Buka project pertama</li>
              <li>☐ Selesaikan task pertama</li>
              <li>☐ Atur preferensi notifikasi</li>
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={finish} disabled={loading} className="flex items-center gap-1 px-4 py-2 text-sm text-slate-500">
            <SkipForward className="w-4 h-4" /> Lewati
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((step + 1) as Step)} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl">Lanjut</button>
          ) : (
            <button type="button" onClick={finish} disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl">Mulai</button>
          )}
        </div>
      </div>
    </div>
  );
}
