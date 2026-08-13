'use client';

import type { ReactNode } from 'react';
import { MonefyiProviders } from '@/components/monefyi/MonefyiProviders';
import { MINI_APP_META } from '@/lib/mini-app-meta';

/** Client wrapper — pasang di root layout setiap mini app. */
export function MonefyiAppLayout({ children }: { children: ReactNode }) {
  const { name, subtitle, bonusAppId } = MINI_APP_META;
  return (
    <MonefyiProviders appName={name} subtitle={subtitle} bonusAppId={bonusAppId}>
      {children}
    </MonefyiProviders>
  );
}
