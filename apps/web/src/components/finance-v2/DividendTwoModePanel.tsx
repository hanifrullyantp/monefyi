import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatFinanceRupiah } from '../../lib/financeV2Calc';
import {
  planBusinessModeDividend,
  planProjectModeDividend,
  type DividendMode,
} from '../../lib/financeV2/dividendModes';
import type { DividendParty } from '../../lib/projects/dividend';

interface ProjectSnapshotOption {
  projectId: string;
  projectName: string;
  revenue: number;
  hpp: number;
  contractValue: number;
}

interface Props {
  totalCash: number;
  monthlyPlannedOpex: number;
  labaDitahan: number;
  projects: ProjectSnapshotOption[];
}

const DEFAULT_PARTIES: DividendParty[] = [
  { id: 'owner-1', name: 'Pemilik Usaha', sharePct: 100, isOwner: true },
];

export default function DividendTwoModePanel({
  totalCash,
  monthlyPlannedOpex,
  labaDitahan,
  projects,
}: Props) {
  const [mode, setMode] = useState<DividendMode>('per_bisnis');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.projectId || '');
  const [requestedInput, setRequestedInput] = useState('');

  const selectedProject = useMemo(
    () => projects.find((p) => p.projectId === selectedProjectId) || projects[0] || null,
    [projects, selectedProjectId],
  );

  const requestedAmount = useMemo(() => {
    const parsed = Number(requestedInput.replace(/[^\d]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }, [requestedInput]);

  const businessPlan = useMemo(
    () =>
      planBusinessModeDividend({
        totalCash,
        monthlyPlannedOpex,
        labaDitahan,
        requestedAmount,
        parties: DEFAULT_PARTIES,
      }),
    [totalCash, monthlyPlannedOpex, labaDitahan, requestedAmount],
  );

  const projectPlan = useMemo(
    () =>
      selectedProject
        ? planProjectModeDividend({
            projectId: selectedProject.projectId,
            received: selectedProject.revenue,
            spent: selectedProject.hpp,
            totalPiutang: 0,
            ownerPiutang: 0,
            contractValue: selectedProject.contractValue || selectedProject.revenue,
            parties: DEFAULT_PARTIES,
            ownerPiutangByParty: {},
            payouts: [],
          })
        : null,
    [selectedProject],
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-slate-900">Simulasi Dividen (Ekuitas, Bukan Biaya)</h3>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('per_bisnis')}
            className={`px-3 py-1.5 rounded-lg ${mode === 'per_bisnis' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            Per Bisnis
          </button>
          <button
            type="button"
            onClick={() => setMode('per_proyek')}
            className={`px-3 py-1.5 rounded-lg ${mode === 'per_proyek' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
          >
            Per Proyek
          </button>
        </div>
      </div>

      {mode === 'per_bisnis' ? (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 rounded-xl p-3">
            <div>
              <div className="text-slate-500">Kas Tersedia</div>
              <div className="font-bold text-slate-900">{formatFinanceRupiah(totalCash)}</div>
            </div>
            <div>
              <div className="text-slate-500">Cadangan Opex (1×)</div>
              <div className="font-bold text-amber-700">{formatFinanceRupiah(businessPlan.opexReserve)}</div>
            </div>
            <div>
              <div className="text-slate-500">Laba Ditahan</div>
              <div className="font-bold text-slate-900">{formatFinanceRupiah(labaDitahan)}</div>
            </div>
            <div>
              <div className="text-slate-500">Maksimal Aman</div>
              <div className="font-black text-emerald-700">{formatFinanceRupiah(businessPlan.maxDistributable)}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-slate-600 font-semibold">Nominal rencana bagi (Rp):</label>
            <input
              type="text"
              inputMode="numeric"
              value={requestedInput}
              onChange={(e) => setRequestedInput(e.target.value)}
              placeholder={String(businessPlan.maxDistributable)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs w-full sm:w-56"
            />
            <span className="text-slate-500">Jurnal: Dr Dividen, Cr Kas</span>
          </div>
          {businessPlan.blockedReason && (
            <p className="text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{businessPlan.blockedReason}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label className="text-slate-600 font-semibold">Pilih Proyek:</label>
            <select
              value={selectedProject?.projectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
              ))}
            </select>
          </div>
          {projectPlan ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3">
              <div>
                <div className="text-slate-500">Kolam Kas Proyek</div>
                <div className="font-bold text-slate-900">{formatFinanceRupiah(projectPlan.projectPool)}</div>
              </div>
              <div>
                <div className="text-slate-500">Dividen Kas Siap Bayar</div>
                <div className="font-black text-emerald-700">{formatFinanceRupiah(projectPlan.totalCashOut)}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-semibold text-slate-700">
                  {projectPlan.blockedReason ? 'Belum memenuhi batas' : 'Siap diajukan'}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">Belum ada proyek dengan data keuangan.</p>
          )}
        </div>
      )}
    </section>
  );
}

