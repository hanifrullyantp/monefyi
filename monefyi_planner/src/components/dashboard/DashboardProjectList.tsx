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
        <h2 className="font-bold text-[#0F172A] text-sm uppercase tracking-wide">Daftar Proyek</h2>
        <button type="button" onClick={onViewAll} className="text-xs font-semibold text-[#059669] hover:underline">
          Lihat Semua →
        </button>
      </div>

      <div className="space-y-2">
        {list.length === 0 ? (
          <p className="text-sm text-[#5B6B7A] text-center py-6 bg-white rounded-2xl border border-dashed border-[#E5EAE8]">Belum ada proyek.</p>
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
              className={`w-full text-left bg-white rounded-2xl p-4 border border-[#E5EAE8] border-l-4 ${healthBorder[proj.health_status]} shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${hc.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#0F172A] text-sm truncate">{proj.name}</div>
                  {proj.client_name && <div className="text-xs text-[#5B6B7A] truncate mt-0.5">{proj.client_name}</div>}
                  <div className="mt-2.5 h-1.5 bg-[#F4F7F5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#059669] rounded-full" style={{ width: `${proj.progress_percentage}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-[11px] text-[#5B6B7A] font-medium">
                    <span>Budget {Math.round(budgetPct)}%</span>
                    <span>Deadline: {daysLeft > 0 ? `${daysLeft} hari lagi` : 'Lewat'}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#5B6B7A] shrink-0" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {canCreate && onCreateProject && (
        <button
          type="button"
          onClick={onCreateProject}
          className="w-full h-11 border-2 border-dashed border-[#A7F3D0] text-[#059669] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Buat Proyek Baru
        </button>
      )}

      <button
        type="button"
        onClick={onViewAll}
        className="w-full h-11 rounded-xl bg-[#059669] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-[#047857] transition-colors"
      >
        <span>Kelola Semua Proyek</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
}
