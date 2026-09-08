import { Calculator, Plus } from 'lucide-react';

type Props = {
  totalCount: number;
  activeOffers: number;
  onCreate: () => void;
};

export default function EstimatorListHeader({ totalCount, activeOffers, onCreate }: Props) {
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="text-emerald-600 shrink-0" size={22} aria-hidden />
            Estimator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {totalCount} estimasi · {activeOffers} penawaran aktif
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/30 h-12 w-12 shrink-0 transition-all duration-200 hover:bg-emerald-700 active:scale-95"
          aria-label="Estimasi baru"
        >
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}
