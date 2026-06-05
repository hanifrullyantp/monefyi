import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { formatFinanceRupiah, validateBalancedEntry } from '../../lib/financeV2Calc';
import { createJournalEntry } from '../../services/financeV2/journalService';
import type { FinanceAccount } from '../../types/financeV2';
import { showToast } from '../../store/uiStore';

interface LineDraft {
  accountId: string;
  debit: string;
  credit: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  userId?: string;
  accounts: FinanceAccount[];
  onSaved: () => void;
}

const emptyLine = (): LineDraft => ({ accountId: '', debit: '', credit: '' });

export default function ManualJournalModal({
  open, onClose, orgId, userId, accounts, onSaved,
}: Props) {
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const parsedLines = lines
    .filter(l => l.accountId)
    .map(l => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
    }));

  const totalDebit = parsedLines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = parsedLines.reduce((s, l) => s + l.credit, 0);

  const handleSave = async () => {
    const check = validateBalancedEntry(parsedLines);
    if (!check.ok) {
      showToast(check.message || 'Jurnal tidak valid', 'error');
      return;
    }

    setSaving(true);
    try {
      await createJournalEntry({
        orgId,
        entryDate,
        description,
        referenceType: 'manual',
        lines: parsedLines,
        createdBy: userId,
      });
      showToast('Jurnal berhasil dicatat', 'success');
      setDescription('');
      setLines([emptyLine(), emptyLine()]);
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan jurnal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900">Jurnal Manual</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Tanggal</label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Keterangan</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Contoh: Setoran modal awal"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
              <div className="col-span-5">Akun</div>
              <div className="col-span-3">Debit</div>
              <div className="col-span-3">Kredit</div>
              <div className="col-span-1" />
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={line.accountId}
                  onChange={e => {
                    const next = [...lines];
                    next[idx] = { ...next[idx], accountId: e.target.value };
                    setLines(next);
                  }}
                  className="col-span-5 px-2 py-2 rounded-xl border border-slate-200 text-sm"
                >
                  <option value="">Pilih akun</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={line.debit}
                  onChange={e => {
                    const next = [...lines];
                    next[idx] = { debit: e.target.value, credit: '', accountId: line.accountId };
                    setLines(next);
                  }}
                  className="col-span-3 px-2 py-2 rounded-xl border border-slate-200 text-sm"
                  placeholder="0"
                />
                <input
                  type="number"
                  min={0}
                  value={line.credit}
                  onChange={e => {
                    const next = [...lines];
                    next[idx] = { credit: e.target.value, debit: '', accountId: line.accountId };
                    setLines(next);
                  }}
                  className="col-span-3 px-2 py-2 rounded-xl border border-slate-200 text-sm"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                  className="col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines([...lines, emptyLine()])}
              className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Tambah baris
            </button>
          </div>

          <div className="flex justify-between text-sm font-semibold px-1">
            <span className="text-slate-500">Total Debit: {formatFinanceRupiah(totalDebit)}</span>
            <span className="text-slate-500">Total Kredit: {formatFinanceRupiah(totalCredit)}</span>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan Jurnal
          </button>
        </div>
      </div>
    </div>
  );
}
