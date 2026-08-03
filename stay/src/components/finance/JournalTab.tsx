import { useState, useMemo } from 'react';
import { Plus, Download, Search, Ban } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import ManualJournalModal from './ManualJournalModal';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { exportToCsv } from '../../utils/analytics';
import { cn } from '../../utils/cn';

const SOURCE_LABELS: Record<string, string> = {
  booking: 'Booking',
  payment: 'Pembayaran',
  pos: 'POS',
  payroll: 'Payroll',
  kasbon: 'Kasbon',
  expense: 'Pengeluaran',
  refund: 'Refund',
  inventory: 'Inventory',
  xendit: 'Xendit',
  manual: 'Manual',
  closing: 'Penutup',
  void: 'Void',
};

export default function JournalTab() {
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const accounts = useFinanceStore((s) => s.accounts);
  const voidJournal = useFinanceStore((s) => s.voidJournal);
  const { user } = useAuthStore();

  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filtered = useMemo(() => {
    return journalEntries.filter((j) => {
      if (sourceFilter !== 'all' && j.source !== sourceFilter) return false;
      if (search && !j.description.toLowerCase().includes(search.toLowerCase()) && !j.entryNumber.includes(search)) return false;
      return true;
    });
  }, [journalEntries, sourceFilter, search]);

  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  const handleExport = () => {
    exportToCsv(
      `jurnal-${new Date().toISOString().split('T')[0]}.csv`,
      ['Tanggal', 'No Jurnal', 'Keterangan', 'Debit', 'Kredit', 'Sumber', 'Status'],
      filtered.flatMap((j) => {
        const lines = journalLines.filter((l) => l.journalId === j.id);
        return lines.map((l) => [
          j.entryDate,
          j.entryNumber,
          j.description,
          l.debit ? getAccountName(l.accountId) + ' ' + l.debit : '',
          l.credit ? getAccountName(l.accountId) + ' ' + l.credit : '',
          j.source,
          j.status,
        ]);
      })
    );
  };

  const handleVoid = () => {
    if (!voidTarget || !voidReason.trim()) return;
    voidJournal(voidTarget, voidReason, user?.id);
    setVoidTarget(null);
    setVoidReason('');
  };

  const canManage = user?.role === 'owner' || user?.role === 'manager';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jurnal..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm"
          >
            <option value="all">Semua Sumber</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setShowManual(true)}>
              <Plus className="h-3 w-3 mr-1" /> Jurnal Manual
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Jurnal Umum" subtitle={`${filtered.length} entri`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                <th className="pb-3 px-4">Tanggal</th>
                <th className="pb-3 px-4">No Jurnal</th>
                <th className="pb-3 px-4">Keterangan</th>
                <th className="pb-3 px-4">Debit / Kredit</th>
                <th className="pb-3 px-4">Sumber</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const lines = journalLines.filter((l) => l.journalId === j.id);
                return (
                  <tr key={j.id} className={cn('border-b border-slate-50 hover:bg-slate-50/50', j.status === 'void' && 'opacity-50')}>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(j.entryDate)}</td>
                    <td className="py-3 px-4 font-mono text-xs">{j.entryNumber}</td>
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate">{j.description}</td>
                    <td className="py-3 px-4 text-xs space-y-0.5">
                      {lines.map((l) => (
                        <div key={l.id}>
                          {l.debit > 0 && <span className="text-emerald-600">D {getAccountName(l.accountId)} {formatCurrency(l.debit)}</span>}
                          {l.credit > 0 && <span className="text-rose-600">K {getAccountName(l.accountId)} {formatCurrency(l.credit)}</span>}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4"><Badge variant="info">{SOURCE_LABELS[j.source] ?? j.source}</Badge></td>
                    <td className="py-3 px-4">
                      <Badge variant={j.status === 'posted' ? 'success' : j.status === 'void' ? 'danger' : 'warning'}>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {canManage && j.status === 'posted' && (
                        <button type="button" onClick={() => setVoidTarget(j.id)} className="text-rose-500 hover:text-rose-700">
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Belum ada jurnal</p>
          )}
        </div>
      </Card>

      <ManualJournalModal isOpen={showManual} onClose={() => setShowManual(false)} />

      <Modal isOpen={!!voidTarget} onClose={() => setVoidTarget(null)} title="Void Jurnal" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Void akan membuat jurnal balik otomatis. Jurnal asli tidak dihapus.</p>
          <Input label="Alasan void (wajib)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <Button className="w-full" variant="danger" onClick={handleVoid} disabled={!voidReason.trim()}>
            Void Jurnal
          </Button>
        </div>
      </Modal>
    </div>
  );
}
