import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Calendar, MapPin, RefreshCw, X, ChevronsUp, ChevronsDown, Info,
} from 'lucide-react';
import type { Project } from '../../store/appStore';
import { formatRupiah, HEALTH_CONFIG, STATUS_LABEL, formatDateId, daysUntil } from '../../utils/projectUi';
import { EVM_METRICS } from '../../utils/evmMetrics';
import { COLLAPSED_HEIGHT } from './useCollapsibleHeader';

interface ProjectDetailHeaderProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  daysLeft: number;
  budgetPct: number;
  opi: string;
  received?: number;
  surplus?: number;
  loading: boolean;
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
  received = 0,
  surplus = 0,
  loading,
  isCollapsed,
  onClose,
  onRefresh,
  onHeaderTap,
  onToggleCompact,
}: ProjectDetailHeaderProps) {
  const [opiHelpOpen, setOpiHelpOpen] = useState(false);
  const opiHelpRef = useRef<HTMLDivElement>(null);
  const opiMetric = EVM_METRICS.OPI;

  useEffect(() => {
    if (!opiHelpOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (opiHelpRef.current && !opiHelpRef.current.contains(e.target as Node)) setOpiHelpOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [opiHelpOpen]);

  return (
    <div
      className={`shrink-0 sticky top-0 z-50 transition-shadow duration-200 ${
        isCollapsed ? 'shadow-lg glass' : ''
      }`}
      onClick={isCollapsed ? onHeaderTap : undefined}
      role={isCollapsed ? 'button' : undefined}
    >
      <div
        className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white overflow-hidden transition-[min-height] duration-200 ease-out"
        style={{ minHeight: isCollapsed ? COLLAPSED_HEIGHT : undefined }}
      >
        {isCollapsed ? (
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-4">
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
                <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, project.progress_percentage)}%` }} />
              </div>
              <div className="text-[10px] font-mono text-right mt-0.5">{project.progress_percentage.toFixed(0)}%</div>
            </div>
            <button type="button" onClick={e => { e.stopPropagation(); onToggleCompact(); }} className="p-1.5 hover:bg-white/20 rounded-lg shrink-0" aria-label="Perbesar header">
              <ChevronsDown className="w-5 h-5" />
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); onRefresh(); }} className="p-1.5 hover:bg-white/20 rounded-lg shrink-0 hidden sm:flex" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={e => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-white/20 rounded-lg shrink-0 hidden lg:flex" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 md:px-6 md:py-5">
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
                <button type="button" onClick={onToggleCompact} className="p-2 hover:bg-white/20 rounded-xl" aria-label="Ringkas header">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 bg-white/10 rounded-2xl p-3 md:p-4 border border-white/10">
              {[
                { label: 'Progress', value: `${project.progress_percentage.toFixed(0)}%` },
                { label: 'Budget', value: `${Math.round(budgetPct)}%` },
                { label: 'Diterima', value: formatRupiah(received) },
                { label: 'Saldo+', value: formatRupiah(surplus) },
                { label: 'Sisa Hari', value: daysLeft > 0 ? `${daysLeft}d` : 'Lewat' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-[10px] md:text-xs text-indigo-100 mb-0.5 uppercase tracking-wider">{m.label}</div>
                  <div className="text-lg md:text-xl font-black font-mono">{m.value}</div>
                </div>
              ))}
              <div ref={opiHelpRef} className="relative text-center">
                <div className="text-[10px] md:text-xs text-indigo-100 mb-0.5 uppercase tracking-wider flex items-center justify-center gap-0.5">
                  OPI
                  <button
                    type="button"
                    onClick={() => setOpiHelpOpen(v => !v)}
                    className="p-0.5 rounded hover:bg-white/20"
                    aria-label="Info OPI"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-lg md:text-xl font-black font-mono">{opi}</div>
                {opiHelpOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-56 p-3 bg-slate-900 text-white text-left rounded-xl shadow-xl text-xs leading-relaxed">
                    <div className="font-bold text-sm mb-1">{opiMetric.title}</div>
                    <p className="text-slate-200 mb-2">{opiMetric.description}</p>
                    <p className="font-mono text-indigo-200 text-[10px] mb-1">{opiMetric.formula}</p>
                    <p className="text-slate-400 text-[10px]">Sumber: {opiMetric.source}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
