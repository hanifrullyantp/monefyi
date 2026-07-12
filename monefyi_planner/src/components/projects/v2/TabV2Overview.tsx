import type { Project } from '../../../store/appStore';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { formatRupiah } from '../../../utils/projectUi';

type Props = {
  normalized: NormalizedProjectView;
  project: Project;
};

export default function TabV2Overview({ normalized, project }: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Stat label="Nilai Kontrak" value={formatRupiah(project.total_budget_planned)} />
      <Stat label="Realisasi" value={formatRupiah(normalized.totalRealisasi)} />
      <Stat label="Dana Masuk" value={formatRupiah(normalized.totalPemasukan)} />
      <Stat label="Est. Laba" value={formatRupiah(normalized.estLaba)} />
      <Stat label="Progress" value={`${project.progress_percentage.toFixed(0)}%`} />
      <Stat label="Sisa Kontrak" value={formatRupiah(normalized.sisaKontrak)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4">
      <div className="text-xs text-slate-500 font-semibold uppercase">{label}</div>
      <div className="text-lg font-black text-slate-900 mt-1">{value}</div>
    </div>
  );
}
