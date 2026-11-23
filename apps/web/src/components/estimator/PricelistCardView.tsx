import type { PricelistItem } from '../../types/estimator';
import PricelistItemFields, { type PricelistRowPatch } from './PricelistItemFields';

interface Props {
  rows: PricelistItem[];
  isRowDirty: (row: PricelistItem) => boolean;
  onPatch: (id: string, patch: PricelistRowPatch) => void;
  onPriceUpdate: (id: string, field: 'base_cost' | 'default_margin_pct' | 'selling_price', value: number) => void;
  onDelete: (id: string, name: string) => void;
}

export default function PricelistCardView({ rows, isRowDirty, onPatch, onPriceUpdate, onDelete }: Props) {
  return (
    <div className="md:hidden space-y-3">
      {rows.map(row => (
        <PricelistItemFields
          key={row.id}
          row={row}
          dirty={isRowDirty(row)}
          layout="card"
          onPatch={onPatch}
          onPriceUpdate={onPriceUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
