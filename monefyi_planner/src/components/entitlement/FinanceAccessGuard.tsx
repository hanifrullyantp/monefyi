import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import LockedFeaturePreview from './LockedFeaturePreview';

type Props = {
  featureName?: string;
  children: ReactNode;
};

export default function FinanceAccessGuard({ featureName = 'Keuangan Bisnis', children }: Props) {
  const { canAccessFinance, isLoading } = useEntitlement();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!canAccessFinance) {
    return <LockedFeaturePreview featureName={featureName}>{children}</LockedFeaturePreview>;
  }

  return <>{children}</>;
}
