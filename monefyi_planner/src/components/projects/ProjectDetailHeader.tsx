import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, RefreshCw, X } from 'lucide-react';
import type { Project } from '../../store/appStore';
import { formatDateId, formatRupiah, HEALTH_CONFIG, STATUS_LABEL } from '../../utils/projectUi';

interface ProjectDetailHeaderProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  daysLeft: number;
  budgetPct: number;
  opi: string;
  loading: boolean;
  collapse: number;
  onClose: () => void;
  onRefresh: () => void;
  onHeaderTap: () => void;
}

export default function ProjectDetailHeader({
  project,
  health,
  daysLeft,
  budgetPct,
  opi,
  loading,
  collapse,
  onClose,
  onRefresh,
  onHeaderTap,
}: ProjectDetailHeaderProps) {
  const expanded = 1 - collapse;

  return (
    <div
      className={`shrink-0 sticky top-0 z-50 transition-shadow duration-200 ${
        collapse > 0.5 ? 'shadow-lg glass' : ''
      }`}
      onClick={collapse > 0.5 ? onHeaderTap : undefined}
      role={collapse > 0.5 ? 'button' : undefined}
    >
      <motion.div
        className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white overflow-hidden"
        style={{ minHeight: collapse > 0.5 ? 64 : undefined }}
      >
        {/* Collapsed bar — mobile */}
        <motion.div
          className="lg:hidden flex items-center gap-2 px-3 py-2.5"
          style={{ opacity: collapse, pointerEvents: collapse > 0.5 ? 'auto' : 'none' }}
          animate={{ height: collapse > 0.5 ? 'auto' : 0 }}
        >
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1.5 hover:bg-white/20 rounded-lg shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate tracking-tight">{project.name}</div>
            <div className="flex items-center gap-2 text-[10px] text-indigo-100">
              <span className="px-1.5 py-0.5 rounded bg-white/20">{STATUS_LABEL[project.status]}</span>
              <span>💰 {Math.round(budgetPct)}%</span>
              <span>📅 {daysLeft > 0 ? `${daysLeft}d` : 'Lewat'}</span>
            </div>
          </div>
          <div className="w-20 shrink-0">
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${project.progress_percentage}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-right mt-0.5">{project.progress_percentage.toFixed(0)}%</div>
          </div>
        </motion.div>

        {/* Expanded header */}
        <motion.div
          className="p-5 md:p-6"
          style={{
            opacity: expanded,
            maxHeight: expanded > 0.05 ? 400 : 0,
            overflow: 'hidden',
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md">{project.code}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20">{health.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 uppercase">{STATUS_LABEL[project.status]}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold truncate tracking-tight">{project.name}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-indigo-100 text-xs">
                {project.client_name && <span>{project.client_name}</span>}
                {project.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateId(project.start_date)} – {formatDateId(project.end_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={onRefresh} className="p-2 hover:bg-white/20 rounded-xl hidden lg:flex" aria-label="Refresh">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Tutup">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4 lg:hidden">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${project.progress_percentage} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black font-mono">
                {project.progress_percentage.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 rounded-2xl p-4 border border-white/10">
            {[
              { label: 'Progress', value: `${project.progress_percentage.toFixed(0)}%` },
              { label: 'Budget', value: `${Math.round(budgetPct)}%` },
              { label: 'Sisa Hari', value: daysLeft > 0 ? `${daysLeft}d` : 'Lewat' },
              { label: 'OPI', value: opi },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className="text-xs text-indigo-100 mb-0.5 uppercase tracking-wider">{m.label}</div>
                <div className="text-xl font-black font-mono">{m.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
