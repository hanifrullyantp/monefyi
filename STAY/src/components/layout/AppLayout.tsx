import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import AIAssistant from '../ai/AIAssistant';
import OnboardingTour from '../onboarding/OnboardingTour';
import PropertySetupModal from '../onboarding/PropertySetupModal';
import SetupBanner from '../onboarding/SetupBanner';
import { useOnboardingTrigger } from '../../hooks/useOnboardingTrigger';
import { useOnboardingStore } from '../../store/onboardingStore';

export default function AppLayout() {
  useOnboardingTrigger();

  const tourActive = useOnboardingStore((s) => s.tourActive);
  const setupModalOpen = useOnboardingStore((s) => s.setupModalOpen);
  const closeSetupModal = useOnboardingStore((s) => s.closeSetupModal);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar />
        <SetupBanner />
        <div data-tour="property-setup" className="sr-only" aria-hidden />
        <main className="flex-1 overflow-y-auto pb-[3.5rem] lg:pb-3">
          <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
            <Outlet />
          </div>
        </main>
        <AIAssistant />
      </div>
      <BottomNav />
      {tourActive && <OnboardingTour />}
      <PropertySetupModal open={setupModalOpen} onClose={closeSetupModal} />
    </div>
  );
}
