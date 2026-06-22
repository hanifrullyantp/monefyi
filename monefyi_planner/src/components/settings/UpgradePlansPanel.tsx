import { Check, Sparkles } from 'lucide-react';
import { formatPlanPriceIdr, normalizePlanSlug, planForOrg, type PricingPlan } from '../../lib/pricingPlans';

type Props = {
  orgPlanType?: string;
  pricingPlans: PricingPlan[];
  projectsThisMonth: number | null;
  onSelectPlan?: (slug: string) => void;
};

function isCurrentPlan(plan: PricingPlan, orgPlanType?: string): boolean {
  const slug = normalizePlanSlug(orgPlanType);
  if (plan.slug === slug) return true;
  if (plan.slug === 'pro' && slug === 'pro' && orgPlanType !== 'pro_plus') return true;
  return false;
}

export default function UpgradePlansPanel({
  orgPlanType,
  pricingPlans,
  projectsThisMonth,
  onSelectPlan,
}: Props) {
  const current = planForOrg(orgPlanType, pricingPlans);

  const handleUpgrade = (plan: PricingPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan.slug);
      return;
    }
    const subject = encodeURIComponent(`Upgrade Monefyi Planner — ${plan.label}`);
    const body = encodeURIComponent(
      `Halo tim Monefyi,\n\nSaya ingin upgrade ke paket ${plan.label} (${formatPlanPriceIdr(plan.price_monthly_idr)}/bulan).\n\nTerima kasih.`,
    );
    window.location.href = `mailto:support@monefyi.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg">Pricelist — Upgrade Paket</h3>
            <p className="text-sm text-emerald-100 mt-1">
              Paket aktif: <span className="font-bold text-white">{current.label}</span>
              {' · '}
              {formatPlanPriceIdr(current.price_monthly_idr)}/bulan
            </p>
            {current.projects_per_month != null && projectsThisMonth != null && (
              <p className="text-xs text-emerald-200 mt-2">
                Kuota proyek bulan ini: {projectsThisMonth} / {current.projects_per_month} digunakan
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {pricingPlans.map(plan => {
          const active = isCurrentPlan(plan, orgPlanType);

          return (
            <div
              key={plan.slug}
              className={`relative rounded-2xl border p-5 flex flex-col ${
                active
                  ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-200'
                  : 'border-slate-200 bg-white hover:border-emerald-200 transition-colors'
              }`}
            >
              {active && (
                <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                  Paket Anda
                </span>
              )}
              {plan.slug === 'pro' && !active && (
                <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                  Populer
                </span>
              )}

              <div className="font-black text-xl text-slate-900 mt-1">{plan.label}</div>
              <div className="mt-2">
                <span className="text-3xl font-black text-emerald-700">
                  {formatPlanPriceIdr(plan.price_monthly_idr)}
                </span>
                {plan.price_monthly_idr > 0 && (
                  <span className="text-sm text-slate-500">/bulan</span>
                )}
              </div>
              {plan.description && (
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              )}

              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {active ? (
                  <div className="w-full py-2.5 text-center text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-xl">
                    Paket aktif
                  </div>
                ) : plan.price_monthly_idr === 0 ? (
                  <div className="w-full py-2.5 text-center text-sm text-slate-600">
                    Paket dasar
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Upgrade ke {plan.label}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 text-center">
        Setelah pembayaran dikonfirmasi, paket organisasi Anda akan diaktifkan oleh tim Monefyi.
        Paket berbayar mengaktifkan organisasi Pro (proyek tanpa batas).
      </p>
    </div>
  );
}
