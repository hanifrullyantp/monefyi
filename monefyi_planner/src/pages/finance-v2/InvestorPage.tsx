import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import {
  calculateInvestorDividend,
  createInvestor,
  loadInvestorTransactions,
  loadInvestors,
  recordInvestorTransaction,
} from '../../services/financeV2/investorService';
import type { InvestmentType, Investor, InvestorTransaction } from '../../types/financeV2';
import { INVESTMENT_TYPE_LABEL } from '../../types/financeV2';

export default function InvestorPage() {
  const { tenant, user } = useAppStore();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txMap, setTxMap] = useState<Record<string, InvestorTransaction[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [calcProfit, setCalcProfit] = useState('');

  const [name, setName] = useState('');
  const [sharePct, setSharePct] = useState('');
  const [invType, setInvType] = useState<InvestmentType>('equity');

  const [txType, setTxType] = useState<'invest' | 'withdraw' | 'dividend'>('invest');
  const [txAmount, setTxAmount] = useState('');
  const [txInvestorId, setTxInvestorId] = useState('');

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      setInvestors(await loadInvestors(tenant.id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat investor', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const totalInvested = investors.reduce((s, i) => s + i.total_invested, 0);
  const profit = parseFloat(calcProfit) || 0;

  const handleCreate = async () => {
    if (!tenant?.id || !name.trim()) return;
    try {
      await createInvestor({
        orgId: tenant.id,
        name: name.trim(),
        investmentType: invType,
        sharePct: parseFloat(sharePct) || undefined,
      });
      showToast('Investor ditambahkan', 'success');
      setFormOpen(false);
      setName('');
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menambah', 'error');
    }
  };

  const handleTransaction = async () => {
    if (!tenant?.id || !txInvestorId || !txAmount) return;
    try {
      await recordInvestorTransaction({
        orgId: tenant.id,
        investorId: txInvestorId,
        type: txType,
        amount: parseFloat(txAmount),
        createdBy: user?.id,
      });
      showToast('Transaksi dicatat', 'success');
      setTxAmount('');
      load();
      if (expandedId === txInvestorId) loadTx(txInvestorId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal mencatat', 'error');
    }
  };

  const loadTx = async (investorId: string) => {
    try {
      const txs = await loadInvestorTransactions(investorId);
      setTxMap(prev => ({ ...prev, [investorId]: txs }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    else {
      setExpandedId(id);
      if (!txMap[id]) loadTx(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Total modal: <span className="font-bold text-emerald-700">{formatFinanceRupiah(totalInvested)}</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus className="w-4 h-4" /> Investor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-800">Kalkulator Dividen</h3>
        </div>
        <input type="number" value={calcProfit} onChange={e => setCalcProfit(e.target.value)} placeholder="Laba bersih periode (Rp)" className="w-full max-w-xs px-3 py-2 rounded-xl border text-sm" />
        {profit > 0 && investors.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {investors.filter(i => i.share_pct).map(inv => (
              <div key={inv.id} className="flex justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                <span>{inv.name} ({inv.share_pct}%)</span>
                <span className="font-bold text-emerald-700">{formatFinanceRupiah(calculateInvestorDividend(profit, inv.share_pct!))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <div className="bg-white rounded-2xl border p-5 space-y-3">
          <h3 className="font-bold">Investor Baru</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nama" className="px-3 py-2 rounded-xl border text-sm" />
            <input type="number" value={sharePct} onChange={e => setSharePct(e.target.value)} placeholder="Share %" className="px-3 py-2 rounded-xl border text-sm" />
            <select value={invType} onChange={e => setInvType(e.target.value as InvestmentType)} className="px-3 py-2 rounded-xl border text-sm">
              {(Object.keys(INVESTMENT_TYPE_LABEL) as InvestmentType[]).map(t => (
                <option key={t} value={t}>{INVESTMENT_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border text-sm">Batal</button>
            <button type="button" onClick={handleCreate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Simpan</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <h3 className="font-bold text-slate-800">Catat Transaksi</h3>
        <div className="grid sm:grid-cols-4 gap-2">
          <select value={txInvestorId} onChange={e => setTxInvestorId(e.target.value)} className="px-3 py-2 rounded-xl border text-sm">
            <option value="">Pilih investor</option>
            {investors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select value={txType} onChange={e => setTxType(e.target.value as typeof txType)} className="px-3 py-2 rounded-xl border text-sm">
            <option value="invest">Investasi</option>
            <option value="withdraw">Penarikan</option>
            <option value="dividend">Dividen</option>
          </select>
          <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="Nominal" className="px-3 py-2 rounded-xl border text-sm" />
          <button type="button" onClick={handleTransaction} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Catat</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-3">
          {investors.map(inv => (
            <div key={inv.id} className="bg-white rounded-2xl border p-4">
              <button type="button" onClick={() => toggleExpand(inv.id)} className="w-full flex items-center justify-between text-left">
                <div>
                  <div className="font-bold text-slate-900">{inv.name}</div>
                  <div className="text-xs text-slate-500">
                    {inv.investment_type ? INVESTMENT_TYPE_LABEL[inv.investment_type] : '—'}
                    {inv.share_pct != null && ` · ${inv.share_pct}%`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-emerald-700">{formatFinanceRupiah(inv.total_invested)}</span>
                  {expandedId === inv.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expandedId === inv.id && (
                <div className="mt-3 border-t pt-3 space-y-1">
                  {(txMap[inv.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-400">Belum ada transaksi.</p>
                  ) : (txMap[inv.id] || []).map(tx => (
                    <div key={tx.id} className="flex justify-between text-sm">
                      <span className="text-slate-600">{tx.trans_date} · {tx.type}</span>
                      <span className="font-semibold">{formatFinanceRupiah(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
