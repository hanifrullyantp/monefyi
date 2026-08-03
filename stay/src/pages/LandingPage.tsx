import { useState, useEffect, useCallback } from 'react';
import Navbar from '../landing/components/Navbar';
import HeroSection from '../landing/components/HeroSection';
import ProblemSection from '../landing/components/ProblemSection';
import SolutionSection from '../landing/components/SolutionSection';
import FeaturesSection from '../landing/components/FeaturesSection';
import HowItWorksSection from '../landing/components/HowItWorksSection';
import TestimoniSection from '../landing/components/TestimoniSection';
import ComparisonSection from '../landing/components/ComparisonSection';
import PricingSection from '../landing/components/PricingSection';
import FAQSection from '../landing/components/FAQSection';
import DemoSection from '../landing/components/DemoSection';
import FinalCTASection from '../landing/components/FinalCTASection';
import Footer from '../landing/components/Footer';
import ToastNotification from '../landing/components/ToastNotification';
import LiveChat from '../landing/components/LiveChat';
import ExitIntentPopup from '../landing/components/ExitIntentPopup';
import '../landing/landing.css';

const sections = ['hero', 'masalah', 'solusi', 'fitur', 'cara-kerja', 'testimoni', 'perbandingan', 'harga', 'faq', 'demo', 'cta'];

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    document.title = 'STAY — Kelola Penginapan Tanpa Ribet | monefyi.com/stay';
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 100) {
            setActiveSection(id);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToDemo = useCallback(() => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="landing-page min-h-screen bg-white">
      <Navbar activeSection={activeSection} />

      <main>
        <HeroSection onShowDemo={scrollToDemo} />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimoniSection />
        <ComparisonSection />
        <PricingSection />
        <FAQSection />
        <DemoSection />
        <FinalCTASection />
      </main>

      <Footer />
      <ToastNotification />
      <LiveChat />
      <ExitIntentPopup />
    </div>
  );
}
