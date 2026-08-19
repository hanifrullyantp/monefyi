import { useEffect } from 'react';
import { Lock, Rocket, X } from 'lucide-react';
import { redirectToCheckout } from '../../lib/checkout';
import { analytics } from '../../lib/analytics/events';
import { PRO_PRICE_MONTHLY_IDR } from '../../lib/entitlement';
import { useAppStore } from '../../store/appStore';
import { useEntitlement } from '../../hooks/useEntitlement';
import type { UpgradeModalTrigger } from '../../types/entitlement';

type Props = {
  open: boolean;
  trigger: UpgradeModalTrigger;
  featureName?: string;
  onClose: () => void;
  onManageProjects?: () => void;
  onConvertProject?: () => void;
};

export default function UpgradeModal({
  open,
  trigger,
  featureName,
  onClose,
  onManageProjects,
  onConvertProject,
}: Props) {
  const { tenant, user } = useAppStore();
  const { estimatorCreditAvailable, estimatorCreditAmount } = useEntitlement();

  useEffect(() => {
    if (open) analytics.upgradeModalShown(trigger);
  }, [open, trigger]);

  if (!open) return null;

  const handleClose = () => {
    analytics.upgradeModalDismissed(trigger);
    onClose();
  };

  const upgradePro = () => {
    if (!tenant?.id || !user?.id) return;
    analytics.upgradeCtaClicked({ triggerType: trigger, targetTier: 'pro' });
    redirectToCheckout('pro', {
      orgId: tenant.id,
      userId: user.id,
      creditAmount: estimatorCreditAvailable ? estimatorCreditAmount : undefined,
    });
  };

  const buyEstimator = () => {
    if (!tenant?.id || !user?.id) return;
    analytics.upgradeCtaClicked({ triggerType: trigger, targetTier: 'estimator' });
    redirectToCheckout('estimator', { orgId: tenant.id, userId: user.id });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">
            {trigger === 'project_limit' && 'Kuota proyek tercapai'}
            {trigger === 'pro_feature' && 'Fitur Planner Pro'}
            {trigger === 'estimation_accepted' && 'Penawaran diterima!'}
            {trigger === 'estimator_paywall' && 'Akses Estimator'}
            {trigger === 'manual' && 'Upgrade paket'}
          </h2>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Tutup">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm text-slate-700">
          {trigger === 'project_limit' && (
            <>
              <p>Anda sudah menggunakan slot proyek aktif untuk paket saat ini.</p>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="font-semibold text-slate-800">Opsi 1: Kelola proyek lama</p>
                <button
                  type="button"
                  onClick={() => { onManageProjects?.(); handleClose(); }}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Kelola Proyek Saya →
                </button>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <p className="font-semibold text-emerald-900">Opsi 2: Upgrade ke Planner Pro</p>
                <ul className="text-xs space-y-1 text-emerald-800">
                  <li>✅ 10 proyek aktif</li>
                  <li>✅ Keuangan bisnis penuh</li>
                  <li>✅ Tim sampai 5 member</li>
                </ul>
                <p className="text-xs font-bold text-emerald-900">
                  Rp {PRO_PRICE_MONTHLY_IDR.toLocaleString('id-ID')}/bulan
                  {estimatorCreditAvailable && (
                    <> · Credit Estimator → bulan pertama Rp {(PRO_PRICE_MONTHLY_IDR - estimatorCreditAmount).toLocaleString('id-ID')}</>
                  )}
                </p>
              </div>
            </>
          )}

          {trigger === 'pro_feature' && (
            <>
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                <Lock className="w-4 h-4" />
                {featureName || 'Fitur ini'} tersedia di Planner Pro
              </p>
              <ul className="text-xs space-y-1">
                <li>• Track kas, piutang, hutang</li>
                <li>• Neraca bisnis otomatis</li>
                <li>• Bridge biaya proyek</li>
              </ul>
              <p className="font-bold">Rp {PRO_PRICE_MONTHLY_IDR.toLocaleString('id-ID')}/bulan</p>
            </>
          )}

          {trigger === 'estimation_accepted' && (
            <>
              <p>🎉 Klien menerima penawaran Anda.</p>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-semibold text-emerald-900">Jadikan Proyek</p>
                <p className="text-xs text-emerald-800 mt-1">
                  RAP otomatis dari estimasi — 1 proyek gratis termasuk paket Estimator.
                </p>
                {onConvertProject && (
                  <button
                    type="button"
                    onClick={() => { onConvertProject(); handleClose(); }}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:underline"
                  >
                    <Rocket className="w-4 h-4" /> Jadikan Proyek Sekarang
                  </button>
                )}
              </div>
            </>
          )}

          {(trigger === 'estimator_paywall' || trigger === 'manual') && (
            <p>Upgrade paket untuk membuka fitur Estimator dan alur penawaran profesional.</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex gap-2 justify-end">
          <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl text-sm text-slate-600">
            Nanti saja
          </button>
          {trigger === 'estimator_paywall' ? (
            <button type="button" onClick={buyEstimator} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white">
              Beli Estimator
            </button>
          ) : trigger !== 'estimation_accepted' && (
            <button type="button" onClick={upgradePro} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white">
              <Rocket className="w-4 h-4" /> Upgrade ke Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
