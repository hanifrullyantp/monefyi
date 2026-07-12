import { useEffect, useMemo, useState } from 'react';
import {
  FileSignature, Calculator, Wallet, TrendingUp, AlertTriangle, CheckCircle2,
  Package, HardHat, Search, Filter,
} from 'lucide-react';
import RapEditableTable from '../RapEditableTable';
import type { RapItem } from '../../../services/rapService';
import type { RapActualAgg } from '../../../services/costService';
import { loadMaterials } from '../../../services/rpp/materialService';
import { useAppStore } from '../../../store/appStore';
import type { NormalizedProjectView } from '../../../lib/migration/project-normalize';
import { formatRupiah } from '../../../utils/projectUi';
import WorkItemRow from '../../sandbox-ui/WorkItemRow';
import StatCard from '../../sandbox-ui/StatCard';

type Props = {
  projectId: string;
  normalized: NormalizedProjectView;
  rapItems: RapItem[];
  rapActuals: Record<string, RapActualAgg>;
  onRefresh: () => Promise<void>;
  userId: string;
};

export default function TabV2Rap({
  projectId, normalized, rapItems, rapActuals, onRefresh, userId,
}: Props) {
  const { tenant } = useAppStore();
  const [materialSuggestions, setMaterialSuggestions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const p = normalized.project;

  useEffect(() => {
    if (!tenant?.id) return;
    loadMaterials(tenant.id)
      .then(rows => setMaterialSuggestions(rows.map(r => r.name)))
      .catch(() => setMaterialSuggestions([]));
  }, [tenant?.id]);

  const rapPct = p.contractValue > 0 ? ((p.rap.totalRAP / p.contractValue) * 100) : 0;
  const realisasiPct = p.contractValue > 0 ? ((p.rap.realisasi / p.contractValue) * 100) : 0;
  const overBudget = realisasiPct > rapPct;

  const materials = useMemo(() =>
    p.rap.materials.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())),
  [p.rap.materials, search]);

  const workers = useMemo(() =>
    p.rap.workers.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase())),
  [p.rap.workers, search]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Nilai Kontrak" value={formatRupiah(p.contractValue)} icon={FileSignature}
          iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Total RAP" value={formatRupiah(p.rap.totalRAP)} icon={Calculator}
          iconBg="bg-slate-50" iconColor="text-slate-600" />
        <StatCard label="Realisasi" value={formatRupiah(p.rap.realisasi)} icon={Wallet}
          iconBg="bg-rose-50" iconColor="text-rose-600" />
        <StatCard label="Est. Laba" value={formatRupiah(p.rap.estLaba)} icon={TrendingUp}
          iconBg="bg-emerald-50" iconColor="text-emerald-600" barVariant="success" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex justify-between text-xs font-bold mb-2">
          <span className="text-blue-600">RAP {rapPct.toFixed(0)}%</span>
          <span className="text-rose-600">Realisasi {realisasiPct.toFixed(0)}%</span>
        </div>
        <div className="relative h-5 bg-slate-100 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-blue-200 border-2 border-blue-500 rounded-full"
            style={{ width: `${Math.min(rapPct, 100)}%` }} />
          <div className="absolute inset-y-0 left-0 bg-rose-500 rounded-full"
            style={{ width: `${Math.min(realisasiPct, 100)}%` }} />
        </div>
        <div className={`flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-sm font-semibold ${
          overBudget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {overBudget ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {overBudget
            ? `Realisasi melebihi RAP ${(realisasiPct - rapPct).toFixed(0)}%`
            : 'Realisasi masih dalam batas RAP'}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Package className="w-5 h-5 text-slate-500" /> Material
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari..."
                className="pl-8 pr-3 py-1.5 text-xs border rounded-lg w-36" />
            </div>
            <button type="button" className="p-1.5 hover:bg-slate-100 rounded-lg" title="Filter">
              <Filter className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
        {materials.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Belum ada material.</p>
        ) : materials.map((item, idx) => (
          <WorkItemRow key={`m-${idx}`} item={item} showMenu={false} />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-slate-800 px-5 py-4 border-b">
          <HardHat className="w-5 h-5 text-slate-500" /> Tenaga Kerja
        </div>
        {workers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Belum ada tenaga kerja.</p>
        ) : workers.map((item, idx) => (
          <WorkItemRow key={`w-${idx}`} item={item} showMenu={false} />
        ))}
      </div>

      <RapEditableTable
        projectId={projectId}
        items={rapItems}
        rapActuals={rapActuals}
        mode="planning"
        canManage
        recordedBy={userId}
        onRefresh={onRefresh}
        materialSuggestions={materialSuggestions}
      />
    </div>
  );
}
