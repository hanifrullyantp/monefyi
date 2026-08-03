import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import ProblemSection from './components/ProblemSection';
import SolutionSection from './components/SolutionSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import TestimoniSection from './components/TestimoniSection';
import ComparisonSection from './components/ComparisonSection';
import PricingSection from './components/PricingSection';
import FAQSection from './components/FAQSection';
import DemoSection from './components/DemoSection';
import FinalCTASection from './components/FinalCTASection';
import Footer from './components/Footer';
import ToastNotification from './components/ToastNotification';
import AdminPanel from './components/AdminPanel';
import LiveChat from './components/LiveChat';
import ExitIntentPopup from './components/ExitIntentPopup';

const sections = ['hero', 'masalah', 'solusi', 'fitur', 'cara-kerja', 'testimoni', 'perbandingan', 'harga', 'faq', 'demo', 'cta'];

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [showAdminHint, setShowAdminHint] = useState(false);

  // Track active section on scroll
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

  // Keyboard shortcut Ctrl+Shift+A for admin panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setIsAdminPanelOpen(prev => !prev);
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      setIsEditMode(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Show admin hint after 10s
  useEffect(() => {
    const t = setTimeout(() => setShowAdminHint(true), 10000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`min-h-screen bg-white ${isEditMode ? 'edit-mode' : ''}`}>
      <Navbar activeSection={activeSection} isEditMode={isEditMode} />

      <main>
        <HeroSection isEditMode={isEditMode} />
        <ProblemSection isEditMode={isEditMode} />
        <SolutionSection isEditMode={isEditMode} />
        <FeaturesSection isEditMode={isEditMode} />
        <HowItWorksSection isEditMode={isEditMode} />
        <TestimoniSection isEditMode={isEditMode} />
        <ComparisonSection isEditMode={isEditMode} />
        <PricingSection isEditMode={isEditMode} />
        <FAQSection isEditMode={isEditMode} />
        <DemoSection isEditMode={isEditMode} />
        <FinalCTASection isEditMode={isEditMode} />
      </main>

      <Footer />

      {/* Toast notifications */}
      <ToastNotification />

      {/* Admin floating button */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
        {showAdminHint && !isAdminPanelOpen && (
          <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg mb-1 animate-bounce">
            👋 Admin? Tekan <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+A</kbd>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setIsAdminPanelOpen(true)}
            title="Admin Panel (Ctrl+Shift+A)"
            className="w-11 h-11 bg-gray-900 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            title="Toggle Edit Mode (Ctrl+Shift+E)"
            className={`px-3 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 text-xs font-bold ${
              isEditMode
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
            }`}
          >
            {isEditMode ? '✏️ Edit On' : '✏️ Edit'}
          </button>
        </div>
      </div>

      {/* Live Chat */}
      <LiveChat />

      {/* Exit Intent Popup */}
      <ExitIntentPopup />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
      />
    </div>
  );
}
