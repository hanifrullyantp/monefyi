import { useState } from 'react';
import {
  ArrowLeft, Bell, Calendar, Download, MapPin, Plus, RefreshCw,
  Settings, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { Project } from '../../../store/appStore';
import { formatRupiah, HEALTH_CONFIG, STATUS_LABEL, formatDateId } from '../../../utils/projectUi';

interface KpiMetric {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  spark: number[];
  alert?: boolean;
}

interface ProjectCommandHeaderProps {
  project: Project;
  health: (typeof HEALTH_CONFIG)[keyof typeof HEALTH_CONFIG];
  daysLeft: number;
  budgetPct: number;
  cpi: number;
  spi: number;
  received: number;
  surplus: number;
  opi: string;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onEdit?: () => void;
  onAddCost: () => void;
  onUpdateProgress: () => void;
  onOpenReport: () => void;
  canManage?: boolean;
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={24}>
      <LineChart data={pts}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProjectCommandHeader({
  project,
  health,
  daysLeft,
  budgetPct,
  cpi,
  spi,
  received,
  surplus,
  opi,
  loading,
  onClose,
  onRefresh,
  onEdit,
  onAddCost,
  onUpdateProgress,
  onOpenReport,
  canManage,
}: ProjectCommandHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const progress = project.progress_percentage;
  const budgetTotal = project.total_budget_planned;

  const kpis: KpiMetric[] = [
    {
      label: 'Progress',
      value: `${Math.round(progress)}%`,
      sub: `${Math.round(progress / 10)}●`.padEnd(7, '○').slice(0, 7),
      spark: [progress * 0.6, progress * 0.75, progress * 0.9, progress],
      trendUp: progress >= 50,
    },
    {
      label: 'Budget',
      value: `${Math.round(budgetPct)}%`,
      sub: budgetPct > 90 ? 'At Risk' : undefined,
      spark: [budgetPct * 0.7, budgetPct * 0.85, budgetPct],
      trendUp: budgetPct <= progress + 10,
      alert: budgetPct > 90,
    },
    {
      label: 'CPI',
      value: cpi.toFixed(2),
      trend: cpi >= 1 ? '▲ Hemat' : '▼ Mahal',
      trendUp: cpi >= 1,
      spark: [cpi * 0.9, cpi * 0.95, cpi],
    },
    {
      label: 'SPI',
      value: spi.toFixed(2),
      trend: spi >= 1 ? '▲ Cepat' : '▼ Lambat',
      trendUp: spi >= 1,
      spark: [spi * 0.85, spi * 0.92, spi],
    },
    {
      label: 'Diterima',
      value: formatRupiah(received),
      sub: budgetTotal ? `dari ${formatRupiah(budgetTotal)}` : undefined,
      spark: [received / 1e7, received / 1e7],
      trendUp: true,
    },
    {
      label: 'Saldo+',
      value: formatRupiah(surplus),
      trend: surplus >= 0 ? '▲ Plus' : '⚠ Minus',
      trendUp: surplus >= 0,
      spark: [surplus / 1e7],
      alert: surplus < 0,
    },
  ];

  const startMs = new Date(project.start_date).getTime();
  const endMs = new Date(project.end_date).getTime();
  const nowMs = Date.now();
  const timelinePct = endMs > startMs
    ? Math.min(100, Math.max(0, ((nowMs - startMs) / (endMs - startMs)) * 100))
    : 50;
  const progressPct = Math.min(100, progress);

  return (
    <div className="shrink-0 sticky top-0 z-50 bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white shadow-lg">
      {/* Row 1: Identity */}
      <div className="flex items-center gap-2 px-3 md:px-5 py-2.5 border-b border-white/10">
        <button type="button" onClick={onClose} className="p-2 hover:bg-white/15 rounded-xl shrink-0" aria-label="Kembali">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-md">{project.code}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${health.bg} ${health.color} border border-white/20`}>
              {health.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 uppercase">{STATUS_LABEL[project.status]}</span>
            {project.client_name && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 hidden sm:inline">{project.client_name}</span>
            )}
          </div>
          <h1 className="text-base md:text-xl font-black truncate mt-0.5">{project.name}</h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setNotifOpen(v => !v)} className="relative p-2 hover:bg-white/15 rounded-xl" aria-label="Notifikasi">
            <Bell className="w-5 h-5" />
            {(daysLeft < 0 || surplus < 0) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
            )}
          </button>
          {canManage && onEdit && (
            <button type="button" onClick={onEdit} className="p-2 hover:bg-white/15 rounded-xl hidden sm:flex" aria-label="Setting">
              <Settings className="w-5 h-5" />
            </button>
          )}
          <button type="button" onClick={onRefresh} className="p-2 hover:bg-white/15 rounded-xl" aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/15 rounded-xl hidden lg:flex" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {notifOpen && (
        <div className="px-4 py-2 bg-rose-900/40 border-b border-white/10 text-xs space-y-1">
          {daysLeft < 0 && <p>⚠️ Proyek lewat deadline {Math.abs(daysLeft)} hari</p>}
          {surplus < 0 && <p>💰 Saldo minus {formatRupiah(Math.abs(surplus))}</p>}
          {budgetPct > progress + 15 && <p>📊 Budget burn lebih cepat dari progress</p>}
          {daysLeft >= 0 && surplus >= 0 && budgetPct <= progress + 15 && (
            <p className="text-emerald-100">Tidak ada alert kritis saat ini.</p>
          )}
        </div>
      )}

      {/* Row 2: KPI strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 px-3 md:px-5 py-2">
        {kpis.map(k => (
          <div key={k.label} className="bg-white/10 rounded-xl px-2 py-2 border border-white/10 min-w-0">
            <div className="text-[9px] uppercase tracking-wider text-emerald-100/80 truncate">{k.label}</div>
            <div className={`text-sm md:text-base font-black font-mono truncate ${k.alert ? 'text-rose-200' : ''}`}>
              {k.value}
            </div>
            {k.trend && (
              <div className={`text-[9px] font-bold flex items-center gap-0.5 ${k.trendUp ? 'text-emerald-200' : 'text-amber-200'}`}>
                {k.trendUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {k.trend}
              </div>
            )}
            {k.sub && !k.trend && <div className="text-[9px] text-emerald-100/70 truncate">{k.sub}</div>}
            <div className="opacity-60 mt-0.5 hidden sm:block">
              <MiniSpark data={k.spark} color={k.trendUp === false ? '#fca5a5' : '#a7f3d0'} />
            </div>
          </div>
        ))}
      </div>

      {/* Row 3: Timeline bar */}
      <div className="px-3 md:px-5 pb-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-emerald-100 mb-1.5">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateId(project.start_date)} – {formatDateId(project.end_date)}
          </span>
          {project.location && (
            <span className="flex items-center gap-1 hidden sm:flex"><MapPin className="w-3 h-3" />{project.location}</span>
          )}
          <span className={daysLeft < 0 ? 'text-rose-200 font-bold' : daysLeft <= 3 ? 'text-amber-200 font-bold' : ''}>
            Sisa: {daysLeft < 0 ? `⚠ Lewat ${Math.abs(daysLeft)} hari` : `${daysLeft} hari`}
          </span>
          <span className="hidden md:inline font-mono">OPI {opi}</span>
        </div>
        <div className="relative h-2 bg-white/15 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-300/50 rounded-full" style={{ width: `${timelinePct}%` }} />
          <div className="absolute inset-y-0 left-0 bg-white rounded-full opacity-90" style={{ width: `${progressPct}%` }} />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
            style={{ left: `${timelinePct}%` }}
            title="Hari ini"
          />
        </div>
      </div>

      {/* Row 4: Quick actions */}
      <div className="flex flex-wrap gap-2 px-3 md:px-5 pb-3">
        {canManage && (
          <button type="button" onClick={onAddCost} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-800 rounded-lg text-xs font-black hover:bg-emerald-50">
            <Plus className="w-3.5 h-3.5" /> Tambah Biaya
          </button>
        )}
        {canManage && (
          <button type="button" onClick={onUpdateProgress} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 rounded-lg text-xs font-bold hover:bg-white/25">
            Update Progress
          </button>
        )}
        <button type="button" onClick={onOpenReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 rounded-lg text-xs font-bold hover:bg-white/25">
          Lihat Laporan
        </button>
        <button type="button" onClick={onOpenReport} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 rounded-lg text-xs font-bold hover:bg-white/25 hidden sm:flex">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>
    </div>
  );
}
