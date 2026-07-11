import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Loader2, X } from 'lucide-react';
import type { Project } from '../../../store/appStore';
import { formatRupiah } from '../../../utils/projectUi';
import { getProjectCashSummary } from '../../../services/projectTransferService';
import { loadRapItems, rapActualsFromCosts, rapSummary } from '../../../services/rapService';
import { aggregateCostByRapItem } from '../../../services/costService';

interface GanttMiniProjectDashboardProps {
  project: Project;
  orgId: string;
  onClose: () => void;
  onOpenDetail: () => void;
}

interface CostSplit {
  bahanPlanned: number;
  tukangPlanned: number;
  bahanActual: number;
  tukangActual: number;
}

function ProgressBar({
  label,
  value,
  color,
  subBars,
}: {
  label: string;
  value: number;
  color: string;
  subBars?: { label: string; pct: number; color: string }[];
}) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-slate-600">{label}</span>
        <span className="text-[11px] font-black text-slate-800">{Math.round(pct)}%</span>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        {subBars?.length ? (
          <div className="absolute inset-0 flex">
            {subBars.map(bar => (
              <div
                key={bar.label}
                className="h-full transition-all"
                style={{ width: `${Math.min(100, bar.pct)}%`, backgroundColor: bar.color }}
                title={`${bar.label}: ${Math.round(bar.pct)}%`}
              />
            ))}
          </div>
        ) : (
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        )}
      </div>
    </div>
  );
}

/**
 * Compact project dashboard popup from Gantt bar double-click.
 */
export default function GanttMiniProjectDashboard({
  project,
  orgId,
  onClose,
  onOpenDetail,
}: GanttMiniProjectDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [saldo, setSaldo] = useState(0);
  const [piutang, setPiutang] = useState(0);
  const [hutang, setHutang] = useState(0);
  const [costSplit, setCostSplit] = useState<CostSplit>({
    bahanPlanned: 0,
    tukangPlanned: 0,
    bahanActual: 0,
    tukangActual: 0,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [cash, rapItems, rapActuals] = await Promise.all([
          getProjectCashSummary(project.id, orgId, project.name, project.spent_amount),
          loadRapItems(project.id),
          aggregateCostByRapItem(project.id),
        ]);
        if (cancelled) return;

        setSaldo(cash.surplus);
        setPiutang(cash.owedFrom.reduce((s, d) => s + d.amount, 0));
        setHutang(cash.owedTo.reduce((s, d) => s + d.amount, 0));

        const actualByType = rapActualsFromCosts(rapItems, rapActuals);
        const summary = rapSummary(rapItems, actualByType);

        const findType = (name: string) =>
          summary.find(s => s.name.toLowerCase().includes(name.toLowerCase()));

        const bahan = findType('material') || findType('bahan');
        const tukang = findType('labor') || findType('tukang');

        setCostSplit({
          bahanPlanned: (bahan?.planned || 0) * 1_000_000,
          tukangPlanned: (tukang?.planned || 0) * 1_000_000,
          bahanActual: (bahan?.actual || 0) * 1_000_000,
          tukangActual: (tukang?.actual || 0) * 1_000_000,
        });
      } catch (e) {
        console.error('Mini dashboard load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [project.id, orgId, project.name, project.spent_amount]);

  const budgetPlanned = project.total_budget_planned || costSplit.bahanPlanned + costSplit.tukangPlanned;
  const budgetActual = project.spent_amount;
  const costProgress = budgetPlanned ? (budgetActual / budgetPlanned) * 100 : 0;
  const workProgress = project.progress_percentage || 0;

  const bahanPct = budgetPlanned ? (costSplit.bahanActual / budgetPlanned) * 100 : 0;
  const tukangPct = budgetPlanned ? (costSplit.tukangActual / budgetPlanned) * 100 : 0;

  const planningPct = useMemo(() => {
    if (!budgetPlanned) return 0;
    const plannedTotal = costSplit.bahanPlanned + costSplit.tukangPlanned;
    return plannedTotal ? Math.min(100, (plannedTotal / budgetPlanned) * 100) : 100;
  }, [budgetPlanned, costSplit.bahanPlanned, costSplit.tukangPlanned]);

  return (
    <div className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Dashboard Mini</p>
            <h3 className="font-black text-slate-900 truncate">{project.name}</h3>
            <p className="text-xs text-slate-500 truncate">{project.client_name}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenDetail}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Buka detail proyek"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-700">Total Saldo</p>
              <p className="text-xl font-black text-emerald-800">{formatRupiah(saldo)}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Bahan</p>
                <p className="text-xs font-black text-slate-800">{formatRupiah(costSplit.bahanActual)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Tukang</p>
                <p className="text-xs font-black text-slate-800">{formatRupiah(costSplit.tukangActual)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Piutang</p>
                <p className="text-xs font-black text-amber-700">{formatRupiah(piutang)}</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-2">
                <p className="text-[9px] font-bold text-rose-600 uppercase">Hutang</p>
                <p className="text-xs font-black text-rose-700">{formatRupiah(hutang)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <ProgressBar label="Progress Pekerjaan" value={workProgress} color="#3B82F6" />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-600">Progress Biaya</span>
                  <div className="text-[10px] text-right leading-tight">
                    <div className="text-slate-500">Planning <span className="font-bold text-slate-700">{Math.round(planningPct)}%</span></div>
                    <div className="text-slate-500">Realisasi <span className="font-bold text-emerald-700">{Math.round(costProgress)}%</span></div>
                  </div>
                </div>
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-300/60 rounded-full"
                    style={{ width: `${Math.min(100, planningPct)}%` }}
                  />
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full bg-amber-500/90"
                      style={{ width: `${Math.min(100, bahanPct)}%` }}
                      title={`Bahan ${Math.round(bahanPct)}%`}
                    />
                    <div
                      className="h-full bg-orange-500/90"
                      style={{ width: `${Math.min(100, tukangPct)}%` }}
                      title={`Tukang ${Math.round(tukangPct)}%`}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-slate-500">
                  <span>Bahan {Math.round(bahanPct)}%</span>
                  <span>Tukang {Math.round(tukangPct)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
