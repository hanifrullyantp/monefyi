import { useEffect, type ReactNode } from 'react';
import { Lock, Rocket } from 'lucide-react';
import { analytics } from '../../lib/analytics/events';
import { PRO_PRICE_MONTHLY_IDR } from '../../lib/entitlement';
import { redirectToCheckout } from '../../lib/checkout';
import { useAppStore } from '../../store/appStore';
import { useEntitlement } from '../../hooks/useEntitlement';

type Props = {
  featureName?: string;
  children?: ReactNode;
};

export default function LockedFeaturePreview({ featureName = 'Fitur ini', children }: Props) {
  const { tenant, user } = useAppStore();
  const { estimatorCreditAvailable, estimatorCreditAmount } = useEntitlement();

  useEffect(() => {
    analytics.proFeatureClicked({ featureName });
  }, [featureName]);

  const handleUpgrade = () => {
    if (!tenant?.id || !user?.id) return;
    analytics.upgradeCtaClicked({ triggerType: 'pro_feature', targetTier: 'pro' });
    redirectToCheckout('pro', {
      orgId: tenant.id,
      userId: user.id,
      creditAmount: estimatorCreditAvailable ? estimatorCreditAmount : undefined,
    });
  };

  return (
    <div className="relative min-h-[420px]">
      <div className="pointer-events-none select-none blur-sm opacity-40 max-h-[480px] overflow-hidden" aria-hidden>
        {children || (
          <div className="p-8 grid grid-cols-2 gap-4">
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl col-span-2" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-5 text-center">
          <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h2 className="font-bold text-slate-900">{featureName} — Planner Pro</h2>
          <p className="text-xs text-slate-500 mt-2">
            Keuangan bisnis, neraca otomatis, dan bridge biaya proyek.
          </p>
          <p className="text-sm font-bold text-slate-800 mt-3">
            Rp {PRO_PRICE_MONTHLY_IDR.toLocaleString('id-ID')}/bulan
          </p>
          {estimatorCreditAvailable && (
            <p className="text-xs text-emerald-700 mt-1">
              Credit Estimator Rp {estimatorCreditAmount.toLocaleString('id-ID')} → bulan pertama Rp {(PRO_PRICE_MONTHLY_IDR - estimatorCreditAmount).toLocaleString('id-ID')}
            </p>
          )}
          <button
            type="button"
            onClick={handleUpgrade}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
          >
            <Rocket className="w-4 h-4" /> Upgrade ke Pro
          </button>
        </div>
      </div>
    </div>
  );
}
