import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Bell, History, FolderPlus, Wallet, Sparkles, BarChart3, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const QUICK_ACTIONS = [
  { id: 'project', label: 'Proyek', icon: FolderPlus, color: 'text-violet-600', bg: 'bg-violet-50', path: '/app?tab=projects' },
  { id: 'kas', label: 'Kas', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/app/finance-v2/kasbank' },
  { id: 'rap', label: 'RAP', icon: Sparkles, color: 'text-amber-700', bg: 'bg-amber-50', path: null as string | null },
  { id: 'progress', label: 'Progress', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', path: null },
];

type Props = {
  projectId?: string | null;
  onOpenRap?: () => void;
  onOpenProgress?: () => void;
};

export default function RightPanel({ projectId, onOpenRap, onOpenProgress }: Props) {
  const navigate = useNavigate();
  const { notifications, projects, setCommandModalOpen } = useAppStore();

  const recentActivity = useMemo(() => {
    return projects
      .filter(p => p.spent_amount > 0 || p.total_received > 0)
      .slice(0, 4)
      .map(p => ({
        id: p.id,
        text: p.name,
        sub: p.spent_amount > 0 ? `Realisasi ${Math.round(p.spent_amount / 1_000_000)}jt` : 'Dana masuk',
      }));
  }, [projects]);

  const alerts = useMemo(() => {
    const overBudget = projects.filter(
      p => p.total_budget_planned > 0 && p.spent_amount / p.total_budget_planned > 0.9,
    );
    const items = notifications.slice(0, 2).map(n => ({
      title: n.title,
      desc: n.message,
      type: 'warning' as const,
    }));
    for (const p of overBudget.slice(0, 1)) {
      items.push({
        title: 'Over Budget',
        desc: `${p.name} mendekati/melewati RAP`,
        type: 'warning',
      });
    }
    return items.slice(0, 3);
  }, [notifications, projects]);

  const handleAction = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.id === 'rap' && projectId) {
      onOpenRap?.();
      return;
    }
    if (action.id === 'progress' && projectId) {
      onOpenProgress?.();
      return;
    }
    if (action.path) navigate(action.path);
    else setCommandModalOpen(true);
  };

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 border-l border-slate-100 bg-white overflow-y-auto">
      <section className="p-4 border-b border-slate-50">
        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-3">
          <Zap className="w-3.5 h-3.5" /> Aksi Cepat
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => handleAction(a)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all text-center"
            >
              <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center`}>
                <a.icon className={`w-4 h-4 ${a.color}`} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="p-4 border-b border-slate-50">
        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-3">
          <Bell className="w-3.5 h-3.5" /> Notifikasi
        </h3>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400">Tidak ada notifikasi.</p>
          ) : alerts.map((n, i) => (
            <div key={i} className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-900">{n.title}</div>
                <div className="text-amber-700 mt-0.5">{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-3">
          <History className="w-3.5 h-3.5" /> Aktivitas Terakhir
        </h3>
        <div className="space-y-2">
          {recentActivity.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(`/app/projects/${a.id}`)}
              className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs"
            >
              <div className="font-semibold text-slate-800">{a.text}</div>
              <div className="text-slate-400 mt-0.5">{a.sub}</div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
