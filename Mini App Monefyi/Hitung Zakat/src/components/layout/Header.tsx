'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from './Container';
import { Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/panduan', label: 'Panduan' },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-green-950/80 backdrop-blur-xl border-b border-green-500/10">
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg">Zakat</span>
              <span className="text-green-400 text-xs block -mt-1">
                by Monefyi
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-green-400'
                    : 'text-green-100/70 hover:text-white'
                )}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://monefyi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all shadow-lg shadow-green-500/30"
            >
              Coba Monefyi
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-green-100 hover:text-white"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-green-500/10">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-green-100/70 hover:text-white hover:bg-green-500/5'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="https://monefyi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mx-4 mt-2 px-4 py-3 text-sm font-medium text-white text-center bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl"
              >
                Coba Monefyi
              </a>
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
}
