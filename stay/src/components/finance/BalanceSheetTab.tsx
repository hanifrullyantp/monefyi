import { useState } from 'react';
import { RefreshCw, History, Radio, Download, ChevronLeft } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import NeracaTable from './NeracaTable';
import { useFinanceStore } from '../../store/financeStore';
import { formatDateTime } from '../../utils/format';
import { exportToCsv } from '../../utils/analytics';
import { cn } from '../../utils/cn';

export default function BalanceSheetTab() {
  const getBalanceSheet = useFinanceStore((s) => s.getBalanceSheet);
  const getAccountLedger = useFinanceStore((s) => s.getAccountLedger);
  const accounts = useFinanceStore((s) => s.accounts);
  const viewMode = useFinanceStore((s) => s.viewMode);
  const historyDate = useFinanceStore((s) => s.historyDate);

  const [drillDown, setDrillDown] = useState<{ id: string; name: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const data = getBalanceSheet(viewMode === 'history' ? historyDate : undefined);

  const handleExport = () => {
    const rows: string[][] = [['Tipe', 'Akun', 'Kode', 'Saldo']];
    for (const g of [...data.aktiva, ...data.pasiva]) {
      rows.push(['Group', g.name, g.code, String(g.balance)]);
      g.children?.forEach((c) => rows.push(['Detail', c.name, c.code, String(c.balance)]));
    }
    rows.push(['', 'TOTAL AKTIVA', '', String(data.totalAktiva)]);
    rows.push(['', 'TOTAL PASIVA', '', String(data.totalPasiva)]);
    exportToCsv(`neraca-${new Date().toISOString().split('T')[0]}.csv`, rows[0], rows.slice(1));
  };

  const ledger = drillDown ? getAccountLedger(drillDown.id) : [];

  if (drillDown) {
    const account = accounts.find((a) => a.id === drillDown.id);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setDrillDown(null)}
          className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Neraca → {drillDown.name}
        </button>
        <Card>
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">{drillDown.name}</h3>
            <p className="text-sm text-slate-500">Saldo: {account?.currentBalance.toLocaleString('id-ID')}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {ledger.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Belum ada jurnal untuk akun ini</p>
            ) : (
              ledger.map(({ journal, lines }) => {
                const line = lines.find((l) => l.accountId === drillDown.id);
                return (
                  <div key={journal.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{journal.description}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(journal.entryDate)} · {journal.entryNumber}</p>
                    </div>
                    <div className="text-right text-sm">
                      {line?.debit ? <span className="text-emerald-600">D {line.debit.toLocaleString('id-ID')}</span> : null}
                      {line?.credit ? <span className="text-rose-600">K {line.credit.toLocaleString('id-ID')}</span> : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === 'live' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => useFinanceStore.setState({ viewMode: 'live' })}
        >
          <Radio className="h-3 w-3 mr-1" /> LIVE
        </Button>
        <Button
          variant={viewMode === 'history' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => useFinanceStore.setState({ viewMode: 'history' })}
        >
          <History className="h-3 w-3 mr-1" /> HISTORY
        </Button>
        {viewMode === 'history' && (
          <input
            type="date"
            value={historyDate}
            onChange={(e) => useFinanceStore.setState({ historyDate: e.target.value })}
            className="px-3 py-1.5 rounded-lg border text-sm"
          />
        )}
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3 w-3 mr-1" /> Export Excel
        </Button>
      </div>

      <div key={refreshKey}>
        <NeracaTable data={data} onAccountClick={(id, name) => setDrillDown({ id, name })} />
      </div>
    </div>
  );
}
