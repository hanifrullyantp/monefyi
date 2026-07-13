import { useEffect, useState } from 'react';
import { X, CalendarDays } from 'lucide-react';
import type { MappedRapItem } from '../../../lib/migration/planner-mapper';
import type { RapFieldPatch } from '../../../lib/rapItemGrouping';
import { formatRupiah, parseMoneyInput } from '../../../utils/projectUi';

type Props = {
  open: boolean;
  item: MappedRapItem | null;
  onClose: () => void;
  onSave: (patch: RapFieldPatch) => void;
  canManage: boolean;
  isLabor?: boolean;
  onOpenLaborSchedule?: () => void;
};

export default function RapItemDetailModal({
  open, item, onClose, onSave, canManage, isLabor, onOpenLaborSchedule,
}: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [qtyPlan, setQtyPlan] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [qtyActual, setQtyActual] = useState('');

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setUnit(item.unit);
    setQtyPlan(String(item.qtyPlan));
    setUnitPrice(String(item.unitPrice));
    setQtyActual(String(item.qtyActual));
  }, [item]);

  if (!open || !item) return null;

  const planTotal = (parseMoneyInput(qtyPlan) || 0) * (parseMoneyInput(unitPrice) || 0);
  const actualTotal = (parseMoneyInput(qtyActual) || 0) * (parseMoneyInput(unitPrice) || 0);
  const selisih = planTotal - actualTotal;

  const handleApply = () => {
    onSave({
      name: name.trim() || item.name,
      qtyPlan: parseMoneyInput(qtyPlan) || item.qtyPlan,
      unitPrice: parseMoneyInput(unitPrice) || item.unitPrice,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-black text-slate-900 truncate pr-2">Detail Item</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniCard label="Total RAP" value={formatRupiah(planTotal)} />
            <MiniCard label="Realisasi" value={formatRupiah(actualTotal)} color="rose" />
            <MiniCard
              label="Selisih"
              value={formatRupiah(selisih)}
              color={selisih >= 0 ? 'emerald' : 'rose'}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase">
                  <th className="text-left px-3 py-2 font-bold"> </th>
                  <th className="text-right px-3 py-2 font-bold">Volume</th>
                  <th className="text-right px-3 py-2 font-bold">Harga Satuan</th>
                  <th className="text-right px-3 py-2 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-2 font-bold text-blue-700">Planning (RAP)</td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <input value={qtyPlan} onChange={e => setQtyPlan(e.target.value)}
                        className="w-20 text-right border rounded-lg px-2 py-1" />
                    ) : qtyPlan}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage ? (
                      <input value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                        className="w-24 text-right border rounded-lg px-2 py-1" />
                    ) : formatRupiah(parseMoneyInput(unitPrice) || 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{formatRupiah(planTotal)}</td>
                </tr>
                <tr className="border-t border-slate-100 bg-rose-50/30">
                  <td className="px-3 py-2 font-bold text-rose-700">Realisasi</td>
                  <td className="px-3 py-2 text-right">{qtyActual} {unit}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(parseMoneyInput(unitPrice) || 0)}</td>
                  <td className="px-3 py-2 text-right font-bold text-rose-700">{formatRupiah(actualTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {isLabor && onOpenLaborSchedule && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenLaborSchedule(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100"
            >
              <CalendarDays className="w-4 h-4" /> Kelola jadwal tenaga
            </button>
          )}

          {canManage && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">Nama item</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm" />
              <label className="block text-xs font-bold text-slate-600">Satuan</label>
              <input value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm" disabled />
              <p className="text-[10px] text-slate-400">
                Realisasi volume diubah lewat checkbox / tab Excel. Simpan header untuk apply perubahan planning.
              </p>
            </div>
          )}
        </div>

        {canManage && (
          <div className="p-4 border-t flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border rounded-xl text-sm font-bold text-slate-600">
              Batal
            </button>
            <button type="button" onClick={handleApply}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold">
              Terapkan ke Draft
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCard({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'rose' }) {
  const cls = color === 'rose' ? 'text-rose-600' : color === 'emerald' ? 'text-emerald-600' : 'text-slate-800';
  return (
    <div className="rounded-xl border border-slate-100 p-3 text-center">
      <div className={`text-sm font-black ${cls}`}>{value}</div>
      <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">{label}</div>
    </div>
  );
}
