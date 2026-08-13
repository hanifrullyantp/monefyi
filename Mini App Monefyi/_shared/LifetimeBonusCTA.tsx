'use client';

import { Sparkles, ArrowRight, Check } from 'lucide-react';
import type { BonusAppId } from './bonus-config';
import {
  BONUS_APPS,
  BONUS_TOTAL_VALUE,
  formatBonusRupiah,
  getBonusApp,
  LIFETIME_CHECKOUT_URL,
  LIFETIME_PRICE_DISPLAY,
  MONEFYI_BONUS_URL,
} from './bonus-config';

interface LifetimeBonusCTAProps {
  appId: BonusAppId;
  className?: string;
}

/**
 * CTA upgrade Lifetime — mirror footer AppModal landing page.
 */
export function LifetimeBonusCTA({ appId, className = '' }: LifetimeBonusCTAProps) {
  const current = getBonusApp(appId);

  return (
    <section
      className={`rounded-3xl border border-slate-700/80 bg-slate-900/60 overflow-hidden ${className}`}
      aria-labelledby="lifetime-bonus-cta-title"
    >
      <div className="px-5 py-6 md:px-8 md:py-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-400" aria-hidden />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
            Bonus Lifetime · {formatBonusRupiah(BONUS_TOTAL_VALUE)}
          </span>
        </div>

        <h2
          id="lifetime-bonus-cta-title"
          className="text-xl md:text-2xl font-bold text-white mb-2"
        >
          Upgrade ke versi FULL &amp; Terintegrasi
        </h2>
        <p className="text-sm text-slate-400 mb-6 max-w-2xl leading-relaxed">
          <strong className="text-slate-300">{current.name}</strong> yang Anda gunakan
          sekarang adalah versi <strong className="text-amber-400/90">Lite</strong> untuk
          user Monefyi terdaftar. Dapatkan sinkronisasi otomatis dengan data keuangan +
          3 bonus apps lain saat ambil paket Lifetime ({LIFETIME_PRICE_DISPLAY}, sekali bayar).
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {BONUS_APPS.map((app) => (
            <li
              key={app.id}
              className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 border ${
                app.id === appId
                  ? 'border-green-500/40 bg-green-500/10 text-green-100'
                  : 'border-slate-700/60 bg-slate-800/40 text-slate-400'
              }`}
            >
              <Check
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                  app.id === appId ? 'text-green-400' : 'text-slate-500'
                }`}
                aria-hidden
              />
              <span>
                <span className="font-semibold text-slate-200">{app.name}</span>
                {app.id === appId && (
                  <span className="ml-1 text-green-400">· sedang dipakai (Lite)</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={LIFETIME_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all"
          >
            Ambil Lifetime {LIFETIME_PRICE_DISPLAY}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href={MONEFYI_BONUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
          >
            Lihat semua bonus di monefyi.com
          </a>
        </div>

        <p className="mt-4 text-[11px] text-slate-600 leading-relaxed">
          * Versi Lite membutuhkan login akun Monefyi. Versi FULL hanya untuk pemilik
          paket Lifetime — termasuk update selamanya.
        </p>
      </div>
    </section>
  );
}
