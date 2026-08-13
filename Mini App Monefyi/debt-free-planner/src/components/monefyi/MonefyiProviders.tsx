'use client';

import type { ReactNode } from 'react';
import type { BonusAppId } from '@/lib/bonus-config';
import { MonefyiAuthProvider } from '@/components/monefyi/MonefyiAuthProvider';
import { MonefyiLoginGate } from '@/components/monefyi/MonefyiLoginGate';
import { MonefyiBrandBar } from '@/components/monefyi/MonefyiBrandBar';

interface MonefyiProvidersProps {
  appName: string;
  subtitle?: string;
  bonusAppId?: BonusAppId | null;
  brandActions?: ReactNode;
  children: ReactNode;
}

/** Auth gate + brand bar standar untuk semua mini app Monefyi. */
export function MonefyiProviders({
  appName,
  subtitle,
  bonusAppId = null,
  brandActions,
  children,
}: MonefyiProvidersProps) {
  return (
    <MonefyiAuthProvider>
      <MonefyiLoginGate appName={appName}>
        <MonefyiBrandBar
          appName={appName}
          subtitle={subtitle}
          bonusAppId={bonusAppId}
          actions={brandActions}
        />
        {children}
      </MonefyiLoginGate>
    </MonefyiAuthProvider>
  );
}
