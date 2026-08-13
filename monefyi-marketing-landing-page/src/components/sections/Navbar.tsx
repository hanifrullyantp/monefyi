import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { siteConfig } from '../../data/site-config';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Logo } from '../ui/Logo';
import { EditableText } from '../admin/EditableText';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { checkoutUrls } from '../../data/checkout-urls';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcementVisible] = useLocalStorage('monefyi_announcement_visible', true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    window.location.href = checkoutUrls.app;
  };

  const { settings } = useSiteSettings();
  const navTop = (announcementVisible && settings.announcement.active) ? 'top-10' : 'top-0';

  return (
    <nav
      className={cn(
        'fixed left-0 right-0 z-50 transition-all duration-300',
        navTop,
        scrolled
          ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-3'
          : (announcementVisible && settings.announcement.active) ? 'py-6' : 'py-8'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo area - Fixed duplication */}
        <a href="#">
          {settings.branding.logoUrl ? (
            <img src={settings.branding.logoUrl} alt={settings.general.siteName} className="h-9 w-auto object-contain" />
          ) : (
            <Logo size={36} />
          )}
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {siteConfig.nav.map((item, i) => (
            <a
              key={i}
              href={item.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <EditableText id={`nav_item_${i}`} defaultValue={item.label} />
            </a>
          ))}
        </div>

        {/* Desktop CTA - Removed extra icon button from right */}
        <div className="hidden md:flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-300 hover:text-white gap-2"
            onClick={handleLoginClick}
          >
            <LogIn size={18} />
            Masuk ke App
          </Button>
        </div>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-slate-300 hover:text-white px-2 py-1 gap-1.5"
            onClick={handleLoginClick}
          >
            <LogIn size={18} />
            <span className="text-xs font-bold uppercase tracking-tight">App</span>
          </Button>
          
          <button
            className="text-white p-1"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-slate-950 transition-all duration-500 md:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-12">
            <span className="text-xl font-black text-white">Monefyi</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-white">
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {siteConfig.nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-bold text-slate-300 hover:text-green-500"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-auto pt-12 space-y-4">
            <Button fullWidth size="lg">Coba Gratis Sekarang</Button>
            <Button fullWidth variant="outline" size="lg">Lihat Demo</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
