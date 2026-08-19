import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import EstimatorPaywall from './EstimatorPaywall';

type Props = {
  children: ReactNode;
};

export default function EstimatorAccessGuard({ children }: Props) {
  const { canAccessEstimator, isLoading } = useEntitlement();

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!canAccessEstimator) {
    return <EstimatorPaywall />;
  }

  return <>{children}</>;
}
