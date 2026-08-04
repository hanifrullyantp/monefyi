import { Sparkles, X } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Banner pengingat setup jika onboarding di-skip.
 */
export default function SetupBanner() {
  const { user } = useAuthStore();
  const onboardingCompleted = useOnboardingStore((s) => s.onboardingCompleted);
  const setupCompleted = useOnboardingStore((s) => s.setupCompleted);
  const onboardingStatus = useOnboardingStore((s) => s.onboardingStatus);
  const openSetupModal = useOnboardingStore((s) => s.openSetupModal);
  const startTour = useOnboardingStore((s) => s.startTour);
  const setOnboardingStatus = useOnboardingStore((s) => s.setOnboardingStatus);

  const dismissed =
    user?.onboardingCompleted ||
    onboardingCompleted ||
    setupCompleted ||
    onboardingStatus === 'completed';

  if (dismissed || user?.role !== 'owner') return null;

  if (onboardingStatus !== 'skipped' && onboardingStatus !== 'started') return null;

  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800 dark:bg-amber-950/40 lg:mx-0">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-amber-900 dark:text-amber-200">
        <span className="font-bold">Selesaikan setup penginapan</span> agar Front Desk siap dipakai.
      </p>
      <button
        type="button"
        onClick={openSetupModal}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
      >
        Lengkapi
      </button>
      <button
        type="button"
        onClick={startTour}
        className="shrink-0 text-xs font-bold text-amber-700 underline"
      >
        Tour
      </button>
      <button
        type="button"
        onClick={() => setOnboardingStatus('completed')}
        className="shrink-0 text-amber-500 hover:text-amber-700"
        aria-label="Tutup banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
