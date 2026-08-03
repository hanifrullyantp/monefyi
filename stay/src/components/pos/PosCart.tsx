import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/format';
import type { CartItem } from '../../types/pos';
import type { PosTotals } from '../../store/posStore';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface PosCartProps {
  items: CartItem[];
  totals: PosTotals;
  taxPercent: number;
  servicePercent: number;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onDiscountChange?: (amount: number, percent: number) => void;
  discountAmount: number;
  discountPercent: number;
}

export default function PosCart({
  items,
  totals,
  onUpdateQty,
  onRemove,
  onDiscountChange,
  discountAmount,
  discountPercent,
}: PosCartProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50">
        <h3 className="font-bold text-slate-800">Keranjang</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">Belum ada item</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 truncate">{item.description}</p>
                <p className="text-xs text-slate-500">{formatCurrency(item.unitPrice)} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="p-1 rounded-lg bg-white border">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button type="button" onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="p-1 rounded-lg bg-white border">
                  <Plus className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => onRemove(item.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="font-bold text-sm w-24 text-right">{formatCurrency(item.quantity * item.unitPrice)}</p>
            </div>
          ))
        )}
      </div>
      <div className="border-t p-4 space-y-2 bg-slate-50">
        {onDiscountChange && (
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              placeholder="Diskon %"
              value={discountPercent || ''}
              onChange={(e) => onDiscountChange(0, Number(e.target.value))}
              className="flex-1 px-2 py-1 text-sm rounded-lg border"
            />
            <input
              type="number"
              placeholder="Diskon Rp"
              value={discountAmount || ''}
              onChange={(e) => onDiscountChange(Number(e.target.value), 0)}
              className="flex-1 px-2 py-1 text-sm rounded-lg border"
            />
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span>
        </div>
        {totals.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Diskon</span><span>-{formatCurrency(totals.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-slate-600">
          <span>Pajak</span><span>{formatCurrency(totals.taxAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Service</span><span>{formatCurrency(totals.serviceChargeAmount)}</span>
        </div>
        <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t">
          <span>TOTAL</span><span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}

export type PaymentChannelKey = 'cash' | 'qris' | 'transfer' | 'virtual_account' | 'ewallet' | 'credit_card' | 'deposit' | 'split';

const CHANNELS: { key: PaymentChannelKey; label: string; color: string; icon: string }[] = [
  { key: 'cash', label: 'TUNAI', color: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: '💵' },
  { key: 'qris', label: 'QRIS', color: 'bg-blue-600 hover:bg-blue-700 text-white', icon: '📱' },
  { key: 'transfer', label: 'TRANSFER', color: 'bg-amber-500 hover:bg-amber-600 text-white', icon: '🏦' },
  { key: 'virtual_account', label: 'VA', color: 'bg-orange-500 hover:bg-orange-600 text-white', icon: '🔢' },
  { key: 'ewallet', label: 'E-WALLET', color: 'bg-purple-600 hover:bg-purple-700 text-white', icon: '👛' },
  { key: 'credit_card', label: 'KARTU', color: 'bg-slate-600 hover:bg-slate-700 text-white', icon: '💳' },
  { key: 'deposit', label: 'DP', color: 'bg-white border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50', icon: '📋' },
  { key: 'split', label: 'CAMPURAN', color: 'bg-white border-2 border-slate-400 text-slate-700 hover:bg-slate-50', icon: '✂️' },
];

interface PaymentMethodGridProps {
  selected: PaymentChannelKey | null;
  onSelect: (key: PaymentChannelKey) => void;
  disabled?: boolean;
}

export function PaymentMethodGrid({ selected, onSelect, disabled }: PaymentMethodGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CHANNELS.map((ch) => (
        <button
          key={ch.key}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(ch.key)}
          className={cn(
            'flex flex-col items-center justify-center p-4 rounded-2xl font-bold text-sm transition-all active:scale-95 min-h-[80px]',
            ch.color,
            selected === ch.key && 'ring-4 ring-offset-2 ring-emerald-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-2xl mb-1">{ch.icon}</span>
          {ch.label}
        </button>
      ))}
    </div>
  );
}
