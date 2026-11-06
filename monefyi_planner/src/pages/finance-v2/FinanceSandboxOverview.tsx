import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  Building2,
  FolderKanban,
  TrendingUp,
  CheckCircle2,
  Users,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { useAppStore, type Project } from '../../store/appStore';
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
import FinanceIntegrationPanel from '../../components/finance-v2/FinanceIntegrationPanel';
import { ToolRow, ListCard } from '../../components/common';
import ProjectTransactionModals, { type ModalKind } from '../../components/projects/v2/ProjectTransactionModals';

const BASE = '/app/finance-v2';

function formatHeroKas(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('id-ID');
  return amount < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

export default function FinanceSandboxOverview() {
  const navigate = useNavigate();
  const { tenant, projects, user } = useAppStore();
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

  // Mobile interactive state
  const [neracaMobileOpen, setNeracaMobileOpen] = useState(false);
  const [chipFilter, setChipFilter] = useState<'all' | 'over_contract'>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [txModal, setTxModal] = useState<{
    open: boolean;
    kind: ModalKind;
    project: Project | null;
  }>({ open: false, kind: null, project: null });

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
      setPiutang(
        snap.accounts.filter(a => a.type === 'piutang').reduce((s, a) => s + a.current_balance, 0),
      );
      setPersediaan(
        snap.accounts.filter(a => a.type === 'stok').reduce((s, a) => s + a.current_balance, 0),
      );
      setAsetTetap(biz.asetTetap);
      setPrabayar(biz.prabayar || 0);
      setModal(biz.modal);
      setLabaDitahan(biz.labaDitahan);
      setCashflow(cf.map(c => c.net));
      setMtdLaba(reportBundle.profitLoss.netProfit);
      setPayrollOutstanding(
        payroll
          .filter(
            e => e.period_month === monthRange.from && (e.status === 'approved' || e.status === 'draft'),
          )
          .reduce((s, e) => s + e.net_amount, 0),
      );
      setProjectsReadyClose(
        projects.filter(p => p.status === 'completed' && p.finance_status !== 'finance_closed')
          .length,
      );
      void orgTotals;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal memuat keuangan', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, tenant?.name, monthRange.from, monthRange.to, projects]);

  useEffect(() => {
    void load();
  }, [load]);

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

  // Project filtering for mobile list
  const overContractProjects = useMemo(() => {
    return projects.filter(p => {
      const contract = p.total_budget_planned || p.contract_value || 0;
      const spent = p.spent_amount || 0;
      return contract > 0 && spent > contract;
    });
  }, [projects]);

  const filteredMobileProjects = useMemo(() => {
    return projects.filter(p => {
      const contract = p.total_budget_planned || p.contract_value || 0;
      const spent = p.spent_amount || 0;
      if (chipFilter === 'over_contract' && !(contract > 0 && spent > contract)) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.client_name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, chipFilter, search]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const balanceBadge = balanceCheck && (
    <button
      type="button"
      onClick={() => setBalanceOpen(true)}
      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-opacity hover:opacity-85 ${
        balanceCheck.isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {balanceCheck.isBalanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      {balanceCheck.isBalanced ? 'Balance' : 'Tidak Balance'}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ─── MOBILE VIEW (Design Redesign Mobile) ─── */}
      <div className="md:hidden space-y-3 max-w-[420px] mx-auto">
        {/* Hero Biru: TOTAL KAS BISNIS */}
        <div className="relative overflow-hidden rounded-[20px] p-4 text-white bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#2563EB] shadow-[0_14px_28px_-14px_rgba(29,78,216,0.75)]">
          <div
            aria-hidden="true"
            className="absolute -right-9 -top-12 w-36 h-36 rounded-full bg-white/10 pointer-events-none"
          />
          <div className="relative flex items-center justify-between">
            <div className="text-[11px] font-bold text-[#DBEAFE] tracking-[0.06em] uppercase">
              TOTAL KAS BISNIS
            </div>
            {totalKas < 0 && (
              <span className="text-[10px] font-extrabold text-[#FDE68A] bg-amber-400/20 border border-amber-300/50 px-2 py-0.5 rounded-full">
                KAS NEGATIF
              </span>
            )}
          </div>
          <div className="relative text-3xl font-extrabold tracking-tight mt-1.5 tabular-nums">
            {formatHeroKas(totalKas)}
          </div>

          {/* Mini Sparkline / Indicator */}
          <div className="relative flex items-center gap-2 mt-2">
            <Sparkline data={sparkData} color="white" variant="bars" width={140} height={20} />
            {growthPct != null && (
              <span className="text-xs font-semibold text-[#DBEAFE]">
                {growthPct >= 0 ? '+' : ''}
                {growthPct}% bulan ini
              </span>
            )}
          </div>

          {/* 2 Bottom Metrics inside Hero */}
          <div className="relative grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/20">
            <div>
              <div className="text-[10px] font-bold text-[#DBEAFE] tracking-[0.05em] uppercase">
                GAJI OUTSTANDING
              </div>
              <div className="text-base font-extrabold mt-0.5 tabular-nums">
                {formatRupiah(payrollOutstanding)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#DBEAFE] tracking-[0.05em] uppercase">
                ARUS KAS 30 HARI
              </div>
              <div className="text-base font-extrabold mt-0.5 tabular-nums">
                {formatRupiah(cashflow[cashflow.length - 1] || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* 2 Kartu di Bawah Hero (Laba Bersih MTD & Siap Tutup) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Laba Bersih MTD */}
          <div className="bg-white border border-[#E5EAE8] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-[#5B6B7A] tracking-[0.05em] uppercase">
              LABA BERSIH MTD
            </div>
            <div
              className={`text-lg font-extrabold mt-1.5 tabular-nums truncate ${
                mtdLaba >= 0 ? 'text-[#047857]' : 'text-[#BE123C]'
              }`}
            >
              {formatRupiah(mtdLaba)}
            </div>
            <div className="text-[11px] text-[#5B6B7A] mt-0.5">bulan berjalan</div>
          </div>

          {/* Siap Tutup Keuangan */}
          <button
            type="button"
            onClick={() => navigate(`${BASE}/kasbank`)}
            className="relative overflow-hidden text-left border-0 rounded-2xl p-3.5 text-white bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] shadow-[0_10px_20px_-12px_rgba(109,40,217,0.8)] flex flex-col justify-between active:scale-95 transition-transform"
          >
            <span
              aria-hidden="true"
              className="absolute -right-5 -top-6 w-20 h-20 rounded-full bg-white/10 pointer-events-none"
            />
            <div className="relative flex items-center justify-between text-[10px] font-bold text-[#EDE9FE] tracking-[0.05em] uppercase">
              <span>SIAP TUTUP</span>
              <span className="text-base leading-none">›</span>
            </div>
            <div className="relative text-lg font-extrabold mt-1.5 tabular-nums">
              {projectsReadyClose} proyek
            </div>
            <div className="relative text-[11px] text-[#EDE9FE] mt-0.5">
              ketuk untuk menutup
            </div>
          </button>
        </div>

        {/* Integrasi Jurnal Panel */}
        {tenant?.id && (
          <FinanceIntegrationPanel orgId={tenant.id} userId={user?.id} compact />
        )}

        {/* Neraca Bisnis (Collapsible) */}
        <div className="bg-white border border-[#E5EAE8] rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setNeracaMobileOpen(prev => !prev)}
            aria-expanded={neracaMobileOpen}
            className="w-full border-0 bg-transparent p-3.5 flex items-center justify-between text-left active:bg-slate-50 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-[#0F172A]">Neraca Bisnis</span>
                {balanceCheck && (
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                      balanceCheck.isBalanced
                        ? 'bg-[#ECFDF5] text-[#047857]'
                        : 'bg-[#FFF1F2] text-[#BE123C]'
                    }`}
                  >
                    {balanceCheck.isBalanced ? '✓ Balance' : '⚠ Perlu Cek'}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#5B6B7A] mt-1 truncate">
                Aktiva {formatHeroKas(totalAktiva)} = Pasiva + Ekuitas {formatHeroKas(totalPasiva)}
              </div>
            </div>
            <span
              className={`w-7 h-7 rounded-full bg-[#F1F5F4] flex items-center justify-center shrink-0 text-slate-700 transition-transform duration-200 ml-2 ${
                neracaMobileOpen ? 'rotate-180' : ''
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>

          {neracaMobileOpen && (
            <div className="border-t border-[#E5EAE8] p-3.5 space-y-3 bg-[#FAFCFB] text-xs">
              {/* Aktiva */}
              <div>
                <div className="text-[11px] font-extrabold text-[#5B6B7A] tracking-[0.06em] uppercase mb-1">
                  AKTIVA
                </div>
                <div className="divide-y divide-[#EDF1EF]">
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Kas & Bank</span>
                    <b className={totalKas < 0 ? 'text-[#BE123C]' : 'text-slate-900'}>
                      {formatHeroKas(totalKas)}
                    </b>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Piutang Klien</span>
                    <b className="text-slate-900">{formatRupiah(piutang)}</b>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Persediaan</span>
                    <b className="text-slate-900">{formatRupiah(persediaan)}</b>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Aset Tetap</span>
                    <b className="text-slate-900">{formatRupiah(asetTetap)}</b>
                  </div>
                  {prabayar > 0 && (
                    <div className="flex justify-between py-1.5 text-slate-600">
                      <span>Prabayar</span>
                      <b className="text-slate-900">{formatRupiah(prabayar)}</b>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-extrabold text-[#0F172A] text-sm">
                    <span>TOTAL AKTIVA</span>
                    <span className={totalAktiva < 0 ? 'text-[#BE123C]' : ''}>
                      {formatHeroKas(totalAktiva)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pasiva + Ekuitas */}
              <div className="pt-2 border-t border-[#E5EAE8]">
                <div className="text-[11px] font-extrabold text-[#5B6B7A] tracking-[0.06em] uppercase mb-1">
                  PASIVA + EKUITAS
                </div>
                <div className="divide-y divide-[#EDF1EF]">
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Total Hutang</span>
                    <b className="text-[#BE123C]">{formatRupiah(totalHutang)}</b>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Modal</span>
                    <b className="text-slate-900">{formatRupiah(modal)}</b>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Laba Ditahan</span>
                    <b className={labaDitahan < 0 ? 'text-[#BE123C]' : 'text-[#047857]'}>
                      {formatHeroKas(labaDitahan)}
                    </b>
                  </div>
                  <div className="flex justify-between pt-2 font-extrabold text-[#0F172A] text-sm">
                    <span>TOTAL PASIVA + EKUITAS</span>
                    <span className={totalPasiva < 0 ? 'text-[#BE123C]' : ''}>
                      {formatHeroKas(totalPasiva)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Chips: Semua & Realisasi Melebihi Kontrak */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setChipFilter('all')}
            className={`h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              chipFilter === 'all'
                ? 'bg-[#0F172A] text-white shadow-xs'
                : 'bg-white border border-[#E5EAE8] text-[#334155]'
            }`}
          >
            <span>Semua</span>
            <span className={chipFilter === 'all' ? 'text-white/80' : 'text-[#8A99A6]'}>
              {projects.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              setChipFilter(prev => (prev === 'over_contract' ? 'all' : 'over_contract'))
            }
            className={`h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              chipFilter === 'over_contract'
                ? 'bg-[#BE123C] text-white shadow-xs'
                : 'bg-white border border-[#E5EAE8] text-[#BE123C]'
            }`}
          >
            <span>Realisasi melebihi kontrak</span>
            <span
              className={chipFilter === 'over_contract' ? 'text-white/80' : 'text-[#BE123C]/80'}
            >
              {overContractProjects.length}
            </span>
          </button>
        </div>

        {/* Tool Row */}
        <ToolRow
          title="Proyek"
          count={filteredMobileProjects.length}
          search={search}
          searchOpen={searchOpen}
          onSearchOpen={() => setSearchOpen(true)}
          onSearchClose={() => {
            setSearchOpen(false);
            setSearch('');
          }}
          onSearchChange={setSearch}
          searchPlaceholder="Cari proyek..."
          showResetFilter={chipFilter !== 'all' || search.length > 0}
          onResetFilter={() => {
            setChipFilter('all');
            setSearch('');
          }}
        />

        {/* List of Projects (Expandable ListCard, replaces old wide table!) */}
        <div className="space-y-2">
          {filteredMobileProjects.length === 0 ? (
            <div className="bg-white border border-[#E5EAE8] rounded-2xl p-6 text-center text-sm text-[#5B6B7A]">
              Tidak ada proyek yang sesuai filter.
            </div>
          ) : (
            filteredMobileProjects.map(p => {
              const spent = p.spent_amount || 0;
              const contract = p.total_budget_planned || p.contract_value || 0;
              const pct = contract > 0 ? Math.round((spent / contract) * 100) : 0;
              const isOver = spent > contract;
              const diff = contract - spent;

              return (
                <ListCard
                  key={p.id}
                  id={p.id}
                  indicatorColor={isOver ? '#EF4444' : pct > 90 ? '#F59E0B' : '#1D4ED8'}
                  title={p.name}
                  subtitle={`Kontrak ${formatRupiah(contract)}`}
                  valueText={formatRupiah(spent)}
                  progressText={`${pct}%`}
                  onClick={() => navigate(`/app/projects/${p.id}`)}
                  metrics={[
                    {
                      label: 'NILAI KONTRAK',
                      value: formatRupiah(contract),
                    },
                    {
                      label: 'REALISASI',
                      value: formatRupiah(spent),
                      valueColor: isOver ? '#BE123C' : '#0F172A',
                    },
                    {
                      label: diff < 0 ? 'OVERBUDGET' : 'SISA BUDGET',
                      value: formatRupiah(Math.abs(diff)),
                      valueColor: diff < 0 ? '#BE123C' : '#047857',
                    },
                  ]}
                  progressPercent={pct}
                  progressBarColor={isOver ? '#EF4444' : pct > 90 ? '#F59E0B' : '#1D4ED8'}
                  progressLabel="Realisasi vs Kontrak"
                  progressDetailText={`Terpakai ${pct}% dari nilai kontrak`}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/app/projects/${p.id}`);
                        }}
                        className="flex-1 h-11 rounded-xl bg-[#1D4ED8] text-white font-bold text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        Buka keuangan proyek
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setTxModal({ open: true, kind: 'cost', project: p });
                        }}
                        className="flex-1 h-11 rounded-xl border border-[#D5DDDA] bg-white text-[#0F172A] font-semibold text-xs flex items-center justify-center active:scale-95 transition-transform"
                      >
                        Catat transaksi
                      </button>
                    </>
                  }
                />
              );
            })
          )}
        </div>
      </div>

      {/* ─── DESKTOP VIEW (Preserve full desktop UI) ─── */}
      <div className="hidden md:block space-y-5">
        <div
          className="w-full rounded-2xl text-white p-6 shadow-lg relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1E3A8A, #1D4ED8, #2563EB)' }}
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
                  {growthPct >= 0 ? '+' : ''}
                  {growthPct}% bulan ini
                </span>
              )}
            </div>
          </button>
        </div>

        {tenant?.id && (
          <FinanceIntegrationPanel orgId={tenant.id} userId={user?.id} compact />
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => navigate(`${BASE}/labarugi`)}
            className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-xs font-semibold text-slate-500 mb-1">Laba Bersih MTD</div>
            <div
              className={`text-xl font-black ${
                mtdLaba >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
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
            <div className="text-xl font-black text-amber-700">
              {formatRupiah(payrollOutstanding)}
            </div>
          </button>
          <button
            type="button"
            onClick={() => navigate(`${BASE}/kasbank`)}
            className="bg-white rounded-2xl border border-slate-100 p-4 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-xs font-semibold text-slate-500 mb-1">Arus Kas 30 Hari</div>
            <div
              className={`text-xl font-black ${
                (cashflow[cashflow.length - 1] || 0) >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}
            >
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
            <div className="text-xl font-black text-violet-700">
              {projectsReadyClose} proyek
            </div>
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
            {
              label: 'Total Hutang',
              value: totalHutang,
              icon: 'receipt',
              valueClass: 'text-rose-600',
            },
            { label: 'Modal', value: modal, icon: 'card' },
            {
              label: 'Laba Ditahan',
              value: labaDitahan,
              icon: 'trend',
              valueClass: 'text-emerald-600',
            },
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
                      <td className="px-4 py-3 text-right text-rose-600 font-semibold">
                        {formatRupiah(spent)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 min-w-[5rem] justify-end">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Belum ada proyek.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BalanceDiagnosisModal
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        check={balanceCheck}
      />

      {/* Transaction Modal */}
      {txModal.open && txModal.project && tenant?.id && user?.id && (
        <ProjectTransactionModals
          open={txModal.open}
          kind={txModal.kind}
          onClose={() => setTxModal({ open: false, kind: null, project: null })}
          project={txModal.project}
          orgId={tenant.id}
          userId={user.id}
          canManage={true}
          onUpdated={() => {
            setTxModal({ open: false, kind: null, project: null });
            void load();
          }}
        />
      )}
    </div>
  );
}
