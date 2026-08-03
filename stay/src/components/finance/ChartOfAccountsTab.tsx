import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import { useFinanceStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { AccountType, AccountSubType, ChartAccount } from '../../types/finance';

const TYPE_LABELS: Record<AccountType, string> = {
  aktiva: 'AKTIVA',
  pasiva: 'PASIVA / KEWAJIBAN & MODAL',
  pendapatan: 'PENDAPATAN',
  beban: 'BEBAN',
};

interface TreeNode {
  type: AccountType;
  accounts: ChartAccount[];
}

export default function ChartOfAccountsTab() {
  const accounts = useFinanceStore((s) => s.accounts);
  const addAccount = useFinanceStore((s) => s.addAccount);
  const updateAccount = useFinanceStore((s) => s.updateAccount);
  const getAccountLedger = useFinanceStore((s) => s.getAccountLedger);
  const { tenant, user } = useAuthStore();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ aktiva: true, pasiva: true, pendapatan: true, beban: true });
  const [selectedAccount, setSelectedAccount] = useState<ChartAccount | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ code: '', name: '', accountType: 'aktiva' as AccountType, subType: 'kas' as AccountSubType });

  const trees: TreeNode[] = (['aktiva', 'pasiva', 'pendapatan', 'beban'] as AccountType[]).map((type) => ({
    type,
    accounts: accounts.filter((a) => a.accountType === type).sort((a, b) => a.code.localeCompare(b.code)),
  }));

  const canEdit = user?.role === 'owner';

  const handleAdd = () => {
    if (!tenant || !newAccount.code || !newAccount.name) return;
    addAccount({
      tenantId: tenant.id,
      code: newAccount.code,
      name: newAccount.name,
      accountType: newAccount.accountType,
      subType: newAccount.subType,
      isSystem: false,
      isActive: true,
    });
    setShowAdd(false);
    setNewAccount({ code: '', name: '', accountType: 'aktiva', subType: 'kas' });
  };

  const ledger = selectedAccount ? getAccountLedger(selectedAccount.id) : [];

  if (selectedAccount) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelectedAccount(null)} className="text-sm text-emerald-600 font-medium hover:underline">
          ← Daftar Akun → {selectedAccount.name}
        </button>
        <Card>
          <CardHeader title={`Buku Besar — ${selectedAccount.name}`} subtitle={`Kode ${selectedAccount.code} · Saldo ${formatCurrency(selectedAccount.currentBalance)}`} />
          <div className="divide-y divide-slate-50">
            {ledger.map(({ journal }) => (
              <div key={journal.id} className="p-4 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{journal.description}</p>
                  <p className="text-xs text-slate-400">{journal.entryDate} · {journal.entryNumber}</p>
                </div>
                <Badge variant="info">{journal.source}</Badge>
              </div>
            ))}
            {ledger.length === 0 && <p className="p-4 text-sm text-slate-400">Belum ada transaksi</p>}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3 mr-1" /> Tambah Akun
          </Button>
        </div>
      )}

      {trees.map(({ type, accounts: typeAccounts }) => (
        <Card key={type}>
          <button
            type="button"
            onClick={() => setExpanded((e) => ({ ...e, [type]: !e[type] }))}
            className="w-full flex items-center gap-2 p-4 text-left font-bold text-slate-800"
          >
            {expanded[type] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {TYPE_LABELS[type]} ({typeAccounts.length})
          </button>
          {expanded[type] && (
            <div className="divide-y divide-slate-50 border-t border-slate-100">
              {typeAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <button type="button" onClick={() => setSelectedAccount(acc)} className="flex-1 text-left">
                    <span className="font-mono text-xs text-slate-400 mr-2">{acc.code}</span>
                    <span className="text-sm font-medium text-slate-800">{acc.name}</span>
                    {acc.isSystem && <Badge variant="info" className="ml-2">System</Badge>}
                    {!acc.isActive && <Badge variant="danger" className="ml-2">Nonaktif</Badge>}
                  </button>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-sm font-bold tabular-nums', acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-700')}>
                      {formatCurrency(acc.currentBalance)}
                    </span>
                    {canEdit && !acc.isSystem && (
                      <button
                        type="button"
                        onClick={() => updateAccount(acc.id, { isActive: !acc.isActive })}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        {acc.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Tambah Akun Baru" size="sm">
        <div className="space-y-4">
          <Input label="Kode Akun" value={newAccount.code} onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })} />
          <Input label="Nama Akun" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} />
          <select
            value={newAccount.accountType}
            onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value as AccountType })}
            className="w-full px-4 py-2.5 rounded-xl border text-sm"
          >
            <option value="aktiva">Aktiva</option>
            <option value="pasiva">Pasiva</option>
            <option value="pendapatan">Pendapatan</option>
            <option value="beban">Beban</option>
          </select>
          <Button className="w-full" onClick={handleAdd}>Simpan</Button>
        </div>
      </Modal>
    </div>
  );
}
