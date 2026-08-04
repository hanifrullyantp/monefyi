import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * Trigger onboarding tour dari query ?onboarding=true atau user baru.
 */
export function useOnboardingTrigger() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const syncFromUser = useOnboardingStore((s) => s.syncFromUser);
  const startTour = useOnboardingStore((s) => s.startTour);
  const openSetupModal = useOnboardingStore((s) => s.openSetupModal);
  const tourActive = useOnboardingStore((s) => s.tourActive);
  const onboardingCompleted = useOnboardingStore((s) => s.onboardingCompleted);

  useEffect(() => {
    if (user) syncFromUser(user);
  }, [user, syncFromUser]);

  const tenant = useAuthStore((s) => s.tenant);
  const markSetupCompleted = useOnboardingStore((s) => s.markSetupCompleted);

  useEffect(() => {
    if (tenant?.setupCompleted) {
      markSetupCompleted();
    }
  }, [tenant?.setupCompleted, markSetupCompleted]);

  useEffect(() => {
    const wantsOnboarding = searchParams.get('onboarding') === 'true';
    if (!wantsOnboarding || !user || tourActive) return;

    if (user.onboardingCompleted || onboardingCompleted) {
      searchParams.delete('onboarding');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      startTour();
      searchParams.delete('onboarding');
      setSearchParams(searchParams, { replace: true });
    }, 600);

    return () => clearTimeout(timer);
  }, [
    searchParams,
    setSearchParams,
    user,
    startTour,
    tourActive,
    onboardingCompleted,
  ]);

  return { openSetupModal, startTour };
}
