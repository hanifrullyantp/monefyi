'use client';

import Link from 'next/link';
import { Container } from './Container';
import { Moon, Heart } from 'lucide-react';

const zakatLinks = [
  { href: '/penghasilan', label: 'Zakat Penghasilan' },
  { href: '/maal', label: 'Zakat Maal' },
  { href: '/emas', label: 'Zakat Emas' },
  { href: '/perdagangan', label: 'Zakat Perdagangan' },
  { href: '/pertanian', label: 'Zakat Pertanian' },
  { href: '/fitrah', label: 'Zakat Fitrah' },
  { href: '/investasi', label: 'Zakat Investasi' },
];

const resourceLinks = [
  { href: '/panduan', label: 'Panduan Zakat' },
  { href: 'https://baznas.go.id', label: 'BAZNAS', external: true },
  { href: 'https://mui.or.id', label: 'MUI', external: true },
];

export function Footer() {
  return (
    <footer className="bg-green-950/50 border-t border-green-500/10 mt-auto">
      <Container className="py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Moon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-white text-lg">Zakat</span>
                <span className="text-green-400 text-xs block -mt-1">
                  by Monefyi
                </span>
              </div>
            </Link>
            <p className="text-sm text-green-100/60">
              Kalkulator zakat lengkap untuk muslim Indonesia. Gratis,
              akurat, sesuai fatwa MUI.
            </p>
          </div>

          {/* Kalkulator */}
          <div>
            <h3 className="font-semibold text-white mb-4">Kalkulator</h3>
            <ul className="space-y-2">
              {zakatLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-green-100/60 hover:text-green-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">Sumber</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-100/60 hover:text-green-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-green-100/60 hover:text-green-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Monefyi */}
          <div>
            <h3 className="font-semibold text-white mb-4">Monefyi</h3>
            <p className="text-sm text-green-100/60 mb-4">
              Kelola keuanganmu lebih baik dengan aplikasi Monefyi.
            </p>
            <a
              href="https://monefyi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-400 hover:to-emerald-500 transition-all"
            >
              Kunjungi Monefyi
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-green-500/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-green-100/50 flex items-center gap-1">
              Dibuat dengan{' '}
              <Heart className="w-4 h-4 text-red-400 fill-red-400" /> oleh{' '}
              <a
                href="https://monefyi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300"
              >
                Monefyi
              </a>
            </p>
            <p className="text-sm text-green-100/50">
              &copy; {new Date().getFullYear()} Monefyi. Semua hak dilindungi.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
