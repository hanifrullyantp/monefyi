import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2, FolderKanban, TrendingUp, CheckCircle2, Users, Lock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { showToast } from '../../store/uiStore';
import { getFinanceV2Snapshot } from '../../services/financeV2/balanceSheetService';
import { loadPayables } from '../../services/financeV2/payableService';
import { aggregateNetCashflow, getOrgFinanceTotals } from '../../services/projectFinanceService';
import { buildBusinessSnapshotFromAccounts } from '../../lib/migration/project-normalize';
import { validateBusinessBalance } from '../../lib/migration/balance-sheet';
import { buildFinanceReportBundle } from '../../lib/financeV2/reports';
import { listPayrollEntries } from '../../services/payrollService';
import { formatRupiah } from '../../utils/projectUi';
import NeracaGrid from '../../components/sandbox-ui/NeracaGrid';
import Sparkline from '../../components/sandbox-ui/Sparkline';
import BalanceDiagnosisModal from '../../components/finance-v2/BalanceDiagnosisModal';

const BASE = '/app/finance-v2';

function formatHeroKas(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('id-ID');
  return amount < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

export default function FinanceSandboxOverview() {
  const navigate = useNavigate();
  const { tenant, projects } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [totalKas, setTotalKas] = useState(0);
  const [totalHutang, setTotalHutang] = useState(0);
  const [piutang, setPiutang] = useState(0);
  const [persediaan, setPersediaan] = useState(0);
  const [asetTetap, setAsetTetap] = useState(0);
  const [prabayar, setPrabayar] = useState(0);
  const [modal, setModal] = useState(0);
  const [labaDitahan, setLabaDitahan] = useState(0);
  const [cashflow, setCashflow] = useState<number[]>([]);
  const [orgName, setOrgName] = useState('');
  const [mtdLaba, setMtdLaba] = useState(0);
  const [payrollOutstanding, setPayrollOutstanding] = useState(0);
  const [projectsReadyClose, setProjectsReadyClose] = useState(0);

  const monthRange = useMemo(() => {
    const d = new Date();
    const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const to = d.toISOString().slice(0, 10);
    return { from, to };
  }, []);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [snap, payables, cf, orgTotals, reportBundle, payroll] = await Promise.all([
        getFinanceV2Snapshot(tenant.id),
        loadPayables(tenant.id),
        aggregateNetCashflow(tenant.id, 30),
        getOrgFinanceTotals(tenant.id),
        buildFinanceReportBundle({
          orgId: tenant.id,
          dateFrom: monthRange.from,
          dateTo: monthRange.to,
        }),
        listPayrollEntries(tenant.id, 48),
      ]);
      const hutangOpen = payables.reduce((s, p) => s + (p.amount - p.paid_amount), 0);
      const biz = buildBusinessSnapshotFromAccounts(tenant.name, snap.accounts, hutangOpen);

      setOrgName(tenant.name);
      setTotalKas(biz.totalKas);
      setTotalHutang(hutangOpen);
      setPiutang(snap.accounts.filter(a => a.type === 'piutang').reduce((s, a) => s + a.current_balance, 0));
      setPersediaan(snap.accounts.filter(a => a.type === 'stok').reduce((s, a) => s + a.current_balance, 0));
      setAsetTetap(biz.asetTetap);
      setPrabayar(biz.prabayar || 0);
      setModal(biz.modal);
      setLabaDitahan(biz.labaDitahan);
      setCashflow(cf.map(c => c.net));
      setMtdLaba(reportBundle.profitLoss.netProfit);
      setPayrollOutstanding(
        payroll
          .filter(e => e.period_month === monthRange.from && (e.status === 'approved' || e.status === 'draft'))
          .reduce((s, e) => s + e.net_amount, 0),
      );
      setProjectsReadyClose(
        projects.filter(p => p.status === 'completed' && p.finance_status !== 'finance_closed').length,
      );
      void orgTotals;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat keuangan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, tenant?.name, monthRange.from, monthRange.to, projects]);

  useEffect(() => { void load(); }, [load]);

  const balanceCheck = useMemo(() => {
    if (!orgName) return null;
    return validateBusinessBalance({
      name: orgName,
      totalKas,
      totalHutang,
      modal,
      labaDitahan,
      asetTetap,
      totalAktiva: totalKas + piutang + persediaan + asetTetap + prabayar,
      ekuitas: modal + labaDitahan,
      piutangList: [{ amount: piutang }],
      assets: [{ value: asetTetap }],
      prabayar,
    });
  }, [orgName, totalKas, totalHutang, modal, labaDitahan, asetTetap, piutang, persediaan, prabayar]);

  const totalAktiva = totalKas + piutang + persediaan + asetTetap + prabayar;
  const totalPasiva = totalHutang + modal + labaDitahan;

  const growthPct = useMemo(() => {
    if (cashflow.length < 2) return null;
    const prev = cashflow[cashflow.length - 2];
    const last = cashflow[cashflow.length - 1];
    if (!prev) return null;
    return Math.round(((last - prev) / Math.abs(prev)) * 100);
  }, [cashflow]);

  const sparkData = useMemo(() => {
    if (cashflow.length >= 2) return cashflow;
    if (totalKas !== 0) return [totalKas * 0.3, totalKas * 0.35, totalKas * 0.32, totalKas * 0.38];
    return [30, 35, 32, 38];
  }, [cashflow, totalKas]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const balanceBadge = balanceCheck && (
    <button
      type="button"
      onClick={() => setBalanceOpen(true)}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-85 ${
        balanceCheck.isBalanced
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-rose-50 text-rose-700'
      }`}
    >
      {balanceCheck.isBalanced ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : null}
      {balanceCheck.isBalanced ? 'Balance' : 'Tidak Balance'}
    </button>
  );

  return (
    <div className="space-y-5">
      <div
        className="w-full rounded-2xl text-white p-6 shadow-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4C1D95, #6D28D9, #8B5CF6)' }}
      >
        <button
          type="button"
          onClick={() => navigate(`${BASE}/kasbank`)}
          className="w-full text-left hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            Total Kas Bisnis
          </div>
          <div className="text-[40px] font-black tracking-tight leading-none mb-2">
            {formatHeroKas(totalKas)}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Sparkline data={sparkData} color="white" variant="bars" width={160} />
            {growthPct != null && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                {growthPct >= 0 ? '+' : ''}{growthPct}% bulan ini
              </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate(`${BASE}/perencanaan`)}
          className="mt-3 text-xs font-semibold text-violet-200 hover:text-white underline-offset-2 hover:underline"
        >
          Perencanaan keuangan →
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate(`${BASE}/labarugi`)}
          className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="text-xs font-semibold text-slate-500 mb-1">Laba Bersih MTD</div>
          <div className={`text-xl font-black ${mtdLaba >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatRupiah(mtdLaba)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate(`${BASE}/operasional`)}
          className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1">
            <Users className="w-3.5 h-3.5" /> Gaji Outstanding
          </div>
          <div className="text-xl font-black text-amber-700">{formatRupiah(payrollOutstanding)}</div>
        </button>
        <button
          type="button"
          onClick={() => navigate(`${BASE}/kasbank`)}
          className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="text-xs font-semibold text-slate-500 mb-1">Arus Kas 30 Hari</div>
          <div className={`text-xl font-black ${(cashflow[cashflow.length - 1] || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatRupiah(cashflow[cashflow.length - 1] || 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate(`${BASE}/kasbank`)}
          className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1">
            <Lock className="w-3.5 h-3.5" /> Siap Tutup Keuangan
          </div>
          <div className="text-xl font-black text-violet-700">{projectsReadyClose} proyek</div>
        </button>
      </div>

      <NeracaGrid
        aktivaRows={[
          { label: 'Kas & Bank', value: totalKas, icon: 'wallet' },
          { label: 'Piutang Klien', value: piutang, icon: 'file' },
          { label: 'Persediaan', value: persediaan, icon: 'package' },
          { label: 'Aset Tetap', value: asetTetap, icon: 'hardhat' },
          ...(prabayar > 0 ? [{ label: 'Prabayar', value: prabayar, icon: 'card' as const }] : []),
        ]}
        pasivaRows={[
          { label: 'Total Hutang', value: totalHutang, icon: 'receipt', valueClass: 'text-rose-600' },
          { label: 'Modal', value: modal, icon: 'card' },
          { label: 'Laba Ditahan', value: labaDitahan, icon: 'trend', valueClass: 'text-emerald-600' },
        ]}
        totalAktiva={totalAktiva}
        totalPasiva={totalPasiva}
        balanceBadge={balanceBadge}
      />

      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <FolderKanban className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-800 text-sm">Ringkasan Per Proyek</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                <th className="text-left px-4 py-2 font-bold">Proyek</th>
                <th className="text-right px-4 py-2 font-bold">Nilai Kontrak</th>
                <th className="text-right px-4 py-2 font-bold">Realisasi</th>
                <th className="text-right px-4 py-2 font-bold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const spent = p.spent_amount || 0;
                const contract = p.total_budget_planned || p.contract_value || 0;
                const pct = contract > 0 ? Math.min(Math.round((spent / contract) * 100), 100) : 0;
                return (
                  <tr
                    key={p.id}
                    className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer"
                    onClick={() => navigate(`/app/projects/${p.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(contract)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold">{formatRupiah(spent)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2 min-w-[5rem] justify-end">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Belum ada proyek.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BalanceDiagnosisModal
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        check={balanceCheck}
      />
    </div>
  );
}
