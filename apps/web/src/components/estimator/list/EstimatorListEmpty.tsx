import { Calculator, FileText, Plus } from 'lucide-react';

type Props = {
  onCreate: () => void;
};

export default function EstimatorListEmpty({ onCreate }: Props) {
  return (
    <div className="mx-4 text-center py-16 px-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-dashed border-slate-200">
      <div className="relative inline-flex mb-4">
        <FileText className="w-14 h-14 text-slate-300" aria-hidden />
        <Calculator className="w-5 h-5 text-emerald-500 absolute -top-1 -right-1" aria-hidden />
      </div>
      <h2 className="text-lg font-bold text-slate-800">Buat estimasi pertama Anda</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Dari pricelist ke PDF profesional dalam 5 menit.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all duration-200 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Buat Estimasi Baru
      </button>
    </div>
  );
}
