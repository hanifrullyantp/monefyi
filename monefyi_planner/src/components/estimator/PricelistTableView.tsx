import type { PricelistItem } from '../../types/estimator';
import PricelistItemFields, { type PricelistRowPatch } from './PricelistItemFields';

interface Props {
  rows: PricelistItem[];
  isRowDirty: (row: PricelistItem) => boolean;
  onPatch: (id: string, patch: PricelistRowPatch) => void;
  onPriceUpdate: (id: string, field: 'base_cost' | 'default_margin_pct' | 'selling_price', value: number) => void;
  onDelete: (id: string, name: string) => void;
}

export default function PricelistTableView({ rows, isRowDirty, onPatch, onPriceUpdate, onDelete }: Props) {
  return (
    <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <th className="p-3 min-w-[140px]">Item</th>
            <th className="p-3 min-w-[120px]">Produk</th>
            <th className="p-3 w-28">Kategori</th>
            <th className="p-3 w-16 hidden lg:table-cell">Satuan</th>
            <th className="p-3 w-32">Harga Jual</th>
            <th className="p-3 w-20">Margin%</th>
            <th className="p-3 w-28 hidden lg:table-cell">Est. HPP</th>
            <th className="p-3 w-16">Aktif</th>
            <th className="p-3 w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <PricelistItemFields
              key={row.id}
              row={row}
              dirty={isRowDirty(row)}
              layout="table"
              onPatch={onPatch}
              onPriceUpdate={onPriceUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
