import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calculator } from 'lucide-react';
import { createCostRealization } from '../../services/costService';
import { todayStr } from '../../lib/adapters';
import type { RapItem } from '../../services/rapService';
import { formatRupiah } from '../../utils/projectUi';

type PriceMode = 'unit' | 'total';

interface RapRealizationDialogProps {
  rapItem: RapItem;
  quantity: number;
  projectId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function RapRealizationDialog({
  rapItem,
  quantity: initialQty,
  projectId,
  userId,
  onClose,
  onSaved,
}: RapRealizationDialogProps) {
  const [quantity, setQuantity] = useState(Math.max(0, initialQty));
  const [priceMode, setPriceMode] = useState<PriceMode>('unit');
  const [unitPrice, setUnitPrice] = useState(Number(rapItem.unit_price) || 0);
  const [totalAmount, setTotalAmount] = useState(
    Math.max(0, initialQty) * (Number(rapItem.unit_price) || 0),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (priceMode === 'unit') {
      setTotalAmount(quantity * unitPrice);
    }
  }, [quantity, unitPrice, priceMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleUnitPriceChange = (value: number) => {
    setUnitPrice(value);
    setTotalAmount(quantity * value);
  };

  const handleTotalChange = (value: number) => {
    setTotalAmount(value);
    if (quantity > 0) setUnitPrice(value / quantity);
  };

  const handleSave = async () => {
    if (quantity <= 0) {
      setError('Jumlah harus lebih dari 0');
      return;
    }
    if (totalAmount <= 0) {
      setError('Nominal harus lebih dari 0');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const resolvedUnit = quantity > 0 ? totalAmount / quantity : unitPrice;
      await createCostRealization({
        project_id: projectId,
        rap_item_id: rapItem.id,
        date: todayStr(),
        description: `Realisasi ${rapItem.name}`,
        quantity,
        unit_price: resolvedUnit,
        total_amount: totalAmount,
        recorded_by: userId,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const plannedUnit = Number(rapItem.unit_price) || 0;
  const priceDiff = plannedUnit > 0 ? ((unitPrice - plannedUnit) / plannedUnit) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Catat Realisasi</div>
            <h3 className="font-bold text-slate-900 mt-0.5">{rapItem.name}</h3>
            <p className="text-xs text-slate-500 mt-1">
              Rencana: {rapItem.quantity} {rapItem.unit} × {formatRupiah(plannedUnit)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">Jumlah realisasi ({rapItem.unit})</label>
            <input
              type="number"
              min={0}
              step="any"
              value={quantity || ''}
              onChange={e => {
                const q = Number(e.target.value);
                setQuantity(q);
                if (priceMode === 'unit') setTotalAmount(q * unitPrice);
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm font-semibold"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Mode harga</label>
            <div className="flex gap-2">
              {([
                { id: 'unit' as const, label: 'Harga satuan' },
                { id: 'total' as const, label: 'Harga total' },
              ]).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPriceMode(m.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
                    priceMode === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {priceMode === 'unit' ? (
            <div>
              <label className="text-xs font-semibold text-slate-500">Harga satuan (Rp)</label>
              <input
                type="number"
                min={0}
                value={unitPrice || ''}
                onChange={e => handleUnitPriceChange(Number(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm"
              />
              {plannedUnit > 0 && Math.abs(priceDiff) > 0.5 && (
                <p className={`text-xs mt-1 ${priceDiff > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}% dari harga RAP ({formatRupiah(plannedUnit)})
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-slate-500">Harga total (Rp)</label>
              <input
                type="number"
                min={0}
                value={totalAmount || ''}
                onChange={e => handleTotalChange(Number(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm"
              />
              {quantity > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  ≈ {formatRupiah(totalAmount / quantity)} / {rapItem.unit}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <Calculator className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="text-sm">
              <span className="text-slate-600">Total realisasi: </span>
              <span className="font-black text-indigo-700">{formatRupiah(totalAmount)}</span>
            </div>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan Realisasi'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
