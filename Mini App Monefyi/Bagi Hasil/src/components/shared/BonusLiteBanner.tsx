'use client';

import { Sparkles, Gift } from 'lucide-react';
import type { BonusAppId } from '@/lib/bonus-config';
import {
  BONUS_APP_VALUE,
  BONUS_TOTAL_VALUE,
  getBonusApp,
  formatBonusRupiah,
  LIFETIME_PRICE_DISPLAY,
} from '@/lib/bonus-config';

interface BonusLiteBannerProps {
  appId: BonusAppId;
  className?: string;
}

/**
 * Banner versi Lite — mirror teks landing page Extra Bonuses.
 */
export function BonusLiteBanner({ appId, className = '' }: BonusLiteBannerProps) {
  const app = getBonusApp(appId);

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-green-500/10 px-4 py-3 md:px-5 md:py-4 ${className}`}
      role="status"
      aria-label="Versi Lite bonus Monefyi"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40">
            <Gift className="h-4 w-4 text-amber-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                <Sparkles className="h-3 w-3" aria-hidden />
                Extra Bonus · Lite
              </span>
              <span className="text-[10px] font-semibold text-amber-400/90">
                Senilai {formatBonusRupiah(BONUS_APP_VALUE)}
              </span>
            </div>
            <p className="text-sm font-semibold text-white leading-snug">{app.name}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Versi ringan (lite) gratis. Versi{' '}
              <strong className="text-slate-300">FULL &amp; terintegrasi</strong> termasuk
              paket Lifetime Monefyi ({LIFETIME_PRICE_DISPLAY}).
            </p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 md:text-right shrink-0 md:max-w-[200px] leading-relaxed">
          4 bonus senilai {formatBonusRupiah(BONUS_TOTAL_VALUE)} untuk pembeli Lifetime
        </p>
      </div>
    </div>
  );
}
