import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, MapPin, RefreshCw, X, ChevronsUp, ChevronsDown,
} from 'lucide-react';
import type { Project } from '../../store/appStore';
import { formatDateId, HEALTH_CONFIG, STATUS_LABEL } from '../../utils/projectUi';
import { COLLAPSED_HEIGHT } from './useCollapsibleHeader';

interface ProjectDetailHeaderProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  daysLeft: number;
  budgetPct: number;
  opi: string;
  loading: boolean;
  collapse: number;
  isCollapsed: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onHeaderTap: () => void;
  onToggleCompact: () => void;
}

export default function ProjectDetailHeader({
  project,
  health,
  daysLeft,
  budgetPct,
  opi,
  loading,
  collapse,
  isCollapsed,
  onClose,
  onRefresh,
  onHeaderTap,
  onToggleCompact,
}: ProjectDetailHeaderProps) {
  const expanded = 1 - collapse;

  return (
    <div
      className={`shrink-0 sticky top-0 z-50 transition-shadow duration-200 ${
        isCollapsed ? 'shadow-lg glass' : ''
      }`}
      onClick={isCollapsed ? onHeaderTap : undefined}
      role={isCollapsed ? 'button' : undefined}
    >
      <motion.div
        className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white overflow-hidden"
        animate={{ minHeight: isCollapsed ? COLLAPSED_HEIGHT : undefined }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Compact bar — mobile & desktop */}
        <motion.div
          className="flex items-center gap-2 px-3 py-2.5 md:px-4"
          initial={false}
          animate={{
            opacity: isCollapsed ? 1 : 0,
            height: isCollapsed ? 'auto' : 0,
            marginBottom: isCollapsed ? 0 : -8,
          }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: isCollapsed ? 'auto' : 'none', overflow: 'hidden' }}
        >
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1.5 hover:bg-white/20 rounded-lg shrink-0 lg:hidden"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm md:text-base truncate tracking-tight">{project.name}</div>
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-indigo-100 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-white/20">{STATUS_LABEL[project.status]}</span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/20">{health.label}</span>
              <span>💰 {Math.round(budgetPct)}%</span>
              <span>📅 {daysLeft > 0 ? `${daysLeft}d` : 'Lewat'}</span>
              <span className="hidden md:inline font-mono">OPI {opi}</span>
            </div>
          </div>
          <div className="w-16 md:w-24 shrink-0">
            <div className="h-1.5 md:h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-right mt-0.5">{project.progress_percentage.toFixed(0)}%</div>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onToggleCompact(); }}
            className="p-1.5 hover:bg-white/20 rounded-lg shrink-0"
            aria-label="Perbesar header"
            title="Perbesar header"
          >
            <ChevronsDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRefresh(); }}
            className="p-1.5 hover:bg-white/20 rounded-lg shrink-0 hidden sm:flex"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="p-1.5 hover:bg-white/20 rounded-lg shrink-0 hidden lg:flex"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Expanded header */}
        <motion.div
          className="px-4 py-4 md:px-6 md:py-5"
          initial={false}
          animate={{
            opacity: expanded,
            maxHeight: expanded > 0.05 ? 360 : 0,
            paddingTop: expanded > 0.05 ? undefined : 0,
            paddingBottom: expanded > 0.05 ? undefined : 0,
          }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{ overflow: 'hidden', pointerEvents: expanded > 0.05 ? 'auto' : 'none' }}
        >
          <div className="flex items-start justify-between gap-3 mb-3 md:mb-4">
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
              <button
                type="button"
                onClick={onToggleCompact}
                className="p-2 hover:bg-white/20 rounded-xl"
                aria-label="Ringkas header"
                title="Ringkas header"
              >
                <ChevronsUp className="w-5 h-5" />
              </button>
              <button type="button" onClick={onRefresh} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Refresh">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Tutup">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3 md:mb-4 lg:hidden">
            <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 bg-white/10 rounded-2xl p-3 md:p-4 border border-white/10">
            {[
              { label: 'Progress', value: `${project.progress_percentage.toFixed(0)}%` },
              { label: 'Budget', value: `${Math.round(budgetPct)}%` },
              { label: 'Sisa Hari', value: daysLeft > 0 ? `${daysLeft}d` : 'Lewat' },
              { label: 'OPI', value: opi },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className="text-[10px] md:text-xs text-indigo-100 mb-0.5 uppercase tracking-wider">{m.label}</div>
                <div className="text-lg md:text-xl font-black font-mono">{m.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
