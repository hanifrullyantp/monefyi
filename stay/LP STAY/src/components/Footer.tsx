import React from 'react';
import { Zap } from 'lucide-react';

const footerLinks = {
  produk: [
    { label: 'Fitur', href: '#fitur' },
    { label: 'Harga', href: '#harga' },
    { label: 'Demo', href: '#demo' },
    { label: 'Integrasi', href: '#' },
    { label: 'API Documentation', href: '#' },
  ],
  perusahaan: [
    { label: 'Tentang Kami', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Karir', href: '#' },
    { label: 'Kontak', href: '#' },
    { label: 'Kemitraan', href: '#' },
  ],
  bantuan: [
    { label: 'Pusat Bantuan', href: '#' },
    { label: 'Video Tutorial', href: '#' },
    { label: 'Status Sistem', href: '#' },
    { label: 'Syarat & Ketentuan', href: '#' },
    { label: 'Kebijakan Privasi', href: '#' },
  ],
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Column 1 — Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-white leading-none">stay.</div>
                <div className="text-[9px] text-gray-500 leading-none tracking-wide">monefyi.com</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-2">
              <strong className="text-gray-300">STAY</strong> — Smart Tenant Accommodation Yield
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Platform SaaS manajemen penginapan modern untuk homestay, guest house, villa, hotel budget, dan kost harian di seluruh Indonesia.
            </p>
            <div className="text-xs text-gray-500 mb-5">
              📍 Jl. Teknologi No. 42, Jakarta Selatan, Indonesia 12550
            </div>
            {/* Social media */}
            <div className="flex gap-3">
              {['Instagram', 'Facebook', 'YouTube', 'TikTok'].map((label, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 bg-gray-800 hover:bg-emerald-500 rounded-lg flex items-center justify-center transition-all duration-200 text-gray-400 hover:text-white text-xs font-bold"
                  title={label}
                >
                  {label === 'Instagram' ? 'IG' : label === 'Facebook' ? 'FB' : label === 'YouTube' ? 'YT' : 'TK'}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 — Produk */}
          <div>
            <h4 className="text-white font-bold mb-5 text-sm tracking-wide uppercase">Produk</h4>
            <ul className="space-y-3">
              {footerLinks.produk.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm hover:text-emerald-400 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Perusahaan */}
          <div>
            <h4 className="text-white font-bold mb-5 text-sm tracking-wide uppercase">Perusahaan</h4>
            <ul className="space-y-3">
              {footerLinks.perusahaan.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm hover:text-emerald-400 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Bantuan */}
          <div>
            <h4 className="text-white font-bold mb-5 text-sm tracking-wide uppercase">Bantuan</h4>
            <ul className="space-y-3">
              {footerLinks.bantuan.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm hover:text-emerald-400 transition-colors duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-600">
              © 2026 STAY by monefyi.com. All rights reserved.
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: '🏛️ Terdaftar di Kominfo' },
                { label: '🔒 Powered by Xendit' },
                { label: '☁️ Hosted di AWS Indonesia' },
                { label: '🇮🇩 Made in Indonesia' },
              ].map((b, i) => (
                <span key={i} className="text-xs bg-gray-800 px-3 py-1.5 rounded-full text-gray-500">
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
