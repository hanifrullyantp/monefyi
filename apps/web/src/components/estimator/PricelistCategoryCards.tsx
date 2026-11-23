import {
  Package, HardHat, Wrench, Briefcase, Layers, MoreHorizontal,
} from 'lucide-react';
import type { PricelistCategoryGroup } from '../../services/pricelistService';
import type { PricelistCategory } from '../../types/estimator';

const CATEGORY_ICONS: Record<PricelistCategory, typeof Package> = {
  material: Package,
  upah: HardHat,
  alat: Wrench,
  jasa: Briefcase,
  borongan: Layers,
  other: MoreHorizontal,
};

interface Props {
  groups: PricelistCategoryGroup[];
  selectedIds: Set<string>;
  onSelectCategory: (category: PricelistCategory) => void;
}

export default function PricelistCategoryCards({ groups, selectedIds, onSelectCategory }: Props) {
  if (!groups.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Tidak ada item pricelist. Tambahkan dari halaman Pricelist atau buat baru di sini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {groups.map(group => {
        const Icon = CATEGORY_ICONS[group.category] || Package;
        const selectedCount = group.items.filter(i => selectedIds.has(i.id)).length;

        return (
          <button
            key={group.category}
            type="button"
            onClick={() => onSelectCategory(group.category)}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
              <Icon className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="font-bold text-sm text-slate-800 leading-tight">{group.label}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {group.items.length} item
              {selectedCount > 0 && (
                <span className="ml-1 text-emerald-600 font-semibold">· {selectedCount} dipilih</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
