import { FileText, Plus } from 'lucide-react';
import type { BudgetExternalData, BudgetTemplate, BudgetUsahaDocument } from '../../../types/budgetUsaha';
import { documentMonthlyTotal } from '../../../lib/financeV2/budget/budgetCalculator';
import { formatRupiah } from '../../../utils/projectUi';
import { BUDGET_CATEGORY_COLORS, newBudgetId } from '../../../types/budgetUsaha';
import BudgetCategoryAccordion from './BudgetCategoryAccordion';

type Props = {
  doc: BudgetUsahaDocument;
  template: BudgetTemplate | null;
  external: BudgetExternalData | null;
  onDocChange: (doc: BudgetUsahaDocument) => void;
  onOpenTemplateModal: () => void;
};

export default function BudgetBuilder({
  doc,
  template,
  external,
  onDocChange,
  onOpenTemplateModal,
}: Props) {
  const monthly = documentMonthlyTotal(doc.categories);
  const yearly = monthly * 12;
  const itemCount = doc.categories.reduce((s, c) => s + c.items.length, 0);

  const updateCategory = (index: number, cat: BudgetUsahaDocument['categories'][0]) => {
    const categories = [...doc.categories];
    categories[index] = cat;
    onDocChange({ ...doc, categories });
  };

  const addCategory = () => {
    const order = doc.categories.length + 1;
    onDocChange({
      ...doc,
      categories: [
        ...doc.categories,
        {
          id: newBudgetId(),
          name: 'KATEGORI BARU',
          icon: 'circle',
          color: BUDGET_CATEGORY_COLORS.OPERASIONAL,
          order,
          items: [],
        },
      ],
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Budget Builder</h2>

      <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900">
            Template: {template?.name ?? 'Custom'}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            {doc.categories.length} kategori · {itemCount} pos anggaran
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenTemplateModal}
          className="text-sm font-bold text-blue-600 hover:underline shrink-0"
        >
          Ganti
        </button>
      </div>

      <div className="space-y-3">
        {doc.categories.map((cat, i) => (
          <BudgetCategoryAccordion
            key={cat.id}
            category={cat}
            external={external}
            defaultExpanded={i === 0}
            onChange={updated => updateCategory(i, updated)}
            onDelete={() =>
              onDocChange({
                ...doc,
                categories: doc.categories.filter((_, j) => j !== i),
              })
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addCategory}
        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Tambah Kategori
      </button>

      <div className="rounded-2xl p-5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-violet-900">Total Budget</div>
          <div className="text-xs text-violet-600/80">
            {doc.categories.length} kategori · {itemCount} pos
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-violet-900">{formatRupiah(monthly)}</div>
          <div className="text-xs text-violet-600/70">{formatRupiah(yearly)} / tahun</div>
        </div>
      </div>
    </section>
  );
}
