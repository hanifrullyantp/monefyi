import { BarChart3, Rocket, X } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import { PRO_PRICE_MONTHLY_IDR } from '../../lib/entitlement';
import { analytics } from '../../lib/analytics/events';
import { markMilestone5Shown } from '../../lib/analytics/milestones';
import { useAppStore } from '../../store/appStore';
import { useEntitlement } from '../../hooks/useEntitlement';

type Props = {
  open: boolean;
  totalAmount: number;
  onClose: () => void;
};

export default function MilestoneUpsellModal({ open, totalAmount, onClose }: Props) {
  const { tenant, user } = useAppStore();
  const { estimatorCreditAvailable, estimatorCreditAmount } = useEntitlement();

  if (!open) return null;

  const handleDismiss = () => {
    analytics.upgradeModalDismissed('milestone_5_estimations');
    markMilestone5Shown();
    onClose();
  };

  const handleUpgrade = () => {
    if (!tenant?.id || !user?.id) return;
    analytics.upgradeCtaClicked({
      triggerType: 'milestone_5_estimations',
      targetTier: 'pro',
    });
    markMilestone5Shown();
    redirectToCheckout('pro', {
      orgId: tenant.id,
      userId: user.id,
      creditAmount: estimatorCreditAvailable ? estimatorCreditAmount : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Anda aktif! 5 penawaran bulan ini
          </h2>
          <button type="button" onClick={handleDismiss} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-3 text-sm text-slate-700">
          <p>
            Total nilai penawaran 30 hari terakhir:{' '}
            <span className="font-bold tabular-nums">Rp {totalAmount.toLocaleString('id-ID')}</span>
          </p>
          <p className="text-slate-600">
            Berapa yang benar-benar profit setelah proyek dikerjakan? Track biaya aktual vs penawaran dengan Planner Pro.
          </p>
          <p className="font-bold text-slate-900">
            Rp {PRO_PRICE_MONTHLY_IDR.toLocaleString('id-ID')}/bulan
          </p>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <button type="button" onClick={handleDismiss} className="px-4 py-2 rounded-xl text-sm text-slate-600">
            Nanti saja
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white"
          >
            <Rocket className="w-4 h-4" /> Upgrade ke Pro
          </button>
        </div>
      </div>
    </div>
  );
}
