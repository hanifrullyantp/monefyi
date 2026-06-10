import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import type { Project } from '../../store/appStore';
import { formatRupiah, HEALTH_CONFIG } from '../../utils/projectUi';

interface Props {
  projects: Project[];
  onOpenProject?: (id: string) => void;
  onViewAll: () => void;
  onCreateProject?: () => void;
  canCreate?: boolean;
}

const healthBorder: Record<Project['health_status'], string> = {
  on_track: 'border-l-emerald-500',
  at_risk: 'border-l-amber-500',
  behind: 'border-l-rose-500',
  ahead: 'border-l-blue-500',
};

export default function DashboardProjectList({
  projects,
  onOpenProject,
  onViewAll,
  onCreateProject,
  canCreate,
}: Props) {
  const list = projects.filter(p => p.status !== 'archived').slice(0, 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Daftar Proyek</h2>
        <button type="button" onClick={onViewAll} className="text-xs font-semibold text-emerald-600 underline">
          Lihat Semua →
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6 bg-white rounded-xl border border-dashed">Belum ada proyek.</p>
        ) : list.map((proj, i) => {
          const daysLeft = Math.ceil((new Date(proj.end_date).getTime() - Date.now()) / 86400000);
          const budgetPct = proj.total_budget_planned
            ? (proj.spent_amount / proj.total_budget_planned) * 100
            : 0;
          const hc = HEALTH_CONFIG[proj.health_status];

          return (
            <motion.button
              key={proj.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onOpenProject?.(proj.id)}
              className={`w-full text-left bg-white rounded-xl p-4 border border-slate-100 border-l-4 ${healthBorder[proj.health_status]} shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${hc.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{proj.name}</div>
                  {proj.client_name && <div className="text-xs text-slate-500 truncate">{proj.client_name}</div>}
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proj.progress_percentage}%` }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                    <span>💰 {Math.round(budgetPct)}%</span>
                    <span>📅 {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Lewat'}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {canCreate && onCreateProject && (
        <button
          type="button"
          onClick={onCreateProject}
          className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Buat Proyek Baru
        </button>
      )}

      <button
        type="button"
        onClick={onViewAll}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-200/50"
      >
        <span>📁 Kelola Semua Proyek</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
}
