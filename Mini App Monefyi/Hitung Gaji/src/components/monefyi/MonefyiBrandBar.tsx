'use client';

import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BonusAppId } from '@/lib/bonus-config';
import { useMonefyiAuth } from '@/components/monefyi/MonefyiAuthProvider';
import { MONEFYI_HOME_URL } from '@/lib/monefyi-config';

interface MonefyiBrandBarProps {
  appName: string;
  subtitle?: string;
  bonusAppId?: BonusAppId | null;
  actions?: ReactNode;
}

/**
 * Brand bar standar: [M] App Name · by Monefyi · Lite | user | Keluar
 */
export function MonefyiBrandBar({
  appName,
  subtitle,
  bonusAppId,
  actions,
}: MonefyiBrandBarProps) {
  const { user, signOut, status } = useMonefyiAuth();

  if (status !== 'ready') return null;

  const email = user?.email || 'User';

  return (
    <div className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href={MONEFYI_HOME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-black text-white"
            title="Monefyi"
          >
            M
          </a>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white truncate">{appName}</span>
              <span className="text-[10px] font-semibold text-emerald-400/90">by Monefyi</span>
              {bonusAppId && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  Bonus Lite
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] text-slate-500 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <span className="text-[10px] text-slate-500 max-w-[120px] truncate hidden md:inline">
            {email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            title="Keluar"
          >
            <LogOut className="h-3 w-3" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
