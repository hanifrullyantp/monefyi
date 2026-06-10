import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import { transferKas } from '../../services/financeV2/kasService';
import { showToast } from '../../store/uiStore';
import type { FinanceAccount } from '../../types/financeV2';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  userId?: string;
  accounts: FinanceAccount[];
  onSaved: () => void;
}

export default function KasTransferModal({ open, onClose, orgId, userId, accounts, onSaved }: Props) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!fromId || !toId || !num || num <= 0) {
      showToast('Lengkapi akun dan nominal transfer', 'error');
      return;
    }
    setSaving(true);
    try {
      await transferKas({
        orgId,
        fromAccountId: fromId,
        toAccountId: toId,
        amount: num,
        description: description.trim() || undefined,
        createdBy: userId,
      });
      showToast('Transfer berhasil', 'success');
      setAmount('');
      setDescription('');
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal transfer', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Transfer Antar Kas</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Dari akun</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="">Pilih akun asal</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {formatFinanceRupiah(a.current_balance)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Ke akun</label>
            <select value={toId} onChange={e => setToId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm">
              <option value="">Pilih akun tujuan</option>
              {accounts.filter(a => a.id !== fromId).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Nominal (Rp)</label>
            <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Keterangan</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" placeholder="Opsional" />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold">Batal</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
