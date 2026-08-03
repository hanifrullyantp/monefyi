import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { validateBalancedEntry, sumDebits, sumCredits } from '../../lib/financeCalc';
import { formatCurrency } from '../../utils/format';
import type { JournalLineInput } from '../../types/finance';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface LineRow extends JournalLineInput {
  key: string;
}

export default function ManualJournalModal({ isOpen, onClose }: Props) {
  const accounts = useFinanceStore((s) => s.accounts);
  const createJournal = useFinanceStore((s) => s.createJournal);
  const { tenant, user } = useAuthStore();

  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<LineRow[]>([
    { key: '1', accountId: '', debit: 0, credit: 0 },
    { key: '2', accountId: '', debit: 0, credit: 0 },
  ]);
  const [error, setError] = useState('');

  const activeAccounts = accounts.filter((a) => a.isActive);

  const addLine = () => {
    setLines([...lines, { key: String(Date.now()), accountId: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (key: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, updates: Partial<LineRow>) => {
    setLines(lines.map((l) => (l.key === key ? { ...l, ...updates } : l)));
  };

  const handleSubmit = () => {
    if (!tenant) return;
    const journalLines = lines
      .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0))
      .map(({ accountId, debit, credit, notes }) => ({ accountId, debit, credit, notes }));

    const check = validateBalancedEntry(journalLines);
    if (!check.ok) {
      setError(check.message ?? 'Jurnal tidak valid');
      return;
    }

    const entry = createJournal({
      tenantId: tenant.id,
      entryDate,
      description: description || 'Jurnal manual',
      source: 'manual',
      lines: journalLines,
      createdBy: user?.id,
    });

    if (entry) {
      setDescription('');
      setLines([
        { key: '1', accountId: '', debit: 0, credit: 0 },
        { key: '2', accountId: '', debit: 0, credit: 0 },
      ]);
      setError('');
      onClose();
    }
  };

  const totalDebit = sumDebits(lines);
  const totalCredit = sumCredits(lines);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Input Jurnal Manual" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Tanggal" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          <Input label="Keterangan" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-500">Baris Jurnal</p>
          {lines.map((line) => (
            <div key={line.key} className="flex gap-2 items-end">
              <div className="flex-1">
                <select
                  value={line.accountId}
                  onChange={(e) => updateLine(line.key, { accountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                >
                  <option value="">Pilih akun...</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Debit"
                type="number"
                value={line.debit || ''}
                onChange={(e) => updateLine(line.key, { debit: Number(e.target.value) || 0, credit: 0 })}
                className="w-28"
              />
              <Input
                label="Kredit"
                type="number"
                value={line.credit || ''}
                onChange={(e) => updateLine(line.key, { credit: Number(e.target.value) || 0, debit: 0 })}
                className="w-28"
              />
              <button type="button" onClick={() => removeLine(line.key)} className="p-2 text-rose-400 hover:text-rose-600 mb-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-3 w-3 mr-1" /> Tambah Baris
          </Button>
        </div>

        <div className={`p-3 rounded-xl text-sm flex justify-between ${isBalanced ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
          <span>Total Debit: {formatCurrency(totalDebit)}</span>
          <span>Total Kredit: {formatCurrency(totalCredit)}</span>
          <span className="font-bold">{isBalanced ? '✓ Seimbang' : '✗ Tidak seimbang'}</span>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <Button className="w-full" onClick={handleSubmit} disabled={!isBalanced || !description}>
          Posting Jurnal
        </Button>
      </div>
    </Modal>
  );
}
