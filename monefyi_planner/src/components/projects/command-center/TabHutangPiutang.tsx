import { formatRupiah } from '../../../utils/projectUi';
import type { Project } from '../../../store/appStore';
import type { ProjectPiutangSummary, ProjectCashSummaryCards } from '../ProjectDetailHeader';

interface TabHutangPiutangProps {
  project: Project;
  piutangSummary: ProjectPiutangSummary;
  cashSummary: ProjectCashSummaryCards;
  piutangPanel: React.ReactNode;
  hutangPanel: React.ReactNode;
}

export default function TabHutangPiutang({
  project, piutangSummary, cashSummary, piutangPanel, hutangPanel,
}: TabHutangPiutangProps) {
  const net = piutangSummary.outstanding - cashSummary.debtOwed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SummaryCard label="Piutang (Klien→Kita)" value={formatRupiah(piutangSummary.outstanding)} tone={piutangSummary.outstanding > 0 ? 'warn' : 'good'} />
        <SummaryCard label="Hutang (Kita→Org)" value={formatRupiah(cashSummary.debtOwed)} tone={cashSummary.debtOwed > 0 ? 'warn' : 'good'} />
        <SummaryCard label="Posisi Bersih" value={formatRupiah(net)} tone={net >= 0 ? 'good' : 'bad'} />
        <SummaryCard label="Kontrak" value={formatRupiah(project.total_budget_planned)} tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 px-1">Piutang — {project.client_name || 'Klien'}</h3>
          {piutangPanel}
        </div>
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-800 px-1">Hutang Proyek</h3>
          {hutangPanel}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const tones = {
    good: 'border-emerald-200 bg-emerald-50/30',
    warn: 'border-amber-200 bg-amber-50/30',
    bad: 'border-rose-200 bg-rose-50/30',
    neutral: 'border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="text-base font-black font-mono text-slate-900">{value}</div>
    </div>
  );
}
