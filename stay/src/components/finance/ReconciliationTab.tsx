import { useState, useRef } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import { parseBankCsv, matchBankTransactions, type BankCsvRow } from '../../utils/bankCsvParser';

interface ImportedRow extends BankCsvRow {
  matchStatus: 'matched' | 'unmatched' | 'unchecked';
  journalId?: string;
}

export default function ReconciliationTab() {
  const bankAccounts = useFinanceStore((s) => s.bankAccounts);
  const accounts = useFinanceStore((s) => s.accounts);
  const journalEntries = useFinanceStore((s) => s.journalEntries);
  const journalLines = useFinanceStore((s) => s.journalLines);
  const [activeSection, setActiveSection] = useState<'bank' | 'xendit' | 'cash'>('bank');
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const xenditAccount = accounts.find((a) => a.code === '1104');
  const cashAccount = accounts.find((a) => a.code === '1101');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseBankCsv(text);
      setImportErrors(result.errors);

      const bankAcc = bankAccounts.find((b) => b.id === selectedBankId);
      const chartAcc = bankAcc ? accounts.find((a) => a.id === bankAcc.chartAccountId) : null;

      const journalItems = journalEntries
        .filter((j) => j.status === 'posted')
        .map((j) => {
          const lines = journalLines.filter((l) => l.journalId === j.id && chartAcc && l.accountId === chartAcc.id);
          const net = lines.reduce((s, l) => s + l.debit - l.credit, 0);
          return { id: j.id, date: j.entryDate, description: j.description, amount: net };
        })
        .filter((j) => j.amount !== 0);

      const { matched, unmatched } = matchBankTransactions(result.rows, journalItems);

      const rows: ImportedRow[] = result.rows.map((row, i) => {
        const m = matched.find((x) => x.csvIndex === i);
        return {
          ...row,
          matchStatus: m ? 'matched' : unmatched.includes(i) ? 'unmatched' : 'unchecked',
          journalId: m?.journalId,
        };
      });

      setImportedRows(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runAutoMatch = () => {
    const bankAcc = bankAccounts.find((b) => b.id === selectedBankId);
    const chartAcc = bankAcc ? accounts.find((a) => a.id === bankAcc.chartAccountId) : null;
    if (!chartAcc || importedRows.length === 0) return;

    const journalItems = journalEntries
      .filter((j) => j.status === 'posted')
      .map((j) => {
        const lines = journalLines.filter((l) => l.journalId === j.id && l.accountId === chartAcc.id);
        const net = lines.reduce((s, l) => s + l.debit - l.credit, 0);
        return { id: j.id, date: j.entryDate, description: j.description, amount: net };
      })
      .filter((j) => j.amount !== 0);

    const { matched, unmatched } = matchBankTransactions(importedRows, journalItems);
    setImportedRows(
      importedRows.map((row, i) => {
        const m = matched.find((x) => x.csvIndex === i);
        return {
          ...row,
          matchStatus: m ? 'matched' : unmatched.includes(i) ? 'unmatched' : 'unchecked',
          journalId: m?.journalId,
        };
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['bank', 'xendit', 'cash'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium',
              activeSection === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {s === 'bank' ? 'Rekonsiliasi Bank' : s === 'xendit' ? 'Rekonsiliasi Xendit' : 'Rekonsiliasi Kas Tunai'}
          </button>
        ))}
      </div>

      {activeSection === 'bank' && (
        <div className="space-y-4">
          {bankAccounts.map((bank) => {
            const chartAcc = accounts.find((a) => a.id === bank.chartAccountId);
            const stayBalance = chartAcc?.currentBalance ?? 0;
            const importedTotal = selectedBankId === bank.id
              ? importedRows.reduce((s, r) => s + (r.type === 'credit' ? r.amount : -r.amount), 0)
              : 0;
            const bankBalance = stayBalance + importedTotal;
            const variance = selectedBankId === bank.id && importedRows.length > 0
              ? importedTotal
              : 0;

            return (
              <Card key={bank.id}>
                <CardHeader
                  title={`${bank.bankName} — ${bank.accountNumber}`}
                  subtitle={`Pemegang: ${bank.accountHolder ?? '-'}`}
                />
                <div className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Saldo STAY</p>
                      <p className="font-bold">{formatCurrency(stayBalance)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">Mutasi Diimport</p>
                      <p className="font-bold">{formatCurrency(importedTotal)}</p>
                    </div>
                    <div className={cn('p-3 rounded-xl', variance === 0 ? 'bg-emerald-50' : 'bg-rose-50')}>
                      <p className="text-xs text-slate-500">Belum Cocok</p>
                      <p className="font-bold">{importedRows.filter((r) => r.matchStatus === 'unmatched').length} item</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedBankId(bank.id); fileRef.current?.click(); }}
                    >
                      <Upload className="h-3 w-3 mr-1" /> Import CSV
                    </Button>
                    {selectedBankId === bank.id && importedRows.length > 0 && (
                      <Button variant="outline" size="sm" onClick={runAutoMatch}>
                        Matching Otomatis
                      </Button>
                    )}
                  </div>

                  {importErrors.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-800">
                      {importErrors.map((e) => <p key={e}>{e}</p>)}
                    </div>
                  )}

                  {selectedBankId === bank.id && importedRows.length > 0 && (
                    <div className="border rounded-xl divide-y divide-slate-50 max-h-64 overflow-y-auto">
                      {importedRows.map((row, i) => (
                        <div key={i} className="p-3 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{row.description}</p>
                            <p className="text-xs text-slate-400">{row.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('font-bold tabular-nums', row.type === 'credit' ? 'text-emerald-600' : 'text-rose-600')}>
                              {row.type === 'credit' ? '+' : '-'}{formatCurrency(row.amount)}
                            </span>
                            <Badge variant={row.matchStatus === 'matched' ? 'success' : row.matchStatus === 'unmatched' ? 'danger' : 'warning'}>
                              {row.matchStatus === 'matched' ? 'Cocok' : row.matchStatus === 'unmatched' ? 'Selisih' : 'Belum Dicek'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeSection === 'xendit' && (
        <Card>
          <CardHeader title="Rekonsiliasi Xendit" subtitle="Bandingkan saldo STAY vs dashboard Xendit" />
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 font-bold uppercase">Saldo STAY (1104)</p>
                <p className="text-2xl font-black text-emerald-800">{formatCurrency(xenditAccount?.currentBalance ?? 0)}</p>
              </div>
              <div className="p-4 bg-sky-50 rounded-xl">
                <p className="text-xs text-sky-600 font-bold uppercase">Piutang Xendit (1203)</p>
                <p className="text-2xl font-black text-sky-800">{formatCurrency(accounts.find((a) => a.code === '1203')?.currentBalance ?? 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Webhook Xendit otomatis posting jurnal settlement + fee payment gateway
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'cash' && (
        <Card>
          <CardHeader title="Rekonsiliasi Kas Tunai" subtitle="Bandingkan catatan vs kas fisik tutup kas harian" />
          <div className="px-4 pb-4 space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-xs text-amber-600 font-bold uppercase">Saldo Kas STAY (1101)</p>
                <p className="text-2xl font-black">{formatCurrency(cashAccount?.currentBalance ?? 0)}</p>
              </div>
              <Badge variant="success">POS Register</Badge>
            </div>
            <p className="text-sm text-slate-500">
              Tutup kas register di POS untuk mencatat selisih kas fisik vs expected balance.
              Riwayat selisih tersimpan per shift.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
