import React, { Fragment } from 'react';
import { AdminBar } from './components/admin/AdminBar';
import { AdminDraftPanel } from './components/admin/AdminDraftPanel';
import { ScrollProgress } from './components/floating/ScrollProgress';
import { AnnouncementBar } from './components/sections/AnnouncementBar';
import { Navbar } from './components/sections/Navbar';
import { Hero } from './components/sections/Hero';
import { PainPoints } from './components/sections/PainPoints';
import { FinanceCalculator } from './components/sections/FinanceCalculator';
import { HowItWorks } from './components/sections/HowItWorks';
import { FeaturesShowcase } from './components/sections/FeaturesShowcase';
import { BeforeAfter } from './components/sections/BeforeAfter';
import { Testimonials } from './components/sections/Testimonials';
import { ComparisonTable } from './components/sections/ComparisonTable';
import { BonusApps } from './components/sections/BonusApps';
import { UrgencyBanner } from './components/sections/UrgencyBanner';
import { Pricing } from './components/sections/Pricing';
import { Guarantee } from './components/sections/Guarantee';
import { FAQ } from './components/sections/FAQ';
import { FinalCTA } from './components/sections/FinalCTA';
import { Footer } from './components/sections/Footer';
import { WhatsAppButton } from './components/floating/WhatsAppButton';
import { TrustTicker } from './components/floating/TrustTicker';
import { ExitIntentModal } from './components/floating/ExitIntentModal';
import { useAdminMode } from './hooks/useAdminMode';
import { useSiteSettings } from './hooks/useSiteSettings';

export default function App() {
  const isAdmin = useAdminMode();
  const { getOrderedSections } = useSiteSettings();

  const renderSection = (id: string) => {
    switch (id) {
      case 'hero': return <Hero />;
      case 'pain-points': return <PainPoints />;
      case 'calculator': return <FinanceCalculator />;
      case 'how-it-works': return <HowItWorks />;
      case 'features': return <FeaturesShowcase />;
      case 'transformation': return <BeforeAfter />;
      case 'testimonials': return <Testimonials />;
      case 'comparison': return <ComparisonTable />;
      case 'bonus': return <BonusApps />;
      case 'urgency': return <UrgencyBanner />;
      case 'pricing': return <Pricing />;
      case 'guarantee': return <Guarantee />;
      case 'faq': return <FAQ />;
      case 'final-cta': return <FinalCTA />;
      default: return null;
    }
  };

  if (!getOrderedSections()?.length) {
     return <div className="bg-slate-950 min-h-screen flex items-center justify-center text-white">Memuat…</div>;
  }

  return (
    <div className="bg-slate-950 min-h-screen selection:bg-green-500/30 selection:text-green-200" data-admin-active={isAdmin}>
      <AdminBar />
      <ScrollProgress />
      <AnnouncementBar />
      <Navbar />

      <main>
        {getOrderedSections().map(section => (
          (section && section.active) ? <Fragment key={section.id}>{renderSection(section.id)}</Fragment> : null
        ))}
      </main>

      <Footer />

      {/* Floating Elements */}
      <WhatsAppButton />
      <TrustTicker />
      <AdminDraftPanel />
      <ExitIntentModal />
    </div>
  );
}
