import { Plus, Trash2 } from 'lucide-react';
import RupiahInput from './RupiahInput';
import type { EstimationAdjustment } from '../../types/estimator';

interface Props {
  adjustments: EstimationAdjustment[];
  onChange: (adjustments: EstimationAdjustment[]) => void;
}

function newAdjustment(): EstimationAdjustment {
  return {
    id: crypto.randomUUID(),
    label: '',
    amount: 0,
  };
}

/** Baris pengurangan harga dengan keterangan (nego, voucher, dll). */
export default function EstimationAdjustmentsPanel({ adjustments, onChange }: Props) {
  const update = (id: string, patch: Partial<EstimationAdjustment>) => {
    onChange(adjustments.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };

  const remove = (id: string) => onChange(adjustments.filter(a => a.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-700">Pengurangan dengan keterangan</p>
          <p className="text-[10px] text-slate-500">Potongan nego, voucher, atau penyesuaian lain</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...adjustments, newAdjustment()])}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {adjustments.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">Belum ada pengurangan khusus.</p>
      ) : (
        <div className="space-y-2">
          {adjustments.map(adj => (
            <div key={adj.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input
                type="text"
                value={adj.label}
                onChange={e => update(adj.id, { label: e.target.value })}
                placeholder="Keterangan (mis. Potongan nego)"
                className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-500"
              />
              <div className="flex items-center gap-2 shrink-0">
                <RupiahInput
                  value={adj.amount}
                  onChange={v => update(adj.id, { amount: v })}
                  className="w-full sm:w-36 px-3 py-2 border border-slate-200 rounded-xl text-sm text-right"
                />
                <button
                  type="button"
                  onClick={() => remove(adj.id)}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  aria-label="Hapus pengurangan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
