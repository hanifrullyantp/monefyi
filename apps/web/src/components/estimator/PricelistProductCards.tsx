import type { PricelistProductGroup } from '../../services/pricelistService';

interface Props {
  groups: PricelistProductGroup[];
  selectedIds: Set<string>;
  onSelectProduct: (product: string) => void;
}

export default function PricelistProductCards({ groups, selectedIds, onSelectProduct }: Props) {
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
        const selectedCount = group.items.filter(i => selectedIds.has(i.id)).length;

        return (
          <button
            key={group.product || '__other__'}
            type="button"
            onClick={() => onSelectProduct(group.product)}
            className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-2 text-lg leading-none">
              {group.icon}
            </div>
            <div className="font-bold text-sm text-slate-800 leading-tight">{group.label}</div>
            <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{group.description}</div>
            <div className="text-[11px] text-slate-500 mt-1.5">
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
