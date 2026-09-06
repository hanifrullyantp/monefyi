import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Banknote } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { loadPayables, createPayable, recordPayablePayment } from '../../services/financeV2/payableService';
import { loadReceivables, createReceivable, recordReceivablePayment } from '../../services/financeV2/receivableService';
import { loadKasAccounts } from '../../services/financeV2/kasService';
import { buildFinanceReportBundle } from '../../lib/financeV2/reports';
import { formatRupiah, parseMoneyInput } from '../../utils/projectUi';
import type { PayableCategory, DebtorType } from '../../types/financeV2';
import { buildPartyAccounts } from '../../lib/financeV2/partyLedger';
import PartyAccountModal from '../../components/finance-v2/PartyAccountModal';

type Props = {
  mode: 'combined';
};

type FormKind = 'hutang' | 'piutang' | null;

export default function FinanceHutangPiutangTab(_props: Props) {
  const { tenant, user, projects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [payables, setPayables] = useState<Awaited<ReturnType<typeof loadPayables>>>([]);
  const [receivables, setReceivables] = useState<Awaited<ReturnType<typeof loadReceivables>>>([]);
  const [kasAccounts, setKasAccounts] = useState<{ id: string; name: string }[]>([]);
  const [formKind, setFormKind] = useState<FormKind>(null);
  const [payTarget, setPayTarget] = useState<{ kind: 'hutang' | 'piutang'; id: string } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payKasId, setPayKasId] = useState('');
  const [partyName, setPartyName] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [payableCategory, setPayableCategory] = useState<PayableCategory>('dagang');
  const [debtorType, setDebtorType] = useState<DebtorType>('company');

  const reload = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [p, r, kas] = await Promise.all([
        loadPayables(tenant.id),
        loadReceivables(tenant.id),
        loadKasAccounts(tenant.id),
      ]);
      setPayables(p);
      setReceivables(r);
      setKasAccounts(kas.map(k => ({ id: k.id, name: k.name })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { void reload(); }, [reload]);

  const totalHutang = payables.reduce((s, p) => s + (p.amount - p.paid_amount), 0);
  const totalPiutang = receivables.reduce((s, r) => s + (r.amount - r.paid_amount), 0);
  const partyAccounts = useMemo(
    () => buildPartyAccounts({ receivables, payables }),
    [receivables, payables],
  );

  const resetForm = () => {
    setFormKind(null);
    setName('');
    setAmount('');
    setDueDate('');
    setProjectId('');
  };

  const handleCreate = async () => {
    if (!tenant?.id || !name.trim() || !amount) return;
    const num = parseMoneyInput(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    try {
      if (formKind === 'hutang') {
        await createPayable({
          orgId: tenant.id,
          creditorType: 'vendor',
          creditorName: name.trim(),
          category: payableCategory,
          amount: num,
          dueDate: dueDate || undefined,
          creditorProjectId: projectId || undefined,
          createdBy: user?.id,
        });
        showToast('Hutang dicatat', 'success');
      } else if (formKind === 'piutang') {
        await createReceivable({
          orgId: tenant.id,
          debtorType,
          debtorName: name.trim(),
          debtorProjectId: projectId || undefined,
          amount: num,
          dueDate: dueDate || undefined,
          createdBy: user?.id,
        });
        showToast('Piutang dicatat', 'success');
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    }
  };

  const handlePay = async () => {
    if (!tenant?.id || !payTarget) return;
    const num = parseMoneyInput(payAmount);
    if (!Number.isFinite(num) || num <= 0) return;
    try {
      if (payTarget.kind === 'hutang') {
        await recordPayablePayment({
          orgId: tenant.id,
          payableId: payTarget.id,
          amount: num,
          kasAccountId: payKasId || undefined,
          createdBy: user?.id,
        });
      } else {
        await recordReceivablePayment({
          orgId: tenant.id,
          receivableId: payTarget.id,
          amount: num,
          kasAccountId: payKasId || undefined,
          createdBy: user?.id,
        });
      }
      showToast('Pembayaran dicatat', 'success');
      setPayTarget(null);
      setPayAmount('');
      reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal bayar', 'error');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="space-y-4">
      {(formKind || payTarget) && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          {formKind && (
            <>
              <h3 className="font-bold text-sm">{formKind === 'hutang' ? 'Tambah Hutang' : 'Tambah Piutang'}</h3>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama pihak" className="w-full px-3 py-2 rounded-xl border text-sm" />
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Nominal" className="w-full px-3 py-2 rounded-xl border text-sm" />
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm" />
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
                <option value="">Tanpa proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {formKind === 'hutang' && (
                <select value={payableCategory} onChange={e => setPayableCategory(e.target.value as PayableCategory)} className="w-full px-3 py-2 rounded-xl border text-sm">
                  <option value="dagang">Dagang</option>
                  <option value="pajak">Pajak</option>
                  <option value="lain">Lain</option>
                </select>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border text-sm font-semibold">Batal</button>
                <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Simpan</button>
              </div>
            </>
          )}
          {payTarget && (
            <>
              <h3 className="font-bold text-sm">Catat Pembayaran</h3>
              <input value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Nominal bayar" className="w-full px-3 py-2 rounded-xl border text-sm" />
              <select value={payKasId} onChange={e => setPayKasId(e.target.value)} className="w-full px-3 py-2 rounded-xl border text-sm">
                <option value="">Kas default</option>
                {kasAccounts.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPayTarget(null)} className="px-4 py-2 rounded-xl border text-sm font-semibold">Batal</button>
                <button type="button" onClick={handlePay} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">Bayar</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setPayTarget(null); setFormKind('hutang'); }} className="text-xs font-bold text-rose-600 flex items-center gap-1 px-3 py-2 rounded-xl border">
          <Plus className="w-3.5 h-3.5" /> Hutang
        </button>
        <button type="button" onClick={() => { setPayTarget(null); setFormKind('piutang'); }} className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-3 py-2 rounded-xl border">
          <Plus className="w-3.5 h-3.5" /> Piutang
        </button>
        <p className="text-xs text-slate-500 self-center">
          Hutang {formatRupiah(totalHutang)} · Piutang {formatRupiah(totalPiutang)}
        </p>
      </div>

      <div className="space-y-2">
        {partyAccounts.map(acc => (
          <button
            key={acc.partyKey}
            type="button"
            onClick={() => setPartyName(acc.displayName)}
            className="w-full flex items-center gap-3 bg-white border rounded-xl p-4 text-left hover:bg-slate-50"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
              {acc.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{acc.displayName}</div>
              <div className="text-xs text-slate-500">{acc.lines.length} mutasi · ketuk untuk rincian akun</div>
            </div>
            <div className="text-right shrink-0 text-xs">
              <div className="font-bold text-emerald-700">P {formatRupiah(acc.piutang)}</div>
              <div className="font-bold text-rose-600">H {formatRupiah(acc.hutang)}</div>
            </div>
          </button>
        ))}
        {partyAccounts.length === 0 && <p className="text-sm text-slate-500">Belum ada akun hutang/piutang.</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
      <section>
        <h3 className="text-sm font-bold text-rose-600 mb-3">Item hutang terbuka</h3>
        <div className="space-y-2">
          {payables.filter(p => p.amount > p.paid_amount).map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-white border rounded-xl p-4">
              <div className="flex-1 min-w-0">
                <button type="button" onClick={() => setPartyName(p.creditor_name)} className="font-semibold text-sm truncate text-left hover:underline">
                  {p.creditor_name}
                </button>
                <div className="text-xs text-slate-500">Jatuh tempo: {p.due_date || '—'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-rose-600 text-sm">{formatRupiah(p.amount - p.paid_amount)}</div>
                <button type="button" onClick={() => { setFormKind(null); setPayTarget({ kind: 'hutang', id: p.id }); }} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 ml-auto mt-1">
                  <Banknote className="w-3 h-3" /> Bayar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-bold text-emerald-600 mb-3">Item piutang terbuka</h3>
        <div className="space-y-2">
          {receivables.filter(r => r.amount > r.paid_amount).map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-white border rounded-xl p-4">
              <div className="flex-1 min-w-0">
                <button type="button" onClick={() => setPartyName(r.debtor_name)} className="font-semibold text-sm truncate text-left hover:underline">
                  {r.debtor_name}
                </button>
                <div className="text-xs text-slate-500">Jatuh tempo: {r.due_date || '—'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-emerald-600 text-sm">{formatRupiah(r.amount - r.paid_amount)}</div>
                <button type="button" onClick={() => { setFormKind(null); setPayTarget({ kind: 'piutang', id: r.id }); }} className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 ml-auto mt-1">
                  <Banknote className="w-3 h-3" /> Terima
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>

      {partyName && tenant?.id && (
        <PartyAccountModal
          open
          onClose={() => setPartyName(null)}
          orgId={tenant.id}
          partyName={partyName}
        />
      )}
    </div>
  );
}

export function FinanceLabaRugiTab() {
  const { tenant } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Awaited<ReturnType<typeof buildFinanceReportBundle>>['profitLoss'] | null>(null);

  const monthRange = useMemo(() => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const to = d.toISOString().slice(0, 10);
    return { from, to };
  }, []);

  useEffect(() => {
    if (!tenant?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const bundle = await buildFinanceReportBundle({
          orgId: tenant.id,
          dateFrom: monthRange.from,
          dateTo: monthRange.to,
        });
        if (!cancelled) setReport(bundle.profitLoss);
      } catch (e) {
        if (!cancelled) showToast(e instanceof Error ? e.message : 'Gagal memuat laba rugi', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.id, monthRange.from, monthRange.to]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>;
  }

  if (!report) return null;

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-1">
      <h3 className="font-black text-lg mb-3 text-violet-900">Laba Rugi — Bulan Ini</h3>
      <Row label="Pendapatan" value={report.revenue} bold />
      <Row label="HPP" value={report.hpp} />
      <Row label="Laba Kotor" value={report.grossProfit} bold />
      <Row label="Beban Operasional" value={report.opex} />
      <Row label="Laba Bersih" value={report.netProfit} bold />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2 border-b border-slate-50 ${bold ? 'font-black text-slate-900' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span>{formatRupiah(value)}</span>
    </div>
  );
}
